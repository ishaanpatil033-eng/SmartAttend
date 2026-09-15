package com.smartattend.backend;

import com.smartattend.backend.dtos.HodOverviewDto;
import com.smartattend.backend.entities.Attendance;
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

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
class HodDashboardTests {

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
    @DisplayName("HOD Overview calculates department KPIs, student-wise attendance, and identifies defaulters")
    void testHodOverviewCalculations() {
        // Register students
        Student student1 = studentService.createStudent(new Student("20000001", "Emma Watson", "emma@example.com"));
        Student student2 = studentService.createStudent(new Student("20000002", "Daniel Radcliffe", "daniel@example.com"));
        Student student3 = studentService.createStudent(new Student("20000003", "Rupert Grint", "rupert@example.com"));

        // Register department courses
        Course cs301 = courseService.createCourse(new Course("CS301", "Operating Systems"));
        Course cs302 = courseService.createCourse(new Course("CS302", "Database Management Systems"));

        // Session 1 for CS301: All 3 students attend
        LocalDate date1 = LocalDate.now().minusDays(2);
        saveAttendance(student1, cs301, date1);
        saveAttendance(student2, cs301, date1);
        saveAttendance(student3, cs301, date1);

        // Session 2 for CS301: Only Emma and Daniel attend
        LocalDate date2 = LocalDate.now().minusDays(1);
        saveAttendance(student1, cs301, date2);
        saveAttendance(student2, cs301, date2);

        // Session 1 for CS302: Only Emma attends
        LocalDate date3 = LocalDate.now();
        saveAttendance(student1, cs302, date3);

        HodOverviewDto overview = attendanceService.getHodOverview();

        assertNotNull(overview);
        assertNotNull(overview.getDepartmentName());
        assertEquals(3, overview.getTotalStudents());
        assertEquals(2, overview.getTotalCourses());
        assertEquals(6, overview.getTotalAttendanceRecords());
        // Total conducted sessions = 2 dates for CS301 + 1 date for CS302 = 3
        assertEquals(3, overview.getTotalConductedSessions());

        // Check Course Summaries
        assertEquals(2, overview.getCourseSummaries().size());

        // Check Student Attendance List (all 3 students present)
        assertEquals(3, overview.getStudentAttendanceList().size());

        // Emma attended 3 out of 3 sessions = 100% -> Not low
        var emmaStat = overview.getStudentAttendanceList().stream()
                .filter(s -> s.getStudentId().equals("20000001"))
                .findFirst()
                .orElse(null);
        assertNotNull(emmaStat);
        assertEquals(3, emmaStat.getTotalAttended());
        assertEquals(100.0, emmaStat.getOverallPercentage(), 0.1);
        assertFalse(emmaStat.isLowAttendance());

        // Daniel attended 2 out of 3 sessions = 66.7% -> < 75% so flagged as lowAttendance
        var danielStat = overview.getStudentAttendanceList().stream()
                .filter(s -> s.getStudentId().equals("20000002"))
                .findFirst()
                .orElse(null);
        assertNotNull(danielStat);
        assertEquals(2, danielStat.getTotalAttended());
        assertEquals(66.7, danielStat.getOverallPercentage(), 0.1);
        assertTrue(danielStat.isLowAttendance());

        // Rupert attended 1 out of 3 sessions = 33.3% -> < 75% so flagged as lowAttendance
        var rupertStat = overview.getStudentAttendanceList().stream()
                .filter(s -> s.getStudentId().equals("20000003"))
                .findFirst()
                .orElse(null);
        assertNotNull(rupertStat);
        assertEquals(1, rupertStat.getTotalAttended());
        assertEquals(33.3, rupertStat.getOverallPercentage(), 0.1);
        assertTrue(rupertStat.isLowAttendance());

        // Defaulters count should be 2 (Daniel & Rupert)
        assertEquals(2, overview.getDefaultersCount());
        assertEquals(2, overview.getDefaulters().size());

        // Overall department attendance is the average of (100.0 + 66.7 + 33.3) / 3 = 66.7%
        assertEquals(66.7, overview.getOverallDepartmentAttendancePercentage(), 0.2);
    }

    private void saveAttendance(Student student, Course course, LocalDate date) {
        Attendance att = new Attendance();
        att.setStudent(student);
        att.setCourse(course);
        att.setAttendanceDate(date);
        att.setAttendanceTime(LocalTime.of(10, 0));
        att.setAttendanceStatus("PRESENT");
        att.setMoodleSynced(false);
        attendanceRepository.save(att);
    }
}
