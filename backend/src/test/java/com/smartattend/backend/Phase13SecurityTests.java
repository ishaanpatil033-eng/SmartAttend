package com.smartattend.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartattend.backend.dtos.ChangePasswordRequest;
import com.smartattend.backend.dtos.LoginRequest;
import com.smartattend.backend.dtos.QrScanRequest;
import com.smartattend.backend.dtos.QrTokenResponse;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.SecurityAuditLog;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.AttendanceQrTokenRepository;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.DeviceAttendanceBindingRepository;
import com.smartattend.backend.repositories.SecurityAuditLogRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
import com.smartattend.backend.services.AttendanceService;
import com.smartattend.backend.services.UserAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class Phase13SecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountService userAccountService;

    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private AttendanceQrTokenRepository qrTokenRepository;

    @Autowired
    private DeviceAttendanceBindingRepository deviceBindingRepository;

    @Autowired
    private SecurityAuditLogRepository auditLogRepository;

    private static final double CLASSROOM_LAT = 19.0760;
    private static final double CLASSROOM_LON = 72.8777;

    @BeforeEach
    void setUp() {
        attendanceRepository.deleteAll();
        deviceBindingRepository.deleteAll();
        qrTokenRepository.deleteAll();
        auditLogRepository.deleteAll();

        // Ensure baseline course CS101 exists
        if (!courseRepository.findByCourseId("CS101").isPresent()) {
            courseRepository.save(new Course("CS101", "Computer Science 101"));
        }
        if (!courseRepository.findByCourseId("MATH201").isPresent()) {
            courseRepository.save(new Course("MATH201", "Calculus II"));
        }

        // Ensure baseline students and accounts exist
        seedUserIfNotExists("STU101", "Student@123", "ROLE_STUDENT", "STU101", "Aarav Sharma", "stu101@smartattend.edu");
        seedUserIfNotExists("STU102", "Student@123", "ROLE_STUDENT", "STU102", "Ananya Patel", "stu102@smartattend.edu");
        seedUserIfNotExists("teacher", "Teacher@123", "ROLE_TEACHER", null, "Prof. Sharma", "teacher@smartattend.edu");
        seedUserIfNotExists("admin", "Admin@123", "ROLE_ADMIN", null, "Administrator", "admin@smartattend.edu");
        seedUserIfNotExists("hod", "Hod@123", "ROLE_HOD", null, "Head of Dept", "hod@smartattend.edu");
    }

    private void seedUserIfNotExists(String username, String rawPassword, String role, String studentId, String name, String email) {
        if (!userAccountRepository.findByUsername(username).isPresent()) {
            userAccountService.registerUser(username, rawPassword, role, studentId, name, email);
        }
        if (studentId != null && !studentRepository.findByStudentId(studentId).isPresent()) {
            studentRepository.save(new Student(studentId, name, email, "FE", 1, "E1"));
        }
    }

    private MockHttpSession loginAs(String username, String password) throws Exception {
        LoginRequest req = new LoginRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andReturn();

        return (MockHttpSession) result.getRequest().getSession();
    }

    // =========================================================================
    // 1. AUTHENTICATION TESTS
    // =========================================================================

    @Test
    @DisplayName("1. Valid student login returns 200, role, safe profile, and active session")
    void testValidStudentLogin() throws Exception {
        MockHttpSession session = loginAs("STU101", "Student@123");
        assertNotNull(session);

        // Call /api/auth/me with the session
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("STU101"))
                .andExpect(jsonPath("$.role").value("ROLE_STUDENT"))
                .andExpect(jsonPath("$.studentId").value("STU101"))
                .andExpect(jsonPath("$.fullName").value("Aarav Sharma"));
    }

    @Test
    @DisplayName("2. Invalid login returns 401 and logs security event")
    void testInvalidLogin() throws Exception {
        LoginRequest req = new LoginRequest("STU101", "WrongPassword!");
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid username or password."));

        List<SecurityAuditLog> logs = auditLogRepository.findAll();
        assertTrue(logs.stream().anyMatch(l -> "LOGIN_FAILURE".equals(l.getEventType())));
    }

    @Test
    @DisplayName("3. Logout invalidates server session")
    void testLogout() throws Exception {
        MockHttpSession session = loginAs("STU101", "Student@123");

        mockMvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Subsequent /api/auth/me should return 401
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 2. ROLE AUTHORIZATION & STUDENT OWNERSHIP TESTS
    // =========================================================================

    @Test
    @DisplayName("4. Unauthenticated attendance scan is rejected with 401 Unauthorized")
    void testUnauthenticatedAttendanceRejected() throws Exception {
        QrScanRequest scanReq = new QrScanRequest("STU101", "CS101", "tok-123", "SES-1", CLASSROOM_LAT, CLASSROOM_LON, 10.0, "dev-1");
        mockMvc.perform(post("/api/attendance/qr/scan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(scanReq)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("5. Student attempting to access Admin API is rejected with 403 Forbidden")
    void testStudentForbiddenFromAdminApi() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");

        mockMvc.perform(get("/api/attendance/admin/overview").session(studentSession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. Student attempting to access Teacher API is rejected with 403 Forbidden")
    void testStudentForbiddenFromTeacherApi() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");

        mockMvc.perform(post("/api/attendance/qr/generate?courseId=CS101").session(studentSession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("7. Student STU101 requesting Student STU102's attendance is rejected with 403 Forbidden")
    void testStudentOwnershipAttendanceForbidden() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");

        mockMvc.perform(get("/api/attendance/student/STU102").session(studentSession))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("8. Student STU101 requesting Student STU102's private profile is rejected with 403 Forbidden")
    void testStudentOwnershipProfileForbidden() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");

        mockMvc.perform(get("/api/students/search/STU102").session(studentSession))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 3. ANTI-TAMPERING & DYNAMIC QR ATTENDANCE TESTS
    // =========================================================================

    @Test
    @DisplayName("9. Client studentId tampering: STU101 submitting STU102 is rejected and STU102 receives NO attendance")
    void testClientIdTamperingRejected() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");
        QrTokenResponse token = attendanceService.generateDynamicQrToken("CS101", "SES_CS101_1");

        QrScanRequest tamperReq = new QrScanRequest(
                "STU102", // Tampered student ID
                "CS101",
                token.getToken(),
                token.getSessionCode(),
                CLASSROOM_LAT,
                CLASSROOM_LON,
                10.0,
                "device-fingerprint-001"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(tamperReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Student ID tampering detected")));

        // Verify STU102 was NOT given attendance
        Student stu102 = studentRepository.findByStudentId("STU102").get();
        assertEquals(0, attendanceRepository.findByStudent(stu102).size());
    }

    @Test
    @DisplayName("10. Valid attendance scan inside geofence with valid device succeeds")
    void testValidAttendanceScan() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");
        QrTokenResponse token = attendanceService.generateDynamicQrToken("CS101", "SES_CS101_VALID");

        QrScanRequest validReq = new QrScanRequest(
                "STU101",
                "CS101",
                token.getToken(),
                token.getSessionCode(),
                CLASSROOM_LAT,
                CLASSROOM_LON,
                15.0,
                "device-fingerprint-101"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));

        Student stu101 = studentRepository.findByStudentId("STU101").get();
        List<Attendance> records = attendanceRepository.findByStudent(stu101);
        assertEquals(1, records.size());
        assertEquals("PRESENT", records.get(0).getAttendanceStatus());
    }

    @Test
    @DisplayName("11. Expired QR code is rejected")
    void testExpiredQrRejected() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");
        QrTokenResponse token = attendanceService.generateDynamicQrToken("CS101", "SES_CS101_EXP");

        // Manually backdate the token to simulate 5-second expiry
        qrTokenRepository.findByToken(token.getToken()).ifPresent(t -> {
            t.setExpiresAt(Instant.now().minusSeconds(10));
            qrTokenRepository.save(t);
        });

        QrScanRequest req = new QrScanRequest(
                "STU101",
                "CS101",
                token.getToken(),
                token.getSessionCode(),
                CLASSROOM_LAT,
                CLASSROOM_LON,
                10.0,
                "device-fingerprint-101"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("expired")));
    }

    @Test
    @DisplayName("12. Already consumed QR code is rejected on second scan")
    void testAlreadyConsumedQrRejected() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");
        QrTokenResponse token = attendanceService.generateDynamicQrToken("CS101", "SES_CS101_CONS");

        QrScanRequest req1 = new QrScanRequest(
                "STU101",
                "CS101",
                token.getToken(),
                token.getSessionCode(),
                CLASSROOM_LAT,
                CLASSROOM_LON,
                10.0,
                "device-fingerprint-101"
        );

        // First scan succeeds
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        // Second scan using identical consumed token must fail
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("13. Wrong course QR token is rejected")
    void testWrongCourseQrRejected() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");
        QrTokenResponse token = attendanceService.generateDynamicQrToken("MATH201", "SES_MATH_1");

        QrScanRequest req = new QrScanRequest(
                "STU101",
                "CS101", // Wrong course ID sent
                token.getToken(),
                token.getSessionCode(),
                CLASSROOM_LAT,
                CLASSROOM_LON,
                10.0,
                "device-fingerprint-101"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("not 'CS101'")));
    }

    // =========================================================================
    // 4. GPS & HAVERSINE GEOFENCING TESTS
    // =========================================================================

    @Test
    @DisplayName("14. GPS location outside geofence is rejected")
    void testOutsideGeofenceRejected() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");
        QrTokenResponse token = attendanceService.generateDynamicQrToken("CS101", "SES_CS101_GEO");

        // Coordinates ~5 km away in Mumbai
        double remoteLat = 19.1200;
        double remoteLon = 72.8500;

        QrScanRequest req = new QrScanRequest(
                "STU101",
                "CS101",
                token.getToken(),
                token.getSessionCode(),
                remoteLat,
                remoteLon,
                10.0,
                "device-fingerprint-101"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("outside the allowed classroom area")));
    }

    @Test
    @DisplayName("15. GPS accuracy too poor (> 50m) is rejected")
    void testPoorGpsAccuracyRejected() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");
        QrTokenResponse token = attendanceService.generateDynamicQrToken("CS101", "SES_CS101_ACC");

        QrScanRequest req = new QrScanRequest(
                "STU101",
                "CS101",
                token.getToken(),
                token.getSessionCode(),
                CLASSROOM_LAT,
                CLASSROOM_LON,
                120.0, // Accuracy 120m > 50m threshold
                "device-fingerprint-101"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("GPS accuracy is insufficient")));
    }

    @Test
    @DisplayName("16. Missing GPS location is rejected")
    void testMissingGpsRejected() throws Exception {
        MockHttpSession studentSession = loginAs("STU101", "Student@123");
        QrTokenResponse token = attendanceService.generateDynamicQrToken("CS101", "SES_CS101_MISS");

        QrScanRequest req = new QrScanRequest(
                "STU101",
                "CS101",
                token.getToken(),
                token.getSessionCode(),
                null,
                null,
                null,
                "device-fingerprint-101"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Location permission required")));
    }

    // =========================================================================
    // 5. ONE DEVICE — ONE STUDENT — ONE LECTURE TESTS
    // =========================================================================

    @Test
    @DisplayName("17. One device binds to Student A; same device marking Student B in SAME session is rejected")
    void testOneDeviceOneStudentSameLecture() throws Exception {
        String sharedDevice = "hardware-fingerprint-galaxy-s22";
        String sessionCode = "LEC_CS101_SESSION_101";

        // Step 1: Student A (STU101) scans from Device D1 -> SUCCESS
        MockHttpSession sessionA = loginAs("STU101", "Student@123");
        QrTokenResponse tokenA = attendanceService.generateDynamicQrToken("CS101", sessionCode);

        QrScanRequest reqA = new QrScanRequest(
                "STU101",
                "CS101",
                tokenA.getToken(),
                sessionCode,
                CLASSROOM_LAT,
                CLASSROOM_LON,
                10.0,
                sharedDevice
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(sessionA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqA)))
                .andExpect(status().isCreated());

        // Step 2: Student A logs out
        mockMvc.perform(post("/api/auth/logout").session(sessionA));

        // Step 3: Student B (STU102) logs in on the SAME device
        MockHttpSession sessionB = loginAs("STU102", "Student@123");
        QrTokenResponse tokenB = attendanceService.generateDynamicQrToken("CS101", sessionCode);

        QrScanRequest reqB = new QrScanRequest(
                "STU102",
                "CS101",
                tokenB.getToken(),
                sessionCode,
                CLASSROOM_LAT,
                CLASSROOM_LON,
                10.0,
                sharedDevice // Identical device used!
        );

        // Step 4: Marking attendance for STU102 with the same device in the same session MUST fail
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(sessionB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reqB)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Proxy attendance rejected: This device has already marked attendance for another student (STU101)")));
    }

    @Test
    @DisplayName("18. Same device is allowed for Student B in a NEW lecture session")
    void testSameDeviceAllowedInNewLecture() throws Exception {
        String sharedDevice = "hardware-fingerprint-galaxy-s22";

        // Session 1: STU101 marks attendance with Device D1
        MockHttpSession sessionA = loginAs("STU101", "Student@123");
        QrTokenResponse token1 = attendanceService.generateDynamicQrToken("CS101", "LEC_CS101_SES_1");

        QrScanRequest reqA = new QrScanRequest(
                "STU101",
                "CS101",
                token1.getToken(),
                "LEC_CS101_SES_1",
                CLASSROOM_LAT,
                CLASSROOM_LON,
                10.0,
                sharedDevice
        );
        mockMvc.perform(post("/api/attendance/qr/scan").session(sessionA).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(reqA)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/logout").session(sessionA));

        // Session 2: STU102 marks attendance in a DIFFERENT course/session with Device D1 -> ALLOWED
        MockHttpSession sessionB = loginAs("STU102", "Student@123");
        QrTokenResponse token2 = attendanceService.generateDynamicQrToken("MATH201", "LEC_MATH201_SES_2");

        QrScanRequest reqB = new QrScanRequest(
                "STU102",
                "MATH201",
                token2.getToken(),
                "LEC_MATH201_SES_2",
                CLASSROOM_LAT,
                CLASSROOM_LON,
                10.0,
                sharedDevice
        );
        mockMvc.perform(post("/api/attendance/qr/scan").session(sessionB).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(reqB)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    // =========================================================================
    // 6. CONCURRENCY & ATOMIC CONSUMPTION TEST
    // =========================================================================

    @Test
    @DisplayName("19. Atomic QR Consumption: Two simultaneous requests for same token -> exactly one succeeds")
    void testAtomicQrConsumptionConcurrency() throws Exception {
        QrTokenResponse token = attendanceService.generateDynamicQrToken("CS101", "CONCURRENT_SES_1");
        int numberOfThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 1; i <= numberOfThreads; i++) {
            final String studentId = "STU10" + i;
            final String deviceId = "dev-" + i;
            executor.submit(() -> {
                try {
                    latch.await(); // wait for simultaneous release
                    QrScanRequest req = new QrScanRequest(studentId, "CS101", token.getToken(), "CONCURRENT_SES_1", CLASSROOM_LAT, CLASSROOM_LON, 10.0, deviceId);
                    attendanceService.recordAttendanceViaQr(req, studentId, "127.0.0.1", "Bench");
                    successCount.incrementAndGet();
                } catch (IllegalStateException e) {
                    conflictCount.incrementAndGet();
                } catch (Exception e) {
                    // unexpected
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown(); // trigger both threads simultaneously
        doneLatch.await();
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one concurrent scan must succeed");
        assertEquals(1, conflictCount.get(), "The other concurrent scan must be rejected due to atomic consumption");
    }

    // =========================================================================
    // 7. PASSWORD CHANGE TESTS
    // =========================================================================

    @Test
    @DisplayName("20. Real password change requires authentication and validates BCrypt")
    void testPasswordChange() throws Exception {
        MockHttpSession session = loginAs("STU101", "Student@123");

        // Wrong current password -> 400
        ChangePasswordRequest badReq = new ChangePasswordRequest("WrongOldPass", "NewPassword@123");
        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Current password is incorrect."));

        // Valid current password -> 200
        ChangePasswordRequest goodReq = new ChangePasswordRequest("Student@123", "NewSecurePassword@123");
        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(goodReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Logout and verify new password works
        mockMvc.perform(post("/api/auth/logout").session(session));
        loginAs("STU101", "NewSecurePassword@123");
    }
}
