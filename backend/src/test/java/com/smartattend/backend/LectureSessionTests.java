package com.smartattend.backend;

import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.LectureSession;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.LectureSessionRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.services.AttendanceService;
import com.smartattend.backend.services.LectureSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
class LectureSessionTests {

    @Autowired
    private LectureSessionService lectureSessionService;

    @Autowired
    private LectureSessionRepository lectureSessionRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private AttendanceService attendanceService;

    @BeforeEach
    void setUp() {
        attendanceRepository.deleteAll();
        lectureSessionRepository.deleteAll();
        courseRepository.deleteAll();
        studentRepository.deleteAll();

        // Seed courses
        Course dbms = new Course("CS201", "Database Management Systems", "Computer Science", "B", "B1", "SE", 3, "THEORY", "123456", "Prof. Sharma");
        courseRepository.save(dbms);

        Course math = new Course("MA101", "Applied Mathematics", "Computer Science", "A", "A1", "FE", 1, "THEORY", "999999", "Prof. Verma");
        courseRepository.save(math);

        Student s1 = new Student("12345678", "Student Test", "student.test@smartattend.edu", "Computer Science", "B", "SE", 3, "B1");
        studentRepository.save(s1);
    }

    @Test
    @DisplayName("Faculty can create lecture session for assigned course")
    void testFacultyCreatesSessionForAssignedCourse() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("THEORY");
        session.setDivision("B");
        session.setBatch("ALL");
        session.setSessionDate(LocalDate.now());
        session.setSessionTime("10:00 AM");

