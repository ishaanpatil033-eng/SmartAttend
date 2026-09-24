package com.smartattend.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartattend.backend.dtos.LoginRequest;
import com.smartattend.backend.dtos.QrScanRequest;
import com.smartattend.backend.entities.*;
import com.smartattend.backend.repositories.*;
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
import java.time.LocalDate;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class DynamicClassroomLocationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountService userAccountService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LectureSessionRepository lectureSessionRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private AttendanceQrTokenRepository qrTokenRepository;

    @Autowired
    private DeviceAttendanceBindingRepository deviceBindingRepository;

    @Autowired
    private AttendanceService attendanceService;

    @BeforeEach
    public void setupTestData() {
        attendanceRepository.deleteAll();
        deviceBindingRepository.deleteAll();
        qrTokenRepository.deleteAll();
        lectureSessionRepository.deleteAll();
        courseRepository.deleteAll();
        studentRepository.deleteAll();
        userAccountRepository.deleteAll();

        userAccountService.initDefaultUsers();

        // Additional faculty for multi-faculty ownership tests
        seedUserIfNotExists("other_faculty", "Faculty@123", "ROLE_FACULTY", null, "Other Faculty", "other@smartattend.edu");
    }

    private void seedUserIfNotExists(String username, String rawPassword, String role, String studentId, String name, String email) {
        if (userAccountRepository.findByUsername(username).isEmpty()) {
            userAccountService.registerUser(username, rawPassword, role, studentId, name, email);
        }
    }

    private MockHttpSession loginAs(String username, String password) throws Exception {
        LoginRequest req = new LoginRequest(username, password);
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) res.getRequest().getSession(false);
    }

    private LectureSession createTestSession(String courseId, String facultyId) throws Exception {
        MockHttpSession sessionAuth = loginAs(facultyId, "123456".equals(facultyId) ? "123456@edu" : "Faculty@123");
        LectureSession session = new LectureSession();
        session.setCourseId(courseId);
        session.setCourseName("Java");
        session.setLectureType("THEORY");
        session.setDivision("A");
        session.setBatch("ALL");
        session.setSessionDate(LocalDate.now());
        session.setSessionTime("10:00 AM");

        MvcResult res = mockMvc.perform(post("/api/classes")
                .session(sessionAuth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(session)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readValue(res.getResponse().getContentAsString(), LectureSession.class);
    }

    @Test
    @DisplayName("1. Faculty captures location & launches Dynamic QR successfully")
    public void testFacultyLaunchesQrWithLocation_Success() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode())
                .param("latitude", "19.0760")
                .param("longitude", "72.8777")
                .param("accuracy", "15.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiresInSeconds").value(5));

        LectureSession updated = lectureSessionRepository.findBySessionCode(session.getSessionCode()).orElseThrow();
        assertEquals(19.0760, updated.getClassroomLatitude(), 0.0001);
        assertEquals(72.8777, updated.getClassroomLongitude(), 0.0001);
        assertEquals(15.0, updated.getClassroomAccuracy(), 0.1);
    }

    @Test
    @DisplayName("2. Setting location via explicit POST /api/classes/{sessionCode}/location endpoint")
    public void testExplicitLocationEndpoint_Success() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        Map<String, Object> locationPayload = Map.of(
                "latitude", 12.9716,
                "longitude", 77.5946,
                "accuracy", 20.0
        );

        mockMvc.perform(post("/api/classes/" + session.getSessionCode() + "/location")
                .session(facultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(locationPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.session.classroomLatitude").value(12.9716))
                .andExpect(jsonPath("$.session.classroomLongitude").value(77.5946))
                .andExpect(jsonPath("$.session.classroomAccuracy").value(20.0));

        LectureSession reloaded = lectureSessionRepository.findBySessionCode(session.getSessionCode()).orElseThrow();
        assertEquals(12.9716, reloaded.getClassroomLatitude(), 0.0001);
        assertEquals(77.5946, reloaded.getClassroomLongitude(), 0.0001);
    }

    @Test
    @DisplayName("3. Faculty location rejected when GPS accuracy exceeds 50m requirement")
    public void testFacultyLocationPoorAccuracy_Rejected() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode())
                .param("latitude", "19.0760")
                .param("longitude", "72.8777")
                .param("accuracy", "65.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("GPS accuracy is insufficient (65m). Maximum allowed is 50m.")));

        // Session location remains unassigned
        LectureSession unchanged = lectureSessionRepository.findBySessionCode(session.getSessionCode()).orElseThrow();
        assertNull(unchanged.getClassroomLatitude());
        assertNull(unchanged.getClassroomLongitude());
    }

    @Test
    @DisplayName("4. Invalid coordinate boundaries (lat > 90, lon > 180) rejected")
    public void testInvalidCoordinates_Rejected() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode())
                .param("latitude", "95.5")
                .param("longitude", "72.8777")
                .param("accuracy", "10.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("Invalid GPS coordinates provided.")));
    }

    @Test
    @DisplayName("5. Another faculty cannot set classroom location for someone else's session")
    public void testAnotherFacultyCannotSetLocation_Forbidden() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession otherFacultySession = loginAs("other_faculty", "Faculty@123");

        mockMvc.perform(post("/api/classes/" + session.getSessionCode() + "/location")
                .session(otherFacultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "latitude", 19.0760,
                        "longitude", 72.8777,
                        "accuracy", 15.0
                ))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value(containsString("another faculty")));
    }

    @Test
    @DisplayName("6. Student attendance rejected if session classroom location was never established")
    public void testStudentAttendanceRejected_WhenSessionLocationNotEstablished() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        assertNull(session.getClassroomLatitude());

        // Generate token without coordinates
        var token = attendanceService.generateDynamicQrToken("FSJP", session.getSessionCode());

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        QrScanRequest req = new QrScanRequest("12345678", "FSJP", token.getToken(), session.getSessionCode(), 19.0760, 72.8777, 10.0, "DEV-FINGERPRINT-1");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("Classroom location has not been established for this class session")));
    }

    @Test
    @DisplayName("7. Student attendance succeeds when within 100m of dynamic session classroom location")
    public void testStudentWithinDynamicLocation_Succeeds() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        // Establish dynamic location at Bangalore (12.9716, 77.5946) — proving hardcoded Mumbai coordinates are NOT used!
        MvcResult qrResult = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode())
                .param("latitude", "12.971600")
                .param("longitude", "77.594600")
                .param("accuracy", "10.0"))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(qrResult.getResponse().getContentAsString()).get("token").asText();

        // Student scans from Bangalore location ~10m away
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        QrScanRequest req = new QrScanRequest("12345678", "FSJP", token, session.getSessionCode(), 12.971650, 77.594650, 10.0, "DEV-STU-1");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.attendance.attendanceStatus").value("PRESENT"));

        assertEquals(1, attendanceRepository.findBySessionCode(session.getSessionCode()).size());
    }

    @Test
    @DisplayName("8. Student attendance rejected with exact distance when outside 100m radius")
    public void testStudentOutsideDynamicLocation_RejectedWithDistance() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        // Dynamic location at (12.971600, 77.594600)
        MvcResult qrResult = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode())
                .param("latitude", "12.971600")
                .param("longitude", "77.594600")
                .param("accuracy", "12.0"))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(qrResult.getResponse().getContentAsString()).get("token").asText();

        // Student scans from location ~400m away (lat 12.975000, lon 77.594600)
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        QrScanRequest req = new QrScanRequest("12345678", "FSJP", token, session.getSessionCode(), 12.975000, 77.594600, 10.0, "DEV-STU-2");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("outside the allowed classroom area")))
                .andExpect(jsonPath("$.error").value(containsString("maximum allowed is 100m")));
    }

    @Test
    @DisplayName("9. Student attendance rejected when student GPS accuracy exceeds 50m")
    public void testStudentPoorAccuracy_Rejected() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        MvcResult qrResult = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode())
                .param("latitude", "19.0760")
                .param("longitude", "72.8777")
                .param("accuracy", "10.0"))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(qrResult.getResponse().getContentAsString()).get("token").asText();

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        // Accurate location coordinates, but accuracy is 70m (> 50m)
        QrScanRequest req = new QrScanRequest("12345678", "FSJP", token, session.getSessionCode(), 19.0760, 72.8777, 70.0, "DEV-STU-3");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("GPS accuracy is insufficient (70m). Maximum allowed is 50m.")));
    }

    @Test
    @DisplayName("10. Expired QR token (after 5 seconds) is strictly rejected")
    public void testExpiredQrToken_Rejected() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode())
                .param("latitude", "19.0760")
                .param("longitude", "72.8777")
                .param("accuracy", "10.0"))
                .andExpect(status().isOk());

        // Create expired token
        AttendanceQrToken expiredToken = new AttendanceQrToken("EXPIRED12345", "FSJP", session.getSessionCode(),
                Instant.now().minusSeconds(10), Instant.now().minusSeconds(5));
        qrTokenRepository.save(expiredToken);

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        QrScanRequest req = new QrScanRequest("12345678", "FSJP", "EXPIRED12345", session.getSessionCode(), 19.0760, 72.8777, 10.0, "DEV-STU-4");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("expired")));
    }

    @Test
    @DisplayName("11. Duplicate attendance in same session rejected with 409 Conflict")
    public void testDuplicateAttendance_RejectedWithConflict() throws Exception {
        LectureSession session = createTestSession("FSJP", "123456");
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        MvcResult qrResult1 = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode())
                .param("latitude", "19.0760")
                .param("longitude", "72.8777")
                .param("accuracy", "10.0"))
                .andExpect(status().isOk())
                .andReturn();

        String token1 = objectMapper.readTree(qrResult1.getResponse().getContentAsString()).get("token").asText();

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        QrScanRequest req1 = new QrScanRequest("12345678", "FSJP", token1, session.getSessionCode(), 19.0760, 72.8777, 10.0, "DEV-STU-DUP");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        // Generate second fresh token for same session
        MvcResult qrResult2 = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", session.getSessionCode()))
                .andExpect(status().isOk())
                .andReturn();

        String token2 = objectMapper.readTree(qrResult2.getResponse().getContentAsString()).get("token").asText();

        QrScanRequest req2 = new QrScanRequest("12345678", "FSJP", token2, session.getSessionCode(), 19.0760, 72.8777, 10.0, "DEV-STU-DUP");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("already been marked")));
    }
}
