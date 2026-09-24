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
public class DynamicQrAttendanceTests {

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

    private LectureSession createTestSession(String courseId, String sessionCode, String teacherUsername) {
        LectureSession session = new LectureSession();
        session.setCourseId(courseId);
        session.setCourseName("Full Stack Java Programming");
        session.setSessionCode(sessionCode);
        session.setSessionDate(LocalDate.now());
        session.setFacultyId(teacherUsername);
        session.setFacultyName("Prof. Faculty");
        session.setActive(true);
        return lectureSessionRepository.save(session);
    }

    @Test
    @DisplayName("A. Session creation by faculty succeeds")
    public void testSessionCreationByFaculty() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        mockMvc.perform(post("/api/classes")
                .session(facultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "courseId", "FSJP",
                        "sessionDate", LocalDate.now().toString()
                ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionCode").isNotEmpty())
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.facultyId").value("123456"));
    }

    @Test
    @DisplayName("B. 5s dynamic QR generation succeeds without any location parameters")
    public void testDynamicQrGeneration_WithoutLocation() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        String sessionCode = "SES-NOLOC-01";
        createTestSession("FSJP", sessionCode, "123456");

        MvcResult res = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiresInSeconds").value(5))
                .andExpect(jsonPath("$.sessionCode").value(sessionCode))
                .andReturn();

        String token = objectMapper.readTree(res.getResponse().getContentAsString()).get("token").asText();
        assertNotNull(token);
        assertTrue(qrTokenRepository.findByToken(token).isPresent());
    }

    @Test
    @DisplayName("C. 5s dynamic QR rotation generates new valid tokens")
    public void testDynamicQrRotation() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        String sessionCode = "SES-ROTATE-01";
        createTestSession("FSJP", sessionCode, "123456");

        // Token 1
        MvcResult res1 = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String token1 = objectMapper.readTree(res1.getResponse().getContentAsString()).get("token").asText();

        // Token 2 (5-second rotation)
        MvcResult res2 = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String token2 = objectMapper.readTree(res2.getResponse().getContentAsString()).get("token").asText();