        LectureSession created = lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");
        assertNotNull(created.getId());
        assertNotNull(created.getSessionCode());
        assertTrue(created.getSessionCode().startsWith("SES_CS201"));
        assertEquals("123456", created.getFacultyId());
        assertEquals("Database Management Systems", created.getCourseName());
    }

    @Test
    @DisplayName("Faculty cannot create lecture session for unassigned course")
    void testFacultyCannotCreateSessionForUnassignedCourse() {
        LectureSession session = new LectureSession();
        session.setCourseId("MA101"); // assigned to 999999, not 123456
        session.setLectureType("THEORY");

        assertThrows(AccessDeniedException.class, () -> {
            lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");
        });
    }

    @Test
    @DisplayName("Admin is permitted to create lecture sessions, while HOD and Student are prohibited")
    void testAdminCanCreateSessionWhileHodAndStudentCannot() {
        LectureSession sessionAdmin = new LectureSession();
        sessionAdmin.setCourseId("MA101");
        sessionAdmin.setLectureType("THEORY");
        sessionAdmin.setDivision("A");
        sessionAdmin.setBatch("ALL");

        LectureSession createdAdminSession = lectureSessionService.createLectureSession(sessionAdmin, "admin", "ROLE_ADMIN");
        assertNotNull(createdAdminSession);
        assertEquals("MA101", createdAdminSession.getCourseId());

        LectureSession sessionHod = new LectureSession();
        sessionHod.setCourseId("CS201");
        sessionHod.setLectureType("LAB");

        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> {
            lectureSessionService.createLectureSession(sessionHod, "hod", "ROLE_HOD");
        });

        LectureSession sessionStudent = new LectureSession();
        sessionStudent.setCourseId("CS201");
        sessionStudent.setLectureType("THEORY");

        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> {
            lectureSessionService.createLectureSession(sessionStudent, "12345678", "ROLE_STUDENT");
        });
    }

    @Test
    @DisplayName("Attendance record links correctly to class session code")
    void testAttendanceLinksToSessionCode() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("THEORY");
        session.setDivision("B");
        session.setBatch("ALL");
        LectureSession created = lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");

        Course course = courseRepository.findByCourseId("CS201").orElseThrow();
        Student student = studentRepository.findByStudentId("12345678").orElseThrow();

        Attendance attendance = new Attendance(student, course, created.getSessionCode(), LocalDate.now(), LocalTime.now(), "PRESENT");
        attendanceRepository.save(attendance);

        List<Attendance> attendees = lectureSessionService.getAttendanceForSession(created.getSessionCode());
        assertEquals(1, attendees.size());
        assertEquals("12345678", attendees.get(0).getStudent().getStudentId());

        // Verify session metric reflects attendee count
        LectureSession fetched = lectureSessionService.getSessionByCode(created.getSessionCode()).orElseThrow();
        assertEquals(1, fetched.getAttendanceCount());
    }

    @Test
    @DisplayName("Invalid lecture type is rejected with IllegalArgumentException")
    void testInvalidLectureTypeRejected() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("WORKSHOP");
        session.setDivision("B");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");
        });
        assertTrue(ex.getMessage().contains("Invalid lecture type"));
    }

    @Test
    @DisplayName("Invalid division is rejected with IllegalArgumentException")
    void testInvalidDivisionRejected() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("THEORY");
        session.setDivision("X");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");
        });
        assertTrue(ex.getMessage().contains("Invalid division"));
    }

    @Test
    @DisplayName("Invalid batch combination is rejected with IllegalArgumentException")
    void testInvalidBatchCombinationRejected() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("LAB");
        session.setDivision("A");
        session.setBatch("B1"); // B1 does not belong to Div A

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");
        });
        assertTrue(ex.getMessage().contains("does not belong to Division"));
    }

    @Test
    @DisplayName("Faculty can delete their own scheduled class session")
    void testFacultyCanDeleteOwnSession() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("THEORY");
        session.setDivision("B");
        session.setBatch("ALL");
        LectureSession created = lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");
        assertNotNull(created.getId());

        lectureSessionService.deleteSession(created.getId(), "123456", "ROLE_FACULTY");
        assertTrue(lectureSessionService.getSessionByCode(created.getSessionCode()).isEmpty());
    }

    @Test
    @DisplayName("Faculty cannot delete another faculty member's session")
    void testFacultyCannotDeleteOtherFacultySession() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("THEORY");
        session.setDivision("B");
        session.setBatch("ALL");
        LectureSession created = lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");
        assertNotNull(created.getId());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> {
            lectureSessionService.deleteSession(created.getId(), "other_faculty", "ROLE_FACULTY");
        });
        assertTrue(ex.getMessage().contains("Faculty can only delete class sessions they themselves created"));
    }

    @Test
    @DisplayName("Student and HOD cannot delete class sessions")
    void testStudentAndHodCannotDeleteSession() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("THEORY");
        session.setDivision("B");
        session.setBatch("ALL");
        LectureSession created = lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");

        assertThrows(AccessDeniedException.class, () -> {
            lectureSessionService.deleteSession(created.getId(), "12345678", "ROLE_STUDENT");
        });

        assertThrows(AccessDeniedException.class, () -> {
            lectureSessionService.deleteSession(created.getId(), "hod", "ROLE_HOD");
        });
    }

    @Test
    @DisplayName("Admin can delete any class session and cascade attendance records")
    void testAdminCanDeleteAnySessionAndCascadeAttendance() {
        LectureSession session = new LectureSession();
        session.setCourseId("CS201");
        session.setLectureType("THEORY");
        session.setDivision("B");
        session.setBatch("ALL");
        LectureSession created = lectureSessionService.createLectureSession(session, "123456", "ROLE_FACULTY");

        Course course = courseRepository.findByCourseId("CS201").orElseThrow();
        Student student = studentRepository.findByStudentId("12345678").orElseThrow();
        Attendance att = new Attendance(student, course, created.getSessionCode(), LocalDate.now(), LocalTime.now(), "PRESENT");
        attendanceRepository.save(att);

        assertEquals(1, attendanceRepository.findBySessionCode(created.getSessionCode()).size());

        lectureSessionService.deleteSession(created.getId(), "admin", "ROLE_ADMIN");

        assertTrue(lectureSessionService.getSessionByCode(created.getSessionCode()).isEmpty());
        assertEquals(0, attendanceRepository.findBySessionCode(created.getSessionCode()).size());
    }
}
