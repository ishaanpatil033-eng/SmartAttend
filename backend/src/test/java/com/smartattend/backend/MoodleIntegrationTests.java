package com.smartattend.backend;

import com.smartattend.backend.dtos.MoodleCourseDto;
import com.smartattend.backend.dtos.MoodleStudentDto;
import com.smartattend.backend.dtos.MoodleSyncResponse;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.services.CourseService;
import com.smartattend.backend.services.MoodleService;
import com.smartattend.backend.services.StudentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
class MoodleIntegrationTests {

    @Autowired
    private MoodleService moodleService;

    @Autowired
    private StudentService studentService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @BeforeEach
    void setUp() {
        attendanceRepository.deleteAll();
        studentRepository.deleteAll();
        courseRepository.deleteAll();
    }

    @Test
    @DisplayName("Moodle connection status diagnostic returns structured metadata")
    void testConnectionStatus() {
        Map<String, Object> status = moodleService.testConnection();
        assertNotNull(status);
        assertTrue(status.containsKey("configured"));
        assertTrue(status.containsKey("baseUrl"));
        assertTrue(status.containsKey("liveConnection"));
        assertTrue(status.containsKey("message"));
    }

    @Test
    @DisplayName("Fetch Moodle courses and roster returns valid entries without hardcoded fake students")
    void testFetchCoursesAndRosterNoFakeStudents() {
        List<MoodleCourseDto> courses = moodleService.fetchCourses();
        assertNotNull(courses);

        List<MoodleStudentDto> roster = moodleService.fetchRoster("CS101");
        assertNotNull(roster);
        // Verify fake hardcoded students are NEVER returned
        assertFalse(roster.stream().anyMatch(s -> "Alice Smith".equalsIgnoreCase(s.getFullname())));
        assertFalse(roster.stream().anyMatch(s -> "Bob Jones".equalsIgnoreCase(s.getFullname())));
        assertFalse(roster.stream().anyMatch(s -> "Charlie Brown".equalsIgnoreCase(s.getFullname())));
        assertFalse(roster.stream().anyMatch(s -> "Diana Prince".equalsIgnoreCase(s.getFullname())));

        // Fetching roster must never write to MySQL
        assertEquals(0, studentRepository.count(), "Fetching roster must never write students to MySQL");
    }

    @Test
    @DisplayName("Roster fetching does not write to MySQL and only explicit import can persist")
    void testFetchDoesNotPersistOnlyExplicitImport() {
        assertEquals(0, studentRepository.count());

        // Calling fetchRoster does not write to MySQL
        List<MoodleStudentDto> roster = moodleService.fetchRoster("CS101");
        assertEquals(0, studentRepository.count());

        // Calling importStudentsFromMoodle
        int imported = moodleService.importStudentsFromMoodle("CS101");
        assertEquals(imported, studentRepository.count());
        // Verify no fake students were created
        assertFalse(studentRepository.findByStudentId("STU101").isPresent());
        assertFalse(studentRepository.findByStudentId("STU104").isPresent());
    }

    @Test
    @DisplayName("Syncing attendance marks MySQL records as moodleSynced without creating students")
    void testSyncAttendanceToMoodleDoesNotCreateStudents() {
        Student student = studentService.createStudent(new Student("30000001", "Moodle Test Student", "moodle.test@example.com"));
        Course course = courseService.createCourse(new Course("CS101", "Intro to CS"));

        Attendance record = new Attendance();
        record.setStudent(student);
        record.setCourse(course);
        record.setAttendanceDate(LocalDate.now());
        record.setAttendanceTime(LocalTime.of(9, 30));
        record.setAttendanceStatus("PRESENT");
        record.setMoodleSynced(false);
        attendanceRepository.save(record);

        assertEquals(1, attendanceRepository.count());
        long studentCountBefore = studentRepository.count();

        MoodleSyncResponse syncResponse = moodleService.syncAttendanceToMoodle("CS101");
        assertTrue(syncResponse.isSuccess());
        assertEquals(1, syncResponse.getRecordsSynced());

        // Verify in MySQL
        Attendance updatedRecord = attendanceRepository.findAll().get(0);
        assertTrue(updatedRecord.isMoodleSynced());

        // Verify sync did not create any new students
        assertEquals(studentCountBefore, studentRepository.count(), "Attendance sync must not create students");
    }
}
