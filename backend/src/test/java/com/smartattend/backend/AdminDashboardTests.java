package com.smartattend.backend;

import com.smartattend.backend.dtos.AdminOverviewDto;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.AttendanceQrToken;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.repositories.AttendanceQrTokenRepository;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.services.AttendanceService;
import com.smartattend.backend.services.CourseService;
import com.smartattend.backend.services.StudentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
class AdminDashboardTests {

    @Autowired
    private StudentService studentService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private AttendanceQrTokenRepository qrTokenRepository;

    @BeforeEach
    void setUp() {
        attendanceRepository.deleteAll();
        qrTokenRepository.deleteAll();
        studentRepository.deleteAll();
        courseRepository.deleteAll();
    }

    @Test
    @DisplayName("Admin Overview identifies overall attendance and defaulters correctly")
    void testAdminOverviewAndDefaulters() {
        // Register students
        Student alice = studentService.createStudent(new Student("10000001", "Alice Smith", "alice@example.com"));
        Student bob = studentService.createStudent(new Student("10000002", "Bob Jones", "bob@example.com"));

        // Register courses
        Course cs101 = courseService.createCourse(new Course("CS101", "Computer Science 101"));

        // Session 1: Alice Present, Bob Absent (Bob has 0 attendance)
        Attendance att1 = new Attendance();
        att1.setStudent(alice);
        att1.setCourse(cs101);
        att1.setAttendanceDate(LocalDate.now());
        att1.setAttendanceTime(LocalTime.now());
        att1.setAttendanceStatus("PRESENT");
        att1.setMoodleSynced(false);
        attendanceRepository.save(att1);

        // Session 2: Alice Present
        Attendance att2 = new Attendance();
        att2.setStudent(alice);
        att2.setCourse(cs101);
        att2.setAttendanceDate(LocalDate.now().minusDays(1));
        att2.setAttendanceTime(LocalTime.now());
        att2.setAttendanceStatus("PRESENT");
        att2.setMoodleSynced(false);
        attendanceRepository.save(att2);

        AdminOverviewDto overview = attendanceService.getAdminOverview();

        assertNotNull(overview);
        assertEquals(2, overview.getTotalStudents());
        assertEquals(1, overview.getTotalCourses());
        assertEquals(2, overview.getTotalAttendanceRecords());
        assertEquals(2, overview.getTotalConductedSessions());

        // Alice attended 2/2 (100%), Bob attended 0/2 (0%)
        // Total possible = 2 students * 2 sessions = 4. Attended = 2. Overall = 50.0%
        assertEquals(50.0, overview.getOverallAttendancePercentage(), 0.1);

        // Bob has 0% (< 75%), so Bob must be in the defaulters list
        assertEquals(1, overview.getDefaultersCount());
        assertEquals("10000002", overview.getDefaulters().get(0).getStudentId());
        assertEquals(0.0, overview.getDefaulters().get(0).getOverallPercentage(), 0.1);
    }

    @Test
    @DisplayName("Deleting a student cascades to remove linked attendance records safely")
    void testDeleteStudentCascade() {
        Student charlie = studentService.createStudent(new Student("10000003", "Charlie Brown", "charlie@example.com"));
        Course math101 = courseService.createCourse(new Course("MATH101", "Calculus I"));

        Attendance att = new Attendance();
        att.setStudent(charlie);
        att.setCourse(math101);
        att.setAttendanceDate(LocalDate.now());
        att.setAttendanceTime(LocalTime.now());
        att.setAttendanceStatus("PRESENT");
        att.setMoodleSynced(false);
        attendanceRepository.save(att);

        assertEquals(1, attendanceRepository.count());
        assertEquals(1, studentRepository.count());

        // Delete student
        studentService.deleteStudent(charlie.getId());

        assertEquals(0, studentRepository.count());
        assertEquals(0, attendanceRepository.count());
    }

    @Test
    @DisplayName("Deleting a course cascades to remove attendance records and QR tokens")
    void testDeleteCourseCascade() {
        Student dana = studentService.createStudent(new Student("10000004", "Dana White", "dana@example.com"));
        Course phy101 = courseService.createCourse(new Course("PHY101", "Physics I"));

        Attendance att = new Attendance();
        att.setStudent(dana);
        att.setCourse(phy101);
        att.setAttendanceDate(LocalDate.now());
        att.setAttendanceTime(LocalTime.now());
        att.setAttendanceStatus("PRESENT");
        att.setMoodleSynced(false);
        attendanceRepository.save(att);

        AttendanceQrToken qrToken = new AttendanceQrToken(
                "token-abc-123",
                "PHY101",
                Instant.now(),
                Instant.now().plus(5, ChronoUnit.SECONDS)
        );
        qrTokenRepository.save(qrToken);

        assertEquals(1, courseRepository.count());
        assertEquals(1, attendanceRepository.count());
        assertEquals(1, qrTokenRepository.count());

        // Delete course
        courseService.deleteCourse(phy101.getId());

        assertEquals(0, courseRepository.count());
        assertEquals(0, attendanceRepository.count());
        assertEquals(0, qrTokenRepository.count());
    }
}
