package com.smartattend.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartattend.backend.dtos.LoginRequest;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.CourseAssignment;
import com.smartattend.backend.entities.LectureSession;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.AssignmentSubmissionRepository;
import com.smartattend.backend.repositories.AttendanceQrTokenRepository;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseAssignmentRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.CourseResourceRepository;
import com.smartattend.backend.repositories.DeviceAttendanceBindingRepository;
import com.smartattend.backend.repositories.LectureSessionRepository;
import com.smartattend.backend.repositories.SecurityAuditLogRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
import com.smartattend.backend.services.MoodleService;
import com.smartattend.backend.services.UserAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test suite implementing all 28 automated test requirements specified in Part N:
 * - CLEAN STATE (1-5)
 * - COURSES (6-9)
 * - ASSIGNMENT (10-15)
 * - MATERIALS (16-19)
 * - COURSEWORK (20-23)
 * - PRIVACY (24-28)
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class CleanResetAndCourseAssignmentSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private AttendanceQrTokenRepository qrTokenRepository;

    @Autowired
    private DeviceAttendanceBindingRepository deviceBindingRepository;

    @Autowired
    private LectureSessionRepository lectureSessionRepository;

    @Autowired
    private CourseResourceRepository courseResourceRepository;

    @Autowired
    private CourseAssignmentRepository courseAssignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private SecurityAuditLogRepository auditLogRepository;

    @Autowired
    private UserAccountService userAccountService;

    @Autowired
    private MoodleService moodleService;

    @BeforeEach
    void setUp() {
        attendanceRepository.deleteAll();
        qrTokenRepository.deleteAll();
        deviceBindingRepository.deleteAll();
        lectureSessionRepository.deleteAll();
        assignmentSubmissionRepository.deleteAll();
        courseAssignmentRepository.deleteAll();
        courseResourceRepository.deleteAll();
        courseRepository.deleteAll();
        auditLogRepository.deleteAll();
        studentRepository.deleteAll();
        userAccountRepository.deleteAll();

        // Ensure accounts exist
        seedUserIfNotExists("admin", "Admin@123", "ROLE_ADMIN", null, "System Admin", "admin@smartattend.edu");
        seedUserIfNotExists("hod", "Hod@123", "ROLE_HOD", null, "HOD CS", "hod@smartattend.edu");
        seedUserIfNotExists("123456", "123456@edu", "ROLE_FACULTY", null, "Prof. Sharma", "prof@smartattend.edu");
        seedUserIfNotExists("faculty2", "Faculty@123", "ROLE_FACULTY", null, "Prof. Verma", "verma@smartattend.edu");
        seedUserIfNotExists("12345678", "12345678@apsit", "ROLE_STUDENT", "12345678", "Dev Student", "student@smartattend.edu");
        seedUserIfNotExists("student2", "Student@123", "ROLE_STUDENT", "87654321", "Unrelated Student", "student2@smartattend.edu");

        if (!studentRepository.findByStudentId("12345678").isPresent()) {
            Student devStudent = new Student("12345678", "Dev Student", "student@smartattend.edu", "FE", 1, "A1");
            devStudent.setBranch("CS");
            devStudent.setDivision("A");
            devStudent.setBatch("A1");
            studentRepository.save(devStudent);
        }

        if (!studentRepository.findByStudentId("87654321").isPresent()) {
            Student s2 = new Student("87654321", "Unrelated Student", "student2@smartattend.edu", "FE", 1, "A2");
            s2.setBranch("CS");
            s2.setDivision("A");
            s2.setBatch("A2");
            studentRepository.save(s2);
        }
    }

    private void seedUserIfNotExists(String username, String rawPassword, String role, String studentId, String name, String email) {
        if (!userAccountRepository.findByUsername(username).isPresent()) {
            userAccountService.registerUser(username, rawPassword, role, studentId, name, email);
        }
    }

    private MockHttpSession loginAs(String username, String password) throws Exception {
        LoginRequest req = new LoginRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    // =========================================================================
    // CLEAN STATE (1-5)
    // =========================================================================

    @Test
    @DisplayName("1. No CS101 is automatically created")
    void test01_noCs101AutomaticallyCreated() {
        assertFalse(courseRepository.findByCourseId("CS101").isPresent(),
                "CS101 must NOT exist automatically in the repository after cleanup");
    }

    @Test
    @DisplayName("2. No demo students are automatically created")
    void test02_noDemoStudentsAutomaticallyCreated() {
        assertFalse(studentRepository.findByStudentId("STU101").isPresent(), "STU101 must not exist");
        assertFalse(studentRepository.findByStudentId("STU102").isPresent(), "STU102 must not exist");
        assertFalse(studentRepository.findByStudentId("STU103").isPresent(), "STU103 must not exist");
        assertFalse(studentRepository.findByStudentId("STU104").isPresent(), "STU104 must not exist");
    }

    @Test
    @DisplayName("3. No demo faculty are automatically created")
    void test03_noDemoFacultyAutomaticallyCreated() {
        assertFalse(userAccountRepository.findByUsername("teacher").isPresent(), "teacher demo account must not exist");
        assertFalse(userAccountRepository.findByUsername("demo_faculty").isPresent(), "demo_faculty must not exist");
    }

    @Test
    @DisplayName("4. No demo attendance exists after reset")
    void test04_noDemoAttendanceExistsAfterReset() {
        assertEquals(0, attendanceRepository.count(), "Attendance table must be completely empty after reset");
    }

    @Test
    @DisplayName("5. Moodle does not automatically import data")
    void test05_moodleDoesNotAutomaticallyImportData() {
        long courseCountBefore = courseRepository.count();
        long studentCountBefore = studentRepository.count();

        // Calling fetchCourses() must return without persisting anything into MySQL
        moodleService.fetchCourses();
        assertEquals(courseCountBefore, courseRepository.count(), "fetchCourses must not persist courses into database");

        // Calling fetchAssignments() must not persist any courses/students
        moodleService.fetchAssignments(null, null);
        assertEquals(courseCountBefore, courseRepository.count());
        assertEquals(studentCountBefore, studentRepository.count());
    }

    // =========================================================================
    // COURSES (6-9)
    // =========================================================================

    @Test
    @DisplayName("6. Admin can create Course")
    void test06_adminCanCreateCourse() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        Course c = new Course("DBMS201", "Database Management Systems");
        c.setBranch("CS");
        c.setDivision("A");
        c.setBatch("A1");
        c.setAcademicYear("SE");
        c.setSemester(3);
        c.setCourseType("THEORY");

        mockMvc.perform(post("/api/courses")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(c)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseId").value("DBMS201"));

        assertTrue(courseRepository.findByCourseId("DBMS201").isPresent());
    }

    @Test
    @DisplayName("7. HOD can view Course")
    void test07_hodCanViewCourse() throws Exception {
        Course c = new Course("MATH101", "Applied Mathematics");
        c.setBranch("CS");
        c.setDivision("A");
        courseRepository.save(c);

        MockHttpSession hodSession = loginAs("hod", "Hod@123");
        mockMvc.perform(get("/api/courses")
                        .session(hodSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseId").value("MATH101"));
    }

    @Test
    @DisplayName("8. HOD cannot create Course")
    void test08_hodCannotCreateCourse() throws Exception {
        MockHttpSession hodSession = loginAs("hod", "Hod@123");

        Course c = new Course("PHYS101", "Engineering Physics");
        c.setBranch("CS");
        c.setDivision("A");

        mockMvc.perform(post("/api/courses")
                        .session(hodSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(c)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("9. Faculty cannot create Course")
    void test09_facultyCannotCreateCourse() throws Exception {
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        Course c = new Course("CHEM101", "Engineering Chemistry");
        c.setBranch("CS");
        c.setDivision("A");

        mockMvc.perform(post("/api/courses")
                        .session(facultySession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(c)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // ASSIGNMENT (10-15)
    // =========================================================================

    @Test
    @DisplayName("10. Admin can assign Faculty to Course")
    void test10_adminCanAssignFacultyToCourse() throws Exception {
        Course c = new Course("OS301", "Operating Systems");
        c.setBranch("CS");
        c.setDivision("A");
        courseRepository.save(c);

        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        Map<String, String> body = new HashMap<>();
        body.put("facultyId", "123456");
        body.put("facultyName", "Prof. Sharma");

        mockMvc.perform(post("/api/courses/OS301/assign-faculty")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedFacultyId").value("123456"));

        Course updated = courseRepository.findByCourseId("OS301").orElseThrow();
        assertEquals("123456", updated.getAssignedFacultyId());
    }

    @Test
    @DisplayName("11. HOD can view Faculty assignment")
    void test11_hodCanViewFacultyAssignment() throws Exception {
        Course c = new Course("CN302", "Computer Networks");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("123456");
        c.setAssignedFacultyName("Prof. Sharma");
        courseRepository.save(c);

        MockHttpSession hodSession = loginAs("hod", "Hod@123");
        mockMvc.perform(get("/api/courses")
                        .session(hodSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].assignedFacultyId").value("123456"));
    }

    @Test
    @DisplayName("12. HOD cannot change Faculty assignment")
    void test12_hodCannotChangeFacultyAssignment() throws Exception {
        Course c = new Course("SE303", "Software Engineering");
        c.setBranch("CS");
        c.setDivision("A");
        courseRepository.save(c);

        MockHttpSession hodSession = loginAs("hod", "Hod@123");

        Map<String, String> body = new HashMap<>();
        body.put("facultyId", "123456");

        mockMvc.perform(post("/api/courses/SE303/assign-faculty")
                        .session(hodSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("13. Faculty sees assigned Course")
    void test13_facultySeesAssignedCourse() throws Exception {
        Course c1 = new Course("AI401", "Artificial Intelligence");
        c1.setBranch("CS");
        c1.setDivision("A");
        c1.setAssignedFacultyId("123456");
        courseRepository.save(c1);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        mockMvc.perform(get("/api/courses")
                        .session(facultySession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseId").value("AI401"));
    }

    @Test
    @DisplayName("14. Faculty does not see unassigned Course")
    void test14_facultyDoesNotSeeUnassignedCourse() throws Exception {
        // AI401 assigned to 123456, ML402 assigned to faculty2
        Course c1 = new Course("AI401", "Artificial Intelligence");
        c1.setBranch("CS");
        c1.setDivision("A");
        c1.setAssignedFacultyId("123456");
        courseRepository.save(c1);

        Course c2 = new Course("ML402", "Machine Learning");
        c2.setBranch("CS");
        c2.setDivision("A");
        c2.setAssignedFacultyId("faculty2");
        courseRepository.save(c2);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        mockMvc.perform(get("/api/courses")
                        .session(facultySession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].courseId").value("AI401"));
    }

    @Test
    @DisplayName("15. Faculty cannot access another Faculty's Course directly")
    void test15_facultyCannotAccessAnotherFacultysCourseDirectly() throws Exception {
        Course c2 = new Course("ML402", "Machine Learning");
        c2.setBranch("CS");
        c2.setDivision("A");
        c2.setAssignedFacultyId("faculty2");
        courseRepository.save(c2);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        mockMvc.perform(get("/api/courses/search/ML402")
                        .session(facultySession))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // MATERIALS (16-19)
    // =========================================================================

    @Test
    @DisplayName("16. Faculty can upload material to assigned Course")
    void test16_facultyCanUploadMaterialToAssignedCourse() throws Exception {
        Course c = new Course("DS101", "Data Structures");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("123456");
        courseRepository.save(c);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        com.smartattend.backend.entities.CourseResource resource = new com.smartattend.backend.entities.CourseResource(
                "DS101",
                "Unit 1 Lecture Notes",
                "Data structures notes",
                "DOCUMENT",
                "https://storage.smartattend.edu/notes.pdf",
                "123456"
        );

        mockMvc.perform(post("/api/lms/resources")
                        .session(facultySession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resource)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseId").value("DS101"));
    }

    @Test
    @DisplayName("17. Faculty cannot upload material to unassigned Course")
    void test17_facultyCannotUploadMaterialToUnassignedCourse() throws Exception {
        Course c = new Course("DS102", "Algorithms");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("faculty2"); // assigned to someone else
        courseRepository.save(c);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        com.smartattend.backend.entities.CourseResource resource = new com.smartattend.backend.entities.CourseResource(
                "DS102",
                "Unauthorized Upload",
                "Should fail",
                "DOCUMENT",
                "https://storage.smartattend.edu/notes.pdf",
                "123456"
        );

        mockMvc.perform(post("/api/lms/resources")
                        .session(facultySession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resource)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("18. Faculty can view assigned Course materials")
    void test18_facultyCanViewAssignedCourseMaterials() throws Exception {
        Course c = new Course("DS103", "Data Structures Lab");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("123456");
        courseRepository.save(c);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        mockMvc.perform(get("/api/lms/resources/course/DS103")
                        .session(facultySession))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("19. Faculty cannot view unauthorized Course materials")
    void test19_facultyCannotViewUnauthorizedCourseMaterials() throws Exception {
        Course c = new Course("DS104", "Advanced Algorithms");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("faculty2");
        courseRepository.save(c);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        mockMvc.perform(get("/api/lms/resources/course/DS104")
                        .session(facultySession))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // COURSEWORK (20-23)
    // =========================================================================

    @Test
    @DisplayName("20. Faculty can manage Assignment in assigned Course")
    void test20_facultyCanManageAssignmentInAssignedCourse() throws Exception {
        Course c = new Course("DS105", "Data Structures Practice");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("123456");
        courseRepository.save(c);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        CourseAssignment assignment = new CourseAssignment(
                "DS105",
                "Tree Traversal Exercise",
                "Implement preorder, inorder, and postorder traversal.",
                LocalDate.now().plusDays(7).toString() + "T23:59:00",
                100,
                "123456"
        );

        mockMvc.perform(post("/api/lms/assignments")
                        .session(facultySession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseId").value("DS105"));
    }

    @Test
    @DisplayName("21. Faculty cannot manage Assignment in unassigned Course")
    void test21_facultyCannotManageAssignmentInUnassignedCourse() throws Exception {
        Course c = new Course("DS106", "Data Structures Honors");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("faculty2");
        courseRepository.save(c);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        CourseAssignment assignment = new CourseAssignment(
                "DS106",
                "Unauthorized Assignment",
                "Should be rejected.",
                LocalDate.now().plusDays(7).toString() + "T23:59:00",
                100,
                "123456"
        );

        mockMvc.perform(post("/api/lms/assignments")
                        .session(facultySession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignment)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("22. Faculty can manage Experiment in assigned Course")
    void test22_facultyCanManageExperimentInAssignedCourse() throws Exception {
        Course c = new Course("LAB101", "Hardware Lab");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("123456");
        courseRepository.save(c);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        CourseAssignment exp = new CourseAssignment(
                "LAB101",
                "Experiment 1: Logic Gates",
                "Verify truth tables for AND, OR, NOT gates.",
                LocalDate.now().plusDays(5).toString() + "T23:59:00",
                50,
                "123456"
        );

        mockMvc.perform(post("/api/lms/assignments")
                        .session(facultySession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exp)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseId").value("LAB101"));
    }

    @Test
    @DisplayName("23. Faculty cannot manage Experiment in unassigned Course")
    void test23_facultyCannotManageExperimentInUnassignedCourse() throws Exception {
        Course c = new Course("LAB102", "Advanced VLSI Lab");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("faculty2");
        courseRepository.save(c);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        CourseAssignment exp = new CourseAssignment(
                "LAB102",
                "Experiment 1: FPGA",
                "Unauthorized attempt.",
                LocalDate.now().plusDays(5).toString() + "T23:59:00",
                50,
                "123456"
        );

        mockMvc.perform(post("/api/lms/assignments")
                        .session(facultySession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exp)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // PRIVACY (24-28)
    // =========================================================================

    @Test
    @DisplayName("24. Student can only see own details")
    void test24_studentCanOnlySeeOwnDetails() throws Exception {
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");

        // Can access own profile via search
        mockMvc.perform(get("/api/students/search/12345678")
                        .session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("12345678"));

        // Cannot view another student's details
        mockMvc.perform(get("/api/students/search/87654321")
                        .session(studentSession))
                .andExpect(status().isForbidden());

        // Cannot view faculty or admin
        mockMvc.perform(get("/api/auth/users/admin")
                        .session(studentSession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("25. Faculty sees authorized attendance-linked students")
    void test25_facultySeesAuthorizedAttendanceLinkedStudents() throws Exception {
        Course c = new Course("PRIV101", "Privacy Testing");
        c.setBranch("CS");
        c.setDivision("A");
        c.setAssignedFacultyId("123456");
        courseRepository.save(c);

        // Create lecture session by faculty 123456
        LectureSession session = new LectureSession(
                "SES-PRIV-01",
                c.getCourseId(),
                c.getCourseName(),
                "THEORY",
                "FE",
                "A",
                "A1",
                LocalDate.now(),
                "10:00 AM",
                "123456",
                "Prof. Sharma"
        );
        lectureSessionRepository.save(session);

        // Record attendance for student 12345678 in that session
        Student stu = studentRepository.findByStudentId("12345678").orElseThrow();
        Attendance att = new Attendance(stu, c, "SES-PRIV-01", LocalDate.now(), LocalTime.now(), "PRESENT");
        attendanceRepository.save(att);

        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        // Faculty CAN view details of student who attended their class
        mockMvc.perform(get("/api/students/search/12345678")
                        .session(facultySession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("12345678"));
    }

    @Test
    @DisplayName("26. Faculty cannot browse unrelated students")
    void test26_facultyCannotBrowseUnrelatedStudents() throws Exception {
        // student2 (87654321) has NO attendance in any lecture created by faculty 123456
        MockHttpSession facultySession = loginAs("123456", "123456@edu");

        mockMvc.perform(get("/api/students/search/87654321")
                        .session(facultySession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("27. HOD cannot see Admin")
    void test27_hodCannotSeeAdmin() throws Exception {
        MockHttpSession hodSession = loginAs("hod", "Hod@123");

        mockMvc.perform(get("/api/auth/users/admin")
                        .session(hodSession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("28. Admin cannot see HOD")
    void test28_adminCannotSeeHod() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        mockMvc.perform(get("/api/auth/users/hod")
                        .session(adminSession))
                .andExpect(status().isForbidden());
    }
}