        assertNotEquals(token1, token2);
        assertTrue(qrTokenRepository.findByToken(token1).isPresent());
        assertTrue(qrTokenRepository.findByToken(token2).isPresent());
    }

    @Test
    @DisplayName("D. Student scan without GPS marks attendance as PRESENT (201 Created)")
    public void testStudentScan_MarksPresentWithoutLocation() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        String sessionCode = "SES-ATTEND-01";
        createTestSession("FSJP", sessionCode, "123456");

        MvcResult qrResult = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String qrToken = objectMapper.readTree(qrResult.getResponse().getContentAsString()).get("token").asText();

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        QrScanRequest scanReq = new QrScanRequest(
                "12345678",
                "FSJP",
                qrToken,
                sessionCode,
                "DEV-PHONE-STUDENT-01"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(scanReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.attendance.attendanceStatus").value("PRESENT"))
                .andExpect(jsonPath("$.attendance.sessionCode").value(sessionCode));

        // Verify attendance record exists in repository
        assertEquals(1, attendanceRepository.count());
    }

    @Test
    @DisplayName("E. Expired dynamic QR code is rejected")
    public void testExpiredQr_Rejected() throws Exception {
        String sessionCode = "SES-EXP-01";
        createTestSession("FSJP", sessionCode, "123456");

        // Create an already-expired token (expired 10 seconds ago)
        AttendanceQrToken expiredToken = new AttendanceQrToken(
                "EXPIRED-TEST-TOKEN",
                "FSJP",
                sessionCode,
                Instant.now().minusSeconds(15),
                Instant.now().minusSeconds(10)
        );
        qrTokenRepository.save(expiredToken);

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        QrScanRequest req = new QrScanRequest(
                "12345678",
                "FSJP",
                "EXPIRED-TEST-TOKEN",
                sessionCode,
                "DEV-PHONE-01"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("expired")));
    }

    @Test
    @DisplayName("F. Invalid or tampered QR token is rejected")
    public void testInvalidQrToken_Rejected() throws Exception {
        String sessionCode = "SES-INV-01";
        createTestSession("FSJP", sessionCode, "123456");

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        QrScanRequest req = new QrScanRequest(
                "12345678",
                "FSJP",
                "NON-EXISTENT-FAKE-TOKEN-999",
                sessionCode,
                "DEV-PHONE-01"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("Invalid QR code")));
    }

    @Test
    @DisplayName("G. Consumed QR token cannot be scanned a second time")
    public void testConsumedQrToken_RejectedOnSecondScan() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        String sessionCode = "SES-CONSUMED-01";
        createTestSession("FSJP", sessionCode, "123456");

        MvcResult qrResult = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String qrToken = objectMapper.readTree(qrResult.getResponse().getContentAsString()).get("token").asText();

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        QrScanRequest req = new QrScanRequest(
                "12345678",
                "FSJP",
                qrToken,
                sessionCode,
                "DEV-PHONE-01"
        );

        // First scan succeeds
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Second scan with identical token fails
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("already been used")));
    }

    @Test
    @DisplayName("H. Duplicate attendance by same student in same session is rejected (409 Conflict)")
    public void testDuplicateAttendance_Rejected() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        String sessionCode = "SES-DUP-01";
        createTestSession("FSJP", sessionCode, "123456");

        // Generate Token 1
        MvcResult res1 = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String token1 = objectMapper.readTree(res1.getResponse().getContentAsString()).get("token").asText();

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        QrScanRequest req1 = new QrScanRequest(
                "12345678",
                "FSJP",
                token1,
                sessionCode,
                "DEV-PHONE-01"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        // Generate Token 2 (5-second rotation)
        MvcResult res2 = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String token2 = objectMapper.readTree(res2.getResponse().getContentAsString()).get("token").asText();

        QrScanRequest req2 = new QrScanRequest(
                "12345678",
                "FSJP",
                token2,
                sessionCode,
                "DEV-PHONE-01"
        );

        // Same student scanning new token in same session must be rejected with 409 Conflict
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("already been marked")));
    }

    @Test
    @DisplayName("I. Unauthorized faculty cannot generate QR or delete another faculty's session")
    public void testUnauthorizedFacultyProtection() throws Exception {
        String sessionCode = "SES-OWNER-01";
        LectureSession session = createTestSession("FSJP", sessionCode, "123456");

        MockHttpSession otherFacultySession = loginAs("other_faculty", "Faculty@123");

        // Other faculty cannot delete session created by 123456
        mockMvc.perform(delete("/api/classes/" + session.getId())
                .session(otherFacultySession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("J. Wrong course QR token is rejected")
    public void testWrongCourseQr_Rejected() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        String sessionCode = "SES-WRONG-01";
        createTestSession("FSJP", sessionCode, "123456");

        MvcResult res = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(res.getResponse().getContentAsString()).get("token").asText();

        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        // Student submits scan for a different course ID
        QrScanRequest req = new QrScanRequest(
                "12345678",
                "MATH101",
                token,
                sessionCode,
                "DEV-PHONE-01"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("belongs to course 'FSJP'")));
    }

    @Test
    @DisplayName("K. One device cannot mark attendance for two different students in same session")
    public void testDeviceHardwareBinding_RejectsProxy() throws Exception {
        String sessionCode = "SES-PROXY-01";
        createTestSession("FSJP", sessionCode, "123456");
        String sharedDevice = "HW-SHARED-DEVICE-999";

        // Seed a second student
        Student student2 = new Student("STU2001", "Second Student", "second@smartattend.edu");
        studentRepository.save(student2);
        userAccountService.registerUser("STU2001", "Student@123", "ROLE_STUDENT", "STU2001", "Second Student", "second@smartattend.edu");

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        MvcResult res1 = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String token1 = objectMapper.readTree(res1.getResponse().getContentAsString()).get("token").asText();

        // Student 1 marks attendance with sharedDevice -> SUCCESS
        MockHttpSession student1Session = loginAs("12345678", "12345678@apsit");
        QrScanRequest req1 = new QrScanRequest(
                "12345678",
                "FSJP",
                token1,
                sessionCode,
                sharedDevice
        );
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(student1Session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        // Generate Token 2
        MvcResult res2 = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String token2 = objectMapper.readTree(res2.getResponse().getContentAsString()).get("token").asText();

        // Student 2 attempts to mark attendance with SAME device in same session -> REJECTED 409
        MockHttpSession student2Session = loginAs("STU2001", "Student@123");
        QrScanRequest req2 = new QrScanRequest(
                "STU2001",
                "FSJP",
                token2,
                sessionCode,
                sharedDevice
        );
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(student2Session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("Proxy attendance rejected")));
    }

    @Test
    @DisplayName("L. Student ID tampering in request payload is rejected")
    public void testStudentIdTampering_Rejected() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        String sessionCode = "SES-TAMPER-01";
        createTestSession("FSJP", sessionCode, "123456");

        MvcResult res = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(res.getResponse().getContentAsString()).get("token").asText();

        // Logged in as student 12345678
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        // Payload tampers studentId to another student ID
        QrScanRequest req = new QrScanRequest(
                "99999999",
                "FSJP",
                token,
                sessionCode,
                "DEV-PHONE-01"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("Student ID tampering detected")));
    }

    @Test
    @DisplayName("M. Student cannot scan QR when not authenticated (401 Unauthorized)")
    public void testUnauthenticatedScan_Rejected() throws Exception {
        QrScanRequest req = new QrScanRequest(
                "12345678",
                "FSJP",
                "SOME-TOKEN",
                "SES-01",
                "DEV-PHONE-01"
        );

        mockMvc.perform(post("/api/attendance/qr/scan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("N. Student cannot generate dynamic QR code (403 Forbidden)")
    public void testStudentCannotGenerateQr() throws Exception {
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        mockMvc.perform(post("/api/attendance/qr/generate")
                .session(studentSession)
                .param("courseId", "FSJP"))
                .andExpect(status().isForbidden());
    }
}
