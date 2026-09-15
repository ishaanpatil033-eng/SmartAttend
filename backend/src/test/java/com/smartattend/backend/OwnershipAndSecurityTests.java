package com.smartattend.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartattend.backend.dtos.LoginRequest;
import com.smartattend.backend.entities.AssignmentSubmission;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.CourseAssignment;
import com.smartattend.backend.entities.LectureSession;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.repositories.AssignmentSubmissionRepository;
import com.smartattend.backend.repositories.CourseAssignmentRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.LectureSessionRepository;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.repositories.AttendanceRepository;
import java.time.LocalTime;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
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

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class OwnershipAndSecurityTests {

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
    private CourseAssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository submissionRepository;

    @Autowired
    private LectureSessionRepository sessionRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @BeforeEach
    void setUp() {
        attendanceRepository.deleteAll();
        submissionRepository.deleteAll();
        assignmentRepository.deleteAll();
        sessionRepository.deleteAll();

        // Seed users
        seedUserIfNotExists("facultyA", "Teacher@123", "ROLE_FACULTY", null, "Faculty Alpha", "facA@smartattend.edu");
        seedUserIfNotExists("facultyB", "Teacher@123", "ROLE_FACULTY", null, "Faculty Beta", "facB@smartattend.edu");
        seedUserIfNotExists("STU101", "Student@123", "ROLE_STUDENT", "STU101", "Aarav Sharma", "stu101@smartattend.edu");
        seedUserIfNotExists("STU102", "Student@123", "ROLE_STUDENT", "STU102", "Ananya Patel", "stu102@smartattend.edu");
        seedUserIfNotExists("admin", "Admin@123", "ROLE_ADMIN", null, "System Admin", "admin@smartattend.edu");
        seedUserIfNotExists("hod", "Hod@123", "ROLE_HOD", null, "Head Of Department", "hod@smartattend.edu");

        // Seed Courses
        createOrUpdateCourse("CS101", "Computer Science 101", "facultyA", "Faculty Alpha");
        createOrUpdateCourse("MATH201", "Advanced Calculus", "facultyB", "Faculty Beta");
    }

    private void seedUserIfNotExists(String username, String rawPassword, String role, String studentId, String name, String email) {
        if (!userAccountRepository.findByUsername(username).isPresent()) {
            userAccountService.registerUser(username, rawPassword, role, studentId, name, email);
        }
        if (studentId != null && !studentRepository.findByStudentId(studentId).isPresent()) {
            studentRepository.save(new Student(studentId, name, email, "FE", 1, "E1"));
        }
    }

    private void createOrUpdateCourse(String courseId, String courseName, String facultyId, String facultyName) {
        Course course = courseRepository.findByCourseId(courseId).orElse(new Course(courseId, courseName));
        course.setAssignedFacultyId(facultyId);
        course.setAssignedFacultyName(facultyName);
        courseRepository.save(course);
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
    // ATTACK CASE 1: Faculty A requests Faculty B's assignment -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 1: Faculty A requesting Faculty B's assignment returns 403 Forbidden")
    void testFacultyCannotAccessOtherFacultyAssignment() throws Exception {
        CourseAssignment assignB = new CourseAssignment();
        assignB.setCourseId("MATH201");
        assignB.setTitle("Beta Assignment");
        assignB.setDescription("Beta instructions");
        assignB.setCreatedByFacultyId("facultyB");
        assignB = assignmentRepository.save(assignB);

        MockHttpSession sessionFacA = loginAs("facultyA", "Teacher@123");

        mockMvc.perform(get("/api/lms/assignments/" + assignB.getId())
                .session(sessionFacA))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // ATTACK CASE 2: Faculty A requests Faculty B's student submissions -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 2: Faculty A requesting Faculty B's student submissions returns 403 Forbidden")
    void testFacultyCannotAccessOtherFacultySubmissions() throws Exception {
        CourseAssignment assignB = new CourseAssignment();
        assignB.setCourseId("MATH201");
        assignB.setTitle("Beta Task");
        assignB.setDescription("Beta Task Desc");
        assignB.setCreatedByFacultyId("facultyB");
        assignB = assignmentRepository.save(assignB);

        AssignmentSubmission sub = new AssignmentSubmission();
        sub.setAssignmentId(assignB.getId());
        sub.setStudentId("STU101");
        sub.setCourseId("MATH201");
        sub.setSubmissionContent("Student solution");
        submissionRepository.save(sub);

        MockHttpSession sessionFacA = loginAs("facultyA", "Teacher@123");

        // Request submissions list for assignment B
        mockMvc.perform(get("/api/lms/assignments/" + assignB.getId() + "/submissions")
                .session(sessionFacA))
                .andExpect(status().isForbidden());

        // Request specific submission for assignment B
        mockMvc.perform(get("/api/lms/submissions/" + sub.getId())
                .session(sessionFacA))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // ATTACK CASE 3: Faculty A toggles / requests Faculty B's lecture -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 3: Faculty A modifying or requesting Faculty B's lecture returns 403 Forbidden")
    void testFacultyCannotModifyOrViewOtherFacultyLecture() throws Exception {
        LectureSession sessB = new LectureSession();
        sessB.setSessionCode("SESS-B-101");
        sessB.setCourseId("MATH201");
        sessB.setCourseName("Advanced Calculus");
        sessB.setFacultyId("facultyB");
        sessB.setFacultyName("Faculty Beta");
        sessB.setActive(true);
        sessB.setSessionDate(LocalDate.now());
        sessB.setSessionTime("10:00 AM");
        sessB.setAcademicYear("FE");
        sessB.setDivision("A");
        sessB.setTotalStudents(60);
        sessB = sessionRepository.save(sessB);

        MockHttpSession sessionFacA = loginAs("facultyA", "Teacher@123");

        // Try getting lecture details
        mockMvc.perform(get("/api/classes/code/" + sessB.getSessionCode())
                .session(sessionFacA))
                .andExpect(status().isForbidden());

        // Try toggling lecture status
        mockMvc.perform(post("/api/classes/" + sessB.getId() + "/status")
                .param("active", "false")
                .session(sessionFacA))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // ATTACK CASE 4: Student A requests Student B's submission -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 4: Student A requesting Student B's submission returns 403 Forbidden")
    void testStudentCannotViewOtherStudentSubmission() throws Exception {
        CourseAssignment assignA = new CourseAssignment();
        assignA.setCourseId("CS101");
        assignA.setTitle("Alpha Assignment");
        assignA.setCreatedByFacultyId("facultyA");
        assignA = assignmentRepository.save(assignA);

        AssignmentSubmission subB = new AssignmentSubmission();
        subB.setAssignmentId(assignA.getId());
        subB.setStudentId("STU102"); // Student B
        subB.setCourseId("CS101");
        subB.setSubmissionContent("Student B secret submission");
        subB = submissionRepository.save(subB);

        MockHttpSession sessionStuA = loginAs("STU101", "Student@123");

        // Student A tries to view Student B's submission by ID
        mockMvc.perform(get("/api/lms/submissions/" + subB.getId())
                .session(sessionStuA))
                .andExpect(status().isForbidden());

        // Student A tries to query Student B's submissions for course
        mockMvc.perform(get("/api/lms/assignments/submissions/student/STU102/course/CS101")
                .session(sessionStuA))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // ATTACK CASE 5: Student A deletes Student B's submission -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 5: Student A deleting Student B's submission returns 403 Forbidden")
    void testStudentCannotDeleteOtherStudentSubmission() throws Exception {
        CourseAssignment assignA = new CourseAssignment();
        assignA.setCourseId("CS101");
        assignA.setTitle("Alpha Task");
        assignA.setCreatedByFacultyId("facultyA");
        assignA = assignmentRepository.save(assignA);

        AssignmentSubmission subB = new AssignmentSubmission();
        subB.setAssignmentId(assignA.getId());
        subB.setStudentId("STU102");
        subB.setCourseId("CS101");
        subB.setSubmissionContent("Student B private solution");
        subB = submissionRepository.save(subB);

        MockHttpSession sessionStuA = loginAs("STU101", "Student@123");

        // Student A tries to delete Student B's submission
        mockMvc.perform(delete("/api/lms/submissions/" + subB.getId())
                .session(sessionStuA))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // ATTACK CASE 6: HOD POSTs /api/classes -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 6: HOD creating a class session returns 403 Forbidden")
    void testHodCannotCreateClassSession() throws Exception {
        MockHttpSession sessionHod = loginAs("hod", "Hod@123");

        Map<String, Object> body = new HashMap<>();
        body.put("courseId", "CS101");
        body.put("lectureType", "THEORY");
        body.put("academicYear", "FE");
        body.put("division", "A");

        mockMvc.perform(post("/api/classes")
                .session(sessionHod)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // AUTHORIZED: Admin POSTs /api/classes -> 201 Created
    // =========================================================================
    @Test
    @DisplayName("Admin creating a class session returns 201 Created")
    void testAdminCanCreateClassSession() throws Exception {
        MockHttpSession sessionAdmin = loginAs("admin", "Admin@123");

        Map<String, Object> body = new HashMap<>();
        body.put("courseId", "CS101");
        body.put("lectureType", "THEORY");
        body.put("academicYear", "FE");
        body.put("division", "A");

        mockMvc.perform(post("/api/classes")
                .session(sessionAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());
    }

    // =========================================================================
    // ATTACK CASE 7: Student POSTs /api/classes -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 7: Student creating a class session returns 403 Forbidden")
    void testStudentCannotCreateClassSession() throws Exception {
        MockHttpSession sessionStudent = loginAs("STU101", "Student@123");

        Map<String, Object> body = new HashMap<>();
        body.put("courseId", "CS101");
        body.put("lectureType", "THEORY");
        body.put("academicYear", "FE");
        body.put("division", "A");

        mockMvc.perform(post("/api/classes")
                .session(sessionStudent)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // ATTACK CASE 8: Faculty creates assignment for unassigned course -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 8: Faculty A creating assignment for MATH201 (assigned to Faculty B) returns 403 Forbidden")
    void testFacultyCannotCreateAssignmentForUnassignedCourse() throws Exception {
        MockHttpSession sessionFacA = loginAs("facultyA", "Teacher@123");

        Map<String, Object> body = new HashMap<>();
        body.put("courseId", "MATH201"); // MATH201 is assigned to facultyB!
        body.put("title", "Unauthorized Assignment");
        body.put("description", "Should be rejected");

        mockMvc.perform(post("/api/lms/assignments")
                .session(sessionFacA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // ATTACK CASE 9: Unauthenticated file download -> 401 Unauthorized or 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 9: Unauthenticated request to /api/lms/files/{fileName} returns 401 Unauthorized")
    void testUnauthenticatedFileDownloadRejected() throws Exception {
        mockMvc.perform(get("/api/lms/files/confidential_file.pdf"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // ATTACK CASE 10: Student requests /api/auth/faculty -> 403 Forbidden
    // =========================================================================
    @Test
    @DisplayName("Attack 10: Student requesting /api/auth/faculty returns 403 Forbidden")
    void testStudentCannotAccessFacultyList() throws Exception {
        MockHttpSession sessionStu = loginAs("STU101", "Student@123");

        mockMvc.perform(get("/api/auth/faculty")
                .session(sessionStu))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // MATRIX TEST 1: Student -> Own Details (ALLOW 200 OK)
    // =========================================================================
    @Test
    @DisplayName("Matrix 1: Student can view their own details")
    void testStudentCanAccessOwnDetails() throws Exception {
        MockHttpSession sessionStu = loginAs("STU101", "Student@123");

        mockMvc.perform(get("/api/admin/users/STU101")
                .session(sessionStu))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU101"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        mockMvc.perform(get("/api/students/search/STU101")
                .session(sessionStu))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU101"));
    }

    // =========================================================================
    // MATRIX TEST 2: Student -> Other Student Details (DENY 403 Forbidden)
    // =========================================================================
    @Test
    @DisplayName("Matrix 2: Student cannot view another student's details (403 Forbidden)")
    void testStudentCannotAccessOtherStudentDetails() throws Exception {
        MockHttpSession sessionStu = loginAs("STU101", "Student@123");

        mockMvc.perform(get("/api/admin/users/STU102")
                .session(sessionStu))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/students/search/STU102")
                .session(sessionStu))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // MATRIX TEST 3: Student -> Faculty / HOD / Admin Details (DENY 403 Forbidden)
    // =========================================================================
    @Test
    @DisplayName("Matrix 3: Student cannot view Faculty, HOD, or Admin details (403 Forbidden)")
    void testStudentCannotAccessStaffOrAdminDetails() throws Exception {
        MockHttpSession sessionStu = loginAs("STU101", "Student@123");

        mockMvc.perform(get("/api/admin/users/facultyA")
                .session(sessionStu))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/users/hod")
                .session(sessionStu))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/users/admin")
                .session(sessionStu))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // MATRIX TEST 4: Faculty -> Own Details (ALLOW 200 OK)
    // =========================================================================
    @Test
    @DisplayName("Matrix 4: Faculty can view their own details")
    void testFacultyCanAccessOwnDetails() throws Exception {
        MockHttpSession sessionFac = loginAs("facultyA", "Teacher@123");

        mockMvc.perform(get("/api/admin/users/facultyA")
                .session(sessionFac))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("facultyA"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    // =========================================================================
    // MATRIX TEST 5: Faculty -> Student who attended Faculty's lecture (ALLOW 200 OK)
    // =========================================================================
    @Test
    @DisplayName("Matrix 5: Faculty can view student who attended their class/lecture")
    void testFacultyCanAccessStudentWithLectureAttendance() throws Exception {
        // Create lecture session by facultyA
        LectureSession session = new LectureSession();
        session.setSessionCode("SESS-A-999");
        session.setCourseId("CS101");
        session.setCourseName("Computer Science 101");
        session.setFacultyId("facultyA");
        session.setFacultyName("Faculty Alpha");
        session.setSessionDate(LocalDate.now());
        session.setSessionTime("11:00 AM");
        session.setAcademicYear("FE");
        session.setDivision("A");
        session.setActive(true);
        session = sessionRepository.save(session);

        // Record attendance for STU101 in facultyA's session
        Student stu1 = studentRepository.findByStudentId("STU101").orElseThrow();
        Course course = courseRepository.findByCourseId("CS101").orElseThrow();
        Attendance att = new Attendance(stu1, course, session.getSessionCode(), LocalDate.now(), LocalTime.now(), "PRESENT");
        attendanceRepository.save(att);

        MockHttpSession sessionFacA = loginAs("facultyA", "Teacher@123");

        // Faculty A views attended student details -> ALLOWED
        mockMvc.perform(get("/api/admin/users/STU101")
                .session(sessionFacA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU101"));

        mockMvc.perform(get("/api/students/search/STU101")
                .session(sessionFacA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU101"));
    }

    // =========================================================================
    // MATRIX TEST 6: Faculty -> Student who did NOT attend Faculty's lecture (DENY 403 Forbidden)
    // =========================================================================
    @Test
    @DisplayName("Matrix 6: Faculty cannot view student who did not attend their lecture (403 Forbidden)")
    void testFacultyCannotAccessStudentWithoutLectureAttendance() throws Exception {
        MockHttpSession sessionFacA = loginAs("facultyA", "Teacher@123");

        // STU102 has NO attendance in any session of Faculty A
        mockMvc.perform(get("/api/admin/users/STU102")
                .session(sessionFacA))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/students/search/STU102")
                .session(sessionFacA))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // MATRIX TEST 7: Faculty -> Other Faculty / HOD / Admin (DENY 403 Forbidden)
    // =========================================================================
    @Test
    @DisplayName("Matrix 7: Faculty cannot view other faculty, HOD, or Admin details (403 Forbidden)")
    void testFacultyCannotAccessOtherFacultyOrHodOrAdmin() throws Exception {
        MockHttpSession sessionFacA = loginAs("facultyA", "Teacher@123");

        mockMvc.perform(get("/api/admin/users/facultyB")
                .session(sessionFacA))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/users/hod")
                .session(sessionFacA))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/users/admin")
                .session(sessionFacA))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // MATRIX TEST 8: HOD -> Student, Faculty, and Own Details (ALLOW 200 OK)
    // =========================================================================
    @Test
    @DisplayName("Matrix 8: HOD can view Student, Faculty, and Own details")
    void testHodCanAccessStudentAndFacultyAndOwnDetails() throws Exception {
        MockHttpSession sessionHod = loginAs("hod", "Hod@123");

        // HOD views student
        mockMvc.perform(get("/api/admin/users/STU101")
                .session(sessionHod))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU101"));

        // HOD views faculty
        mockMvc.perform(get("/api/admin/users/facultyA")
                .session(sessionHod))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("facultyA"));

        // HOD views own details
        mockMvc.perform(get("/api/admin/users/hod")
                .session(sessionHod))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("hod"));
    }

    // =========================================================================
    // MATRIX TEST 9: HOD -> Admin Details (DENY 403 Forbidden)
    // =========================================================================
    @Test
    @DisplayName("Matrix 9: Direct API access by HOD to Admin details MUST return 403 Forbidden")
    void testHodCannotAccessAdminDetails() throws Exception {
        MockHttpSession sessionHod = loginAs("hod", "Hod@123");

        mockMvc.perform(get("/api/admin/users/admin")
                .session(sessionHod))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // MATRIX TEST 10: Admin -> Student, Faculty, and Own Details (ALLOW 200 OK)
    // =========================================================================
    @Test
    @DisplayName("Matrix 10: Admin can view Student, Faculty, and Own details")
    void testAdminCanAccessStudentAndFacultyAndOwnDetails() throws Exception {
        MockHttpSession sessionAdmin = loginAs("admin", "Admin@123");

        // Admin views student
        mockMvc.perform(get("/api/admin/users/STU101")
                .session(sessionAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU101"));

        // Admin views faculty
        mockMvc.perform(get("/api/admin/users/facultyA")
                .session(sessionAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("facultyA"));

        // Admin views own details
        mockMvc.perform(get("/api/admin/users/admin")
                .session(sessionAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"));
    }

    // =========================================================================
    // MATRIX TEST 11: Admin -> HOD Details (DENY 403 Forbidden)
    // =========================================================================
    @Test
    @DisplayName("Matrix 11: Direct API access by Admin to HOD details MUST return 403 Forbidden")
    void testAdminCannotAccessHodDetails() throws Exception {
        MockHttpSession sessionAdmin = loginAs("admin", "Admin@123");

        mockMvc.perform(get("/api/admin/users/hod")
                .session(sessionAdmin))
                .andExpect(status().isForbidden());
    }
}
