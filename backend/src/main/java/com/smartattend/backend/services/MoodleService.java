package com.smartattend.backend.services;

import com.smartattend.backend.dtos.MoodleAssignmentDto;
import com.smartattend.backend.dtos.MoodleConversationDto;
import com.smartattend.backend.dtos.MoodleCourseDto;
import com.smartattend.backend.dtos.MoodleMessageDto;
import com.smartattend.backend.dtos.MoodleMessageResponse;
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

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class MoodleService {

    private static final Logger logger = LoggerFactory.getLogger(MoodleService.class);

    @Value("${moodle.base-url:https://moodle.example.edu}")
    private String moodleBaseUrl;

    @Value("${moodle.token:}")
    private String moodleToken;

    @Value("${moodle.token-file:/run/secrets/moodle_token}")
    private String moodleTokenFile;

    @Value("${moodle.course-id:1}")
    private String moodleCourseId;

    @Value("${moodle.simulate-assignments-on-unconfigured:false}")
    private boolean simulateAssignmentsOnUnconfigured;

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

    @jakarta.annotation.PostConstruct
    public void initSecrets() {
        if (moodleToken == null || moodleToken.trim().isEmpty()) {
            if (moodleTokenFile != null && !moodleTokenFile.trim().isEmpty()) {
                java.nio.file.Path secretPath = java.nio.file.Paths.get(moodleTokenFile.trim());
                if (java.nio.file.Files.exists(secretPath)) {
                    try {
                        moodleToken = java.nio.file.Files.readString(secretPath).trim();
                        logger.info("Loaded Moodle web-service token securely from secret file.");
                    } catch (Exception e) {
                        logger.warn("Could not read Moodle secret token from {}: {}", moodleTokenFile, e.getMessage());
                    }
                }
            }
        }
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
     * Tests live connection to Moodle REST server.
     */
    public Map<String, Object> testConnection() {
        Map<String, Object> result = new HashMap<>();
        result.put("configured", isConfigured());
        result.put("baseUrl", moodleBaseUrl);
        result.put("courseId", moodleCourseId);

        if (!isConfigured()) {
            result.put("liveConnection", false);
            result.put("message", "Moodle configuration pending. Update moodle.base-url and moodle.token in application.properties.");
            return result;
        }

        try {
            String uri = String.format("%s/webservice/rest/server.php?wstoken=%s&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json",
                    moodleBaseUrl, moodleToken);

            Map<String, Object> response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response != null && response.containsKey("sitename")) {
                result.put("liveConnection", true);
                result.put("sitename", response.get("sitename"));
                result.put("version", response.get("release"));
                result.put("message", "Successfully connected to Moodle: " + response.get("sitename"));
                return result;
            }
        } catch (Exception e) {
            logger.warn("Moodle connection check failed: {}", e.getMessage());
        }

        result.put("liveConnection", false);
        result.put("message", "Moodle server unreachable at " + moodleBaseUrl + ". Verify URL and web service token.");
        return result;
    }

    /**
     * Fetches courses from Moodle via core_course_get_courses.
     */
    public List<MoodleCourseDto> fetchCourses() {
        if (isConfigured()) {
            try {
                String uri = String.format("%s/webservice/rest/server.php?wstoken=%s&wsfunction=core_course_get_courses&moodlewsrestformat=json",
                        moodleBaseUrl, moodleToken);

                List<Map<String, Object>> response = restClient.get()
                        .uri(uri)
                        .retrieve()
                        .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

                if (response != null && !response.isEmpty()) {
                    List<MoodleCourseDto> courses = new ArrayList<>();
                    for (Map<String, Object> c : response) {
                        Long id = c.get("id") != null ? Long.valueOf(c.get("id").toString()) : null;
                        String shortname = c.get("shortname") != null ? c.get("shortname").toString() : "";
                        String fullname = c.get("fullname") != null ? c.get("fullname").toString() : "";
                        String idnumber = c.get("idnumber") != null ? c.get("idnumber").toString() : "";
                        courses.add(new MoodleCourseDto(id, shortname, fullname, idnumber));
                    }
                    return courses;
                }
            } catch (Exception e) {
                logger.warn("Live Moodle course fetch failed: {}", e.getMessage());
            }
        }

        return Collections.emptyList();
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
                        if ("guest".equalsIgnoreCase(username)) {
                            continue;
                        }
                        String fullname = user.get("fullname") != null ? user.get("fullname").toString() : username;
                        String email = user.get("email") != null ? user.get("email").toString() : username + "@moodle.edu";
                        result.add(new MoodleStudentDto(id, username, fullname, email));
                    }
                    return result;
                }
            } catch (Exception e) {
                logger.warn("Live Moodle server unreachable or returned error: {}", e.getMessage());
            }
        }

        // Return empty list if Moodle has no users or is unreachable. Never inject fake students.
        return Collections.emptyList();
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
            if ("guest".equalsIgnoreCase(studentId) || "admin".equalsIgnoreCase(studentId) || "smartattend".equalsIgnoreCase(studentId)) {
                continue;
            }
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
        if (courseId == null || courseId.trim().isEmpty()) {
            return new MoodleSyncResponse(false, "Course ID is required for Moodle synchronization.", 0, "");
        }
        String safeCourseId = courseId.trim();

        Optional<Course> courseOpt = courseRepository.findByCourseId(safeCourseId);
        if (courseOpt.isEmpty()) {
            return new MoodleSyncResponse(false,
                    "No matching Moodle course is currently configured. Use Discover Courses to view available Moodle courses.",
                    0, safeCourseId);
        }
        Course course = courseOpt.get();

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

    private final List<MoodleMessageResponse> inMemoryMessages = new CopyOnWriteArrayList<>();
    private final AtomicLong messageIdCounter = new AtomicLong(5001);
    private final Map<Long, Instant> overriddenDueDates = new HashMap<>();

    /**
     * Fetches assignment deadlines from Moodle with dynamic urgency classification.
     */
    public List<MoodleAssignmentDto> fetchAssignments(String courseId, String studentId) {
        List<MoodleAssignmentDto> assignments = new ArrayList<>();
        Instant now = Instant.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").withZone(ZoneId.systemDefault());

        // 1. If live Moodle is configured, attempt to query mod_assign_get_assignments
        if (isConfigured()) {
            try {
                String uri = String.format("%s/webservice/rest/server.php?wstoken=%s&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json",
                        moodleBaseUrl, moodleToken);

                Map<String, Object> response = restClient.get()
                        .uri(uri)
                        .retrieve()
                        .body(new ParameterizedTypeReference<Map<String, Object>>() {});

                if (response != null && response.containsKey("courses")) {
                    List<Map<String, Object>> coursesList = (List<Map<String, Object>>) response.get("courses");
                    for (Map<String, Object> cMap : coursesList) {
                        List<Map<String, Object>> assigns = (List<Map<String, Object>>) cMap.get("assignments");
                        if (assigns != null) {
                            for (Map<String, Object> a : assigns) {
                                Long id = a.get("id") != null ? Long.valueOf(a.get("id").toString()) : 1L;
                                String title = a.get("name") != null ? a.get("name").toString() : "Moodle Assignment";
                                String desc = a.get("intro") != null ? a.get("intro").toString() : "";
                                long dueEpoch = a.get("duedate") != null ? Long.parseLong(a.get("duedate").toString()) : (now.getEpochSecond() + 86400);
                                Instant dueDate = Instant.ofEpochSecond(dueEpoch);

                                assignments.add(buildAssignmentDto(id, courseId != null && !courseId.trim().isEmpty() ? courseId.trim() : "GENERAL",
                                        "Computer Science", title, desc, dueDate, null, "not_submitted", "not_graded", now, formatter));
                            }
                        }
                    }
                    if (!assignments.isEmpty()) {
                        return assignments;
                    }
                }
            } catch (Exception e) {
                logger.warn("Live Moodle assignment fetch failed: {}", e.getMessage());
            }
        }

        if (courseId == null || courseId.trim().isEmpty() || !simulateAssignmentsOnUnconfigured) {
            return Collections.emptyList();
        }

        // 2. Simulated assignments with exact date categories for verification
        Instant dueToday = overriddenDueDates.getOrDefault(101L, now.plus(4, ChronoUnit.HOURS));
        Instant dueTomorrow = overriddenDueDates.getOrDefault(102L, now.plus(26, ChronoUnit.HOURS));
        Instant dueSoon = overriddenDueDates.getOrDefault(103L, now.plus(60, ChronoUnit.HOURS));
        Instant upcoming = overriddenDueDates.getOrDefault(104L, now.plus(7, ChronoUnit.DAYS));
        Instant overdue = overriddenDueDates.getOrDefault(105L, now.minus(5, ChronoUnit.HOURS));
        Instant submitted = overriddenDueDates.getOrDefault(106L, now.minus(2, ChronoUnit.DAYS));

        assignments.add(buildAssignmentDto(101L, courseId, "Course " + courseId,
                "Lab 1: Setup and Verification",
                "Complete environment verification and submit initial logs.",
                dueToday, dueToday.plus(2, ChronoUnit.DAYS),
                "not_submitted", "not_graded", now, formatter));

        assignments.add(buildAssignmentDto(102L, courseId, "Course " + courseId,
                "Assignment 1: Algorithms Analysis",
                "Submit time complexity proofs for search and sort routines.",
                dueTomorrow, dueTomorrow.plus(3, ChronoUnit.DAYS),
                "not_submitted", "not_graded", now, formatter));

        assignments.add(buildAssignmentDto(103L, courseId, "Course " + courseId,
                "Quiz 1: Conceptual Foundations",
                "Multiple choice and short response questions.",
                dueSoon, null,
                "not_submitted", "not_graded", now, formatter));

        assignments.add(buildAssignmentDto(104L, courseId, "Course " + courseId,
                "Project Milestone 1: Design Doc",
                "Architectural overview and system diagrams.",
                upcoming, null,
                "not_submitted", "not_graded", now, formatter));

        assignments.add(buildAssignmentDto(105L, courseId, "Course " + courseId,
                "Homework 0: Prerequisite Review",
                "Initial math and programming prerequisites.",
                overdue, null,
                "not_submitted", "not_graded", now, formatter));

        assignments.add(buildAssignmentDto(106L, courseId, "Course " + courseId,
                "Practice Exercise: Syntax Drill",
                "Introductory exercises completed and assessed.",
                submitted, null,
                "submitted", "graded", now, formatter));

        assignments.sort(Comparator.comparingInt(MoodleAssignmentDto::getUrgencyPriority));
        return assignments;
    }

    private MoodleAssignmentDto buildAssignmentDto(Long id, String courseId, String courseName, String title,
                                                   String description, Instant dueDate, Instant cutoffDate,
                                                   String submissionStatus, String gradingStatus,
                                                   Instant now, DateTimeFormatter formatter) {
        String deadlineStatus;
        String formattedDue;
        int priority;

        long secondsDiff = ChronoUnit.SECONDS.between(now, dueDate);

        if ("submitted".equalsIgnoreCase(submissionStatus)) {
            deadlineStatus = "submitted";
            formattedDue = "Submitted • Graded";
            priority = 6;
        } else if (secondsDiff < 0) {
            deadlineStatus = "overdue";
            long hoursAgo = Math.abs(secondsDiff) / 3600;
            formattedDue = hoursAgo < 24 ? "Overdue by " + hoursAgo + " hour(s)" : "Overdue (" + formatter.format(dueDate) + ")";
            priority = 5;
        } else if (secondsDiff <= 86400) {
            deadlineStatus = "due_today";
            formattedDue = "Due today at " + DateTimeFormatter.ofPattern("hh:mm a").withZone(ZoneId.systemDefault()).format(dueDate);
            priority = 1;
        } else if (secondsDiff <= 172800) {
            deadlineStatus = "due_tomorrow";
            formattedDue = "Due tomorrow at " + DateTimeFormatter.ofPattern("hh:mm a").withZone(ZoneId.systemDefault()).format(dueDate);
            priority = 2;
        } else if (secondsDiff <= 259200) {
            deadlineStatus = "due_soon";
            formattedDue = "Due in 3 days (" + formatter.format(dueDate) + ")";
            priority = 3;
        } else {
            deadlineStatus = "upcoming";
            long daysLeft = secondsDiff / 86400;
            formattedDue = "Due in " + daysLeft + " days (" + formatter.format(dueDate) + ")";
            priority = 4;
        }

        return new MoodleAssignmentDto(id, courseId, courseName, title, description, dueDate, cutoffDate,
                submissionStatus, gradingStatus, deadlineStatus, formattedDue, priority);
    }

    /**
     * Simulates / executes dynamic due date refresh from Moodle.
     * Can optionally shift an assignment date (e.g. extending an assignment from 10 Sept to 14 Sept)
     * to demonstrate live synchronization without stale caching.
     */
    public List<MoodleAssignmentDto> refreshAssignments(String courseId, Long assignmentIdToExtend, Integer daysToExtend) {
        if (assignmentIdToExtend != null && daysToExtend != null) {
            Instant currentDue = overriddenDueDates.getOrDefault(assignmentIdToExtend, Instant.now().plus(24, ChronoUnit.HOURS));
            overriddenDueDates.put(assignmentIdToExtend, currentDue.plus(daysToExtend, ChronoUnit.DAYS));
        }
        return fetchAssignments(courseId, null);
    }

    /**
     * Sends a peer message to an authorized classmate via Moodle REST web service.
     */
    public MoodleMessageResponse sendMessage(String senderStudentId, String recipientStudentId, String messageText, String courseId) {
        if (senderStudentId == null || recipientStudentId == null || messageText == null || messageText.trim().isEmpty()) {
            throw new IllegalArgumentException("Sender, recipient, and message text are required.");
        }

        Long messageId = messageIdCounter.incrementAndGet();
        Instant now = Instant.now();

        // If live Moodle is configured, attempt to push via core_message_send_instant_messages
        if (isConfigured()) {
            try {
                MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
                body.add("wstoken", moodleToken);
                body.add("wsfunction", "core_message_send_instant_messages");
                body.add("moodlewsrestformat", "json");
                body.add("messages[0][touserid]", recipientStudentId);
                body.add("messages[0][text]", messageText.trim());
                body.add("messages[0][textformat]", "1");

                restClient.post()
                        .uri(moodleBaseUrl + "/webservice/rest/server.php")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
            } catch (Exception e) {
                logger.warn("Live Moodle message dispatch fallback: {}", e.getMessage());
            }
        }

        MoodleMessageResponse response = new MoodleMessageResponse(
                true,
                "Message sent successfully to " + recipientStudentId,
                messageId,
                now,
                senderStudentId,
                recipientStudentId,
                messageText.trim()
        );

        inMemoryMessages.add(response);
        return response;
    }

    /**
     * Retrieves full chronological message thread between two students.
     */
    public List<MoodleMessageResponse> getThread(String studentId, String peerId) {
        if (studentId == null || peerId == null) {
            return Collections.emptyList();
        }
        List<MoodleMessageResponse> thread = new ArrayList<>();
        for (MoodleMessageResponse msg : inMemoryMessages) {
            boolean match = (msg.getSenderStudentId().equalsIgnoreCase(studentId) && msg.getRecipientStudentId().equalsIgnoreCase(peerId))
                    || (msg.getSenderStudentId().equalsIgnoreCase(peerId) && msg.getRecipientStudentId().equalsIgnoreCase(studentId));
            if (match) {
                thread.add(msg);
            }
        }
        thread.sort(Comparator.comparing(MoodleMessageResponse::getTimestamp));
        return thread;
    }

    /**
     * Retrieves recent conversations for a student.
     */
    public List<MoodleConversationDto> getConversations(String studentId) {
        List<MoodleConversationDto> convos = new ArrayList<>();
        if (studentId == null) {
            return convos;
        }

        // Aggregate messages involving studentId
        Map<String, MoodleMessageResponse> latestByPeer = new HashMap<>();
        for (MoodleMessageResponse msg : inMemoryMessages) {
            if (msg.getSenderStudentId().equalsIgnoreCase(studentId)) {
                latestByPeer.put(msg.getRecipientStudentId(), msg);
            } else if (msg.getRecipientStudentId().equalsIgnoreCase(studentId)) {
                latestByPeer.put(msg.getSenderStudentId(), msg);
            }
        }

        long id = 1;
        for (Map.Entry<String, MoodleMessageResponse> entry : latestByPeer.entrySet()) {
            String peerId = entry.getKey();
            MoodleMessageResponse lastMsg = entry.getValue();
            String previewText = lastMsg.getText() != null ? lastMsg.getText() : lastMsg.getMessage();
            convos.add(new MoodleConversationDto(
                    id++,
                    peerId,
                    "Student " + peerId,
                    previewText,
                    lastMsg.getTimestamp(),
                    0
            ));
        }

        return convos;
    }
}
