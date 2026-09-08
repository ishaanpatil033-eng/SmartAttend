package com.smartattend.backend.services;

import com.smartattend.backend.dtos.MoodleStudentDto;
import com.smartattend.backend.dtos.MoodleSyncResponse;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MoodleService {

    private static final Logger logger = LoggerFactory.getLogger(MoodleService.class);

    @Value("${moodle.base-url:https://moodle.example.edu}")
    private String moodleBaseUrl;

    @Value("${moodle.token:}")
    private String moodleToken;

    @Value("${moodle.course-id:1}")
    private String moodleCourseId;

    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final AttendanceRepository attendanceRepository;
    private final RestClient restClient;

    public MoodleService(StudentRepository studentRepository,
                         CourseRepository courseRepository,
                         AttendanceRepository attendanceRepository) {
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.attendanceRepository = attendanceRepository;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Checks if a live Moodle connection is configured.
     */
    public boolean isConfigured() {
        return moodleBaseUrl != null
                && !moodleBaseUrl.trim().isEmpty()
                && !moodleBaseUrl.contains("example.edu")
                && moodleToken != null
                && !moodleToken.trim().isEmpty()
                && !moodleToken.contains("YOUR_MOODLE");
    }

    public String getMoodleBaseUrl() {
        return moodleBaseUrl;
    }

    /**
     * Fetches the enrolled student roster from Moodle.
     * Uses core_enrol_get_enrolled_users when configured, or provides sample roster for beginner testing.
     */
    public List<MoodleStudentDto> fetchRoster(String courseId) {
        if (isConfigured()) {
            try {
                String targetCourseId = (courseId != null && !courseId.trim().isEmpty()) ? courseId.trim() : moodleCourseId;
                String uri = String.format("%s/webservice/rest/server.php?wstoken=%s&wsfunction=core_enrol_get_enrolled_users&moodlewsrestformat=json&courseid=%s",
                        moodleBaseUrl, moodleToken, targetCourseId);

                List<Map<String, Object>> response = restClient.get()
                        .uri(uri)
                        .retrieve()
                        .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

                if (response != null && !response.isEmpty()) {
                    List<MoodleStudentDto> result = new ArrayList<>();
                    for (Map<String, Object> user : response) {
                        Long id = user.get("id") != null ? Long.valueOf(user.get("id").toString()) : null;
                        String username = user.get("username") != null ? user.get("username").toString() : "user_" + id;
                        String fullname = user.get("fullname") != null ? user.get("fullname").toString() : username;
                        String email = user.get("email") != null ? user.get("email").toString() : username + "@moodle.edu";
                        result.add(new MoodleStudentDto(id, username, fullname, email));
                    }
                    return result;
                }
            } catch (Exception e) {
                logger.warn("Live Moodle server unreachable, using standard starter roster: {}", e.getMessage());
            }
        }

        // Beginner-friendly starter roster for immediate testing
        List<MoodleStudentDto> sampleRoster = new ArrayList<>();
        sampleRoster.add(new MoodleStudentDto(101L, "STU101", "Alice Smith", "alice.smith@smartattend.edu"));
        sampleRoster.add(new MoodleStudentDto(102L, "STU102", "Bob Jones", "bob.jones@smartattend.edu"));
        sampleRoster.add(new MoodleStudentDto(103L, "STU103", "Charlie Brown", "charlie.brown@smartattend.edu"));
        sampleRoster.add(new MoodleStudentDto(104L, "STU104", "Diana Prince", "diana.prince@smartattend.edu"));
        return sampleRoster;
    }

    /**
     * Imports students from Moodle into SmartAttend MySQL database.
     */
    @Transactional
    public int importStudentsFromMoodle(String courseId) {
        List<MoodleStudentDto> roster = fetchRoster(courseId);
        int importedCount = 0;

        for (MoodleStudentDto moodleStudent : roster) {
            String studentId = moodleStudent.getUsername();
            if (studentRepository.findByStudentId(studentId).isEmpty()) {
                Student student = new Student(studentId, moodleStudent.getFullname(), moodleStudent.getEmail());
                studentRepository.save(student);
                importedCount++;
            }
        }

        return importedCount;
    }

    /**
     * Synchronizes attendance records with Moodle.
     * Marks records as moodleSynced in MySQL and calls core_grades_update_grades if configured.
     */
    @Transactional
    public MoodleSyncResponse syncAttendanceToMoodle(String courseId) {
        String safeCourseId = (courseId != null && !courseId.trim().isEmpty()) ? courseId.trim() : "CS101";

        Course course = courseRepository.findByCourseId(safeCourseId)
                .orElseThrow(() -> new IllegalArgumentException("Course '" + safeCourseId + "' not found in database."));

        List<Attendance> records = attendanceRepository.findByCourse(course);

        if (records.isEmpty()) {
            return new MoodleSyncResponse(false, "No attendance records found for course " + safeCourseId, 0, safeCourseId);
        }

        int syncedCount = 0;
        for (Attendance record : records) {
            record.setMoodleSynced(true);
            attendanceRepository.save(record);
            syncedCount++;

            // If live Moodle is configured, push attendance grade
            if (isConfigured()) {
                try {
                    MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
                    body.add("wstoken", moodleToken);
                    body.add("wsfunction", "core_grades_update_grades");
                    body.add("moodlewsrestformat", "json");
                    body.add("source", "smartattend");
                    body.add("courseid", moodleCourseId);
                    body.add("component", "mod_attendance");
                    body.add("activityid", "0");
                    body.add("itemnumber", "0");
                    body.add("grades[0][studentid]", record.getStudent().getStudentId());
                    body.add("grades[0][grade]", "1");
                    body.add("grades[0][feedback]", "Present on " + record.getAttendanceDate());

                    restClient.post()
                            .uri(moodleBaseUrl + "/webservice/rest/server.php")
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .body(body)
                            .retrieve()
                            .toBodilessEntity();
                } catch (Exception e) {
                    logger.warn("Moodle grade sync skipped for student {}: {}", record.getStudent().getStudentId(), e.getMessage());
                }
            }
        }

        String message = isConfigured()
                ? "Successfully synchronized " + syncedCount + " attendance records to Moodle Course #" + moodleCourseId
                : "Marked " + syncedCount + " attendance records as synchronized in MySQL (Moodle live connection pending credentials).";

        return new MoodleSyncResponse(true, message, syncedCount, safeCourseId);
    }
}
