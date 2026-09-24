package com.smartattend.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartattend.backend.dtos.CreateFacultyRequest;
import com.smartattend.backend.dtos.LoginRequest;
import com.smartattend.backend.entities.*;
import com.smartattend.backend.repositories.*;
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
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class SmartAttendWorkflowTests {

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
    private CourseResourceRepository courseResourceRepository;

    @Autowired
    private CourseAssignmentRepository courseAssignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private CourseAnnouncementRepository courseAnnouncementRepository;

    @Autowired
    private com.smartattend.backend.repositories.AttendanceRepository attendanceRepository;

    @Autowired
    private com.smartattend.backend.repositories.AttendanceQrTokenRepository qrTokenRepository;

    @Autowired
    private com.smartattend.backend.repositories.LectureSessionRepository lectureSessionRepository;

    @Autowired
    private com.smartattend.backend.repositories.DeviceAttendanceBindingRepository deviceBindingRepository;

    @BeforeEach
    void setUp() {
        attendanceRepository.deleteAll();
        qrTokenRepository.deleteAll();
        deviceBindingRepository.deleteAll();
        lectureSessionRepository.deleteAll();
        assignmentSubmissionRepository.deleteAll();
        courseAssignmentRepository.deleteAll();
        courseResourceRepository.deleteAll();
        courseAnnouncementRepository.deleteAll();
        courseRepository.deleteAll();
        studentRepository.deleteAll();
        userAccountRepository.deleteAll();

        // Ensure clean accounts for test roles
        seedUserIfNotExists("admin", "Admin@123", "ROLE_ADMIN", null, "System Admin", "admin@smartattend.edu");
        seedUserIfNotExists("hod", "Hod@123", "ROLE_HOD", null, "Department Head", "hod@smartattend.edu");
        seedUserIfNotExists("123456", "123456@edu", "ROLE_FACULTY", null, "Prof. Sharma", "faculty@smartattend.edu");
        seedUserIfNotExists("12345678", "12345678@apsit", "ROLE_STUDENT", "12345678", "Dev Student", "student@smartattend.edu");

        if (!studentRepository.findByStudentId("12345678").isPresent()) {
            Student devStudent = new Student("12345678", "Dev Student", "student@smartattend.edu", "FE", 1, "A1");
            devStudent.setBranch("CS");
            devStudent.setDivision("A");
            devStudent.setBatch("A1");
            studentRepository.save(devStudent);
        }
    }

    private void seedUserIfNotExists(String username, String rawPassword, String role, String studentId, String name, String email) {
        if (!userAccountRepository.findByUsername(username).isPresent()) {
            userAccountService.registerUser(username, rawPassword, role, studentId, name, email);
        } else {
            // Re-enable if disabled
            UserAccount account = userAccountRepository.findByUsername(username).get();
            if (!account.isEnabled()) {
                account.setEnabled(true);
                userAccountRepository.save(account);
            }
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
    // 1. COMMON LOGIN FOR ALL ROLES
    // =========================================================================

    @Test
    @DisplayName("1. Single Common Login resolves correct role automatically for Admin, HOD, Faculty, and Student")
    void testCommonLoginRoles() throws Exception {
        // Admin
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("admin", "Admin@123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));

        // HOD
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("hod", "Hod@123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ROLE_HOD"));

        // Faculty
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("123456", "123456@edu"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ROLE_FACULTY"));

        // Student
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("12345678", "12345678@apsit"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ROLE_STUDENT"));
    }

    // =========================================================================
    // 2. ADMIN STUDENT MANAGEMENT (CREATE, EDIT, DEACTIVATE)
    // =========================================================================

    @Test
    @DisplayName("2. Admin can create, edit, and deactivate student accounts")
    void testAdminStudentManagement() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        // 1. Create Student with academic structure
        Student newStudent = new Student("87654321", "Test Student", "teststu@smartattend.edu", "FE", 1, "A1");
        newStudent.setBranch("CS");
        newStudent.setDivision("A");
        newStudent.setBatch("A1");

        MvcResult createResult = mockMvc.perform(post("/api/students")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newStudent)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.studentId").value("87654321"))
                .andExpect(jsonPath("$.branch").value("CS"))
                .andReturn();

        Student created = objectMapper.readValue(createResult.getResponse().getContentAsString(), Student.class);
        Long createdDbId = created.getId();

        // 2. Edit Student (change batch to A2 and name)
        created.setStudentName("Test Student Updated");
        created.setBatch("A2");
        mockMvc.perform(put("/api/students/" + createdDbId)
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(created)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentName").value("Test Student Updated"))
                .andExpect(jsonPath("$.batch").value("A2"));

        // 3. Deactivate Student via DELETE /api/admin/users/{userId}
        mockMvc.perform(delete("/api/admin/users/87654321")
                .session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify deactivated user cannot log in
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("87654321", "87654321@smartattend"))))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 3. ADMIN FACULTY MANAGEMENT (CREATE, EDIT, DEACTIVATE)
    // =========================================================================

    @Test
    @DisplayName("3. Admin can create, edit, and delete/deactivate faculty accounts")
    void testAdminFacultyManagement() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        // 1. Create Faculty
        CreateFacultyRequest createReq = new CreateFacultyRequest("654321", "Prof. Jane Doe", "janedoe@smartattend.edu");
        mockMvc.perform(post("/api/auth/faculty")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("654321"))
                .andExpect(jsonPath("$.fullName").value("Prof. Jane Doe"));

        // 2. Edit Faculty via PUT /api/admin/users/faculty/654321
        CreateFacultyRequest updateReq = new CreateFacultyRequest("654321", "Prof. Jane Smith", "janesmith@smartattend.edu");
        mockMvc.perform(put("/api/admin/users/faculty/654321")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Prof. Jane Smith"))
                .andExpect(jsonPath("$.email").value("janesmith@smartattend.edu"));

        // 3. Delete/Deactivate Faculty via DELETE /api/admin/users/faculty/654321
        mockMvc.perform(delete("/api/admin/users/faculty/654321")
                .session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify deactivated faculty cannot log in
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("654321", "654321@edu"))))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 4. ADMIN AND HOD IMMUNITY FROM DELETION
    // =========================================================================

    @Test
    @DisplayName("4. Admin and HOD accounts cannot be deleted or deactivated")
    void testAdminHodImmunity() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        // Attempt to delete Admin account
        mockMvc.perform(delete("/api/admin/users/admin")
                .session(adminSession))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Admin and HOD accounts cannot be deleted."));

        // Attempt to delete HOD account
        mockMvc.perform(delete("/api/admin/users/hod")
                .session(adminSession))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Admin and HOD accounts cannot be deleted."));
    }

    // =========================================================================
    // 5. ACADEMIC STRUCTURE & BATCH VALIDATION
    // =========================================================================

    @Test
    @DisplayName("5. Academic structure enforces batch-division consistency and faculty assignment")
    void testCourseAcademicStructureAndBatchValidation() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");
        MockHttpSession hodSession = loginAs("hod", "Hod@123");

        // 1. Invalid Batch: Division A with Batch B1 must fail
        Course invalidCourse = new Course("CS301", "Database Systems");
        invalidCourse.setBranch("CS");
        invalidCourse.setDivision("A");
        invalidCourse.setBatch("B1");
        invalidCourse.setCourseType("LAB");

        mockMvc.perform(post("/api/courses")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidCourse)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid batch: B1 does not belong to Division A"));

        // 2. Valid Course Creation: Division A with Batch A1
        Course validCourse = new Course("CS301", "Database Systems");
        validCourse.setBranch("CS");
        validCourse.setDivision("A");
        validCourse.setBatch("A1");
        validCourse.setAcademicYear("TE");
        validCourse.setSemester(5);
        validCourse.setCourseType("LAB");
        validCourse.setAssignedFacultyId("123456");
        validCourse.setAssignedFacultyName("Prof. Sharma");

        MvcResult result = mockMvc.perform(post("/api/courses")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validCourse)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseId").value("CS301"))
                .andExpect(jsonPath("$.assignedFacultyId").value("123456"))
                .andReturn();

        Course createdCourse = objectMapper.readValue(result.getResponse().getContentAsString(), Course.class);

        // 3. Faculty query assigned courses
        mockMvc.perform(get("/api/courses/faculty/123456")
                .session(hodSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseId").value("CS301"));

        // 4. Student query matching courses
        // Set student 12345678 to match TE, CS, A, A1
        Student stu = studentRepository.findByStudentId("12345678").get();
        stu.setAcademicYear("TE");
        stu.setSemester(5);
        stu.setBranch("CS");
        stu.setDivision("A");
        stu.setBatch("A1");
        studentRepository.save(stu);

        mockMvc.perform(get("/api/courses/student/12345678")
                .session(hodSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseId").value("CS301"));
    }

    // =========================================================================
    // 6. LMS WORKFLOW (MATERIALS, ASSIGNMENTS, SUBMISSIONS, ANNOUNCEMENTS)
    // =========================================================================

    @Test
    @DisplayName("6. LMS Workflow: Materials, Assignments, Submissions, and Announcements")
    void testLmsWorkflow() throws Exception {
        // Setup course
        Course course = new Course("CS401", "Distributed Systems");
        course.setBranch("CS");
        course.setDivision("A");
        course.setAssignedFacultyId("123456");
        courseRepository.save(course);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        // 1. Faculty uploads learning material
        CourseResource res = new CourseResource(
                "CS401",
                "Lecture 1 - Architectures",
                "DOCUMENT",
                "https://drive.google.com/doc1",
                "Notes covering client-server and peer-to-peer architectures",
                "123456"
        );

        mockMvc.perform(post("/api/lms/resources")
                .session(facultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(res)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Lecture 1 - Architectures"));

        // 2. Student views learning materials for the course
        mockMvc.perform(get("/api/lms/resources/course/CS401")
                .session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Lecture 1 - Architectures"));

        // 3. Faculty creates an assignment
        CourseAssignment assignment = new CourseAssignment(
                "CS401",
                "Lab 1: RPC Implementation",
                "Implement a gRPC service in Java or Python",
                "2026-10-15T23:59",
                100,
                "123456"
        );

        MvcResult assignResult = mockMvc.perform(post("/api/lms/assignments")
                .session(facultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(assignment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Lab 1: RPC Implementation"))
                .andReturn();

        CourseAssignment createdAssign = objectMapper.readValue(assignResult.getResponse().getContentAsString(), CourseAssignment.class);
        Long assignmentId = createdAssign.getId();

        // 4. Student submits the assignment
        AssignmentSubmission submission = new AssignmentSubmission(
                assignmentId,
                "CS401",
                "12345678",
                "Dev Student",
                "https://github.com/student/rpc-lab"
        );

        mockMvc.perform(post("/api/lms/assignments/" + assignmentId + "/submit")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submission)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.studentId").value("12345678"));

        // 5. Faculty views submissions for the assignment
        mockMvc.perform(get("/api/lms/assignments/" + assignmentId + "/submissions")
                .session(facultySession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentId").value("12345678"))
                .andExpect(jsonPath("$[0].submissionContent").value("https://github.com/student/rpc-lab"));

        // 6. Faculty posts course announcement
        CourseAnnouncement announcement = new CourseAnnouncement(
                "CS401",
                "Quiz Scheduled",
                "Quiz 1 will be held on Friday covering Units 1 and 2.",
                "Prof. Sharma",
                "FACULTY"
        );

        mockMvc.perform(post("/api/lms/announcements")
                .session(facultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(announcement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Quiz Scheduled"));

        // 7. Student views course announcements
        mockMvc.perform(get("/api/lms/announcements/course/CS401")
                .session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Quiz Scheduled"));
    }

    // =========================================================================
    // 7. JAVA / FSJP CANONICAL SEED IDEMPOTENCY & INITIAL STATE VERIFICATION
    // =========================================================================

    @Test
    @DisplayName("7. Java/FSJP seed is idempotent: repeated startup preserves exactly 1 course, 0 sessions, 0 attendance records, 0 tokens")
    void testJavaFsjpSeedIdempotencyAndInitialCounts() {
        // Clean everything to test cold startup
        attendanceRepository.deleteAll();
        qrTokenRepository.deleteAll();
        deviceBindingRepository.deleteAll();
        lectureSessionRepository.deleteAll();
        courseRepository.deleteAll();
        studentRepository.deleteAll();
        userAccountRepository.deleteAll();

        // 1st Startup
        userAccountService.initDefaultUsers();

        assertEquals(1, courseRepository.count(), "First startup must create exactly 1 course");
        Course fsjp1 = courseRepository.findByCourseId("FSJP").orElseThrow();
        assertEquals("Java", fsjp1.getCourseName());
        assertEquals("123456", fsjp1.getAssignedFacultyId());
        assertEquals("Prof. Faculty", fsjp1.getAssignedFacultyName());

        assertEquals(1, studentRepository.count(), "First startup must have exactly 1 student");
        Student student1 = studentRepository.findByStudentId("12345678").orElseThrow();
        assertEquals("Student 12345678", student1.getStudentName());
        assertEquals("A", student1.getDivision());

        assertEquals(0, lectureSessionRepository.count(), "Startup must create 0 lecture sessions");
        assertEquals(0, attendanceRepository.count(), "Startup must create 0 attendance records");
        assertEquals(0, qrTokenRepository.count(), "Startup must create 0 active QR tokens");

        // 2nd Startup (restarting Spring Boot)
        userAccountService.initDefaultUsers();

        assertEquals(1, courseRepository.count(), "Second startup must still have exactly 1 course (no duplicates)");
        Course fsjp2 = courseRepository.findByCourseId("FSJP").orElseThrow();
        assertEquals("Java", fsjp2.getCourseName());
        assertEquals("123456", fsjp2.getAssignedFacultyId());

        assertEquals(1, studentRepository.count(), "Second startup must still have exactly 1 student");
        assertEquals(0, lectureSessionRepository.count(), "Second startup must still have 0 lecture sessions");
        assertEquals(0, attendanceRepository.count(), "Second startup must still have 0 attendance records");
        assertEquals(0, qrTokenRepository.count(), "Second startup must still have 0 active QR tokens");
    }

    // =========================================================================
    // 8. END-TO-END COURSE -> FACULTY -> SESSION -> QR -> STUDENT -> ATTENDANCE
    // =========================================================================

    @Test
    @DisplayName("8. End-to-end Course -> Faculty -> Session -> Dynamic QR -> Student -> Attendance -> Cascade Delete")
    void testEndToEndJavaWorkflowAndSessionSecurity() throws Exception {
        // Clean database and seed canonical state
        attendanceRepository.deleteAll();
        qrTokenRepository.deleteAll();
        deviceBindingRepository.deleteAll();
        lectureSessionRepository.deleteAll();
        courseRepository.deleteAll();
        studentRepository.deleteAll();
        userAccountRepository.deleteAll();

        userAccountService.initDefaultUsers();

        // 1. Faculty 123456 logs in and sees Java / FSJP under My Assigned Courses
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        mockMvc.perform(get("/api/courses")
                .session(facultySession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseId").value("FSJP"))
                .andExpect(jsonPath("$[0].courseName").value("Java"))
                .andExpect(jsonPath("$[0].assignedFacultyId").value("123456"));

        // 2. Faculty 123456 creates a class session for Java (FSJP)
        LectureSession newSession = new LectureSession();
        newSession.setCourseId("FSJP");
        newSession.setCourseName("Java");
        newSession.setLectureType("THEORY");
        newSession.setDivision("A");
        newSession.setBatch("ALL");
        newSession.setSessionDate(java.time.LocalDate.now());
        newSession.setSessionTime("10:00 AM");

        MvcResult createSessionResult = mockMvc.perform(post("/api/classes")
                .session(facultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newSession)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseId").value("FSJP"))
                .andExpect(jsonPath("$.facultyId").value("123456"))
                .andReturn();

        LectureSession createdSession = objectMapper.readValue(createSessionResult.getResponse().getContentAsString(), LectureSession.class);
        String sessionCode = createdSession.getSessionCode();
        Long sessionId = createdSession.getId();
        assertNotNull(sessionCode);

        // 3. Faculty launches 5-second dynamic QR
        MvcResult qrResult = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiresInSeconds").value(5))
                .andReturn();

        String qrToken = objectMapper.readTree(qrResult.getResponse().getContentAsString()).get("token").asText();

        // 4. Another faculty (seed "other_faculty") tries to delete Faculty 123456's session -> Forbidden 403
        seedUserIfNotExists("other_faculty", "Faculty@123", "ROLE_FACULTY", null, "Other Faculty", "other@smartattend.edu");
        MockHttpSession otherFacultySession = loginAs("other_faculty", "Faculty@123");

        mockMvc.perform(delete("/api/classes/" + sessionId)
                .session(otherFacultySession))
                .andExpect(status().isForbidden());

        // 5. Student 12345678 logs in and verifies Course Java (FSJP) is enrolled
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        mockMvc.perform(get("/api/courses")
                .session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseId").value("FSJP"));

        // 6. Student scans with VALID 5-second dynamic QR -> PRESENT 201 Created
        com.smartattend.backend.dtos.QrScanRequest validScanReq = new com.smartattend.backend.dtos.QrScanRequest();
        validScanReq.setCourseId("FSJP");
        validScanReq.setSessionCode(sessionCode);
        validScanReq.setQrToken(qrToken);
        validScanReq.setDeviceFingerprint("FP-TEST-STUDENT-DEVICE");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validScanReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.attendance.attendanceStatus").value("PRESENT"));

        // 7a. Re-scanning the consumed token -> Rejected 400 Bad Request (already consumed/used)
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validScanReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("already been used")));

        // 7b. Scanning with a NEW live token for the same session -> Rejected 409 Conflict (Duplicate student attendance)
        MvcResult nextQrResult = mockMvc.perform(post("/api/attendance/qr/generate")
                .session(facultySession)
                .param("courseId", "FSJP")
                .param("sessionCode", sessionCode))
                .andExpect(status().isOk())
                .andReturn();
        String nextQrToken = objectMapper.readTree(nextQrResult.getResponse().getContentAsString()).get("token").asText();

        validScanReq.setQrToken(nextQrToken);
        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validScanReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("already been marked")));

        // 8. Expired QR scan -> Rejected
        AttendanceQrToken expiredTokenEntity = new AttendanceQrToken("EXPIRED-FSJP-TOKEN", "FSJP", sessionCode, java.time.Instant.now().minusSeconds(20), java.time.Instant.now().minusSeconds(10));
        qrTokenRepository.save(expiredTokenEntity);

        com.smartattend.backend.dtos.QrScanRequest expiredScanReq = new com.smartattend.backend.dtos.QrScanRequest();
        expiredScanReq.setCourseId("FSJP");
        expiredScanReq.setSessionCode(sessionCode);
        expiredScanReq.setQrToken("EXPIRED-FSJP-TOKEN");
        expiredScanReq.setDeviceFingerprint("FP-TEST-STUDENT-DEVICE-2");

        mockMvc.perform(post("/api/attendance/qr/scan")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(expiredScanReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("expired")));

        // 10. Faculty deletes their own session -> 200 OK and cascaded attendance deleted
        assertEquals(1, attendanceRepository.count());

        mockMvc.perform(delete("/api/classes/" + sessionId)
                .session(facultySession))
                .andExpect(status().isOk());

        assertEquals(0, lectureSessionRepository.count());
        assertEquals(0, attendanceRepository.count());
    }
}
