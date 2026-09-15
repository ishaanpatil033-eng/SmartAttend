package com.smartattend.backend.controllers;

import com.smartattend.backend.dtos.MoodleCourseDto;
import com.smartattend.backend.dtos.MoodleStudentDto;
import com.smartattend.backend.dtos.MoodleSyncResponse;
import com.smartattend.backend.services.MoodleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/moodle")
public class MoodleController {

    private final MoodleService moodleService;

    public MoodleController(MoodleService moodleService) {
        this.moodleService = moodleService;
    }

    /**
     * Check Moodle integration status.
     * GET /api/moodle/status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getMoodleStatus() {
        Map<String, Object> status = moodleService.testConnection();
        return ResponseEntity.ok(status);
    }

    /**
     * Fetch available courses from Moodle.
     * GET /api/moodle/courses
     */
    @GetMapping("/courses")
    public ResponseEntity<List<MoodleCourseDto>> getMoodleCourses() {
        List<MoodleCourseDto> courses = moodleService.fetchCourses();
        return ResponseEntity.ok(courses);
    }

    /**
     * Fetch enrolled student roster from Moodle.
     * GET /api/moodle/roster?courseId=CS101
     */
    @GetMapping("/roster")
    public ResponseEntity<List<MoodleStudentDto>> getMoodleRoster(@RequestParam(required = false) String courseId) {
        if (courseId == null || courseId.trim().isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<MoodleStudentDto> roster = moodleService.fetchRoster(courseId);
        return ResponseEntity.ok(roster);
    }

    /**
     * Import Moodle enrolled students into SmartAttend MySQL database.
     * POST /api/moodle/roster/import?courseId=...
     * Strictly restricted to ADMIN.
     */
    @PostMapping("/roster/import")
    public ResponseEntity<?> importMoodleStudents(@RequestParam(required = false) String courseId,
                                                  org.springframework.security.core.Authentication auth) {
        if (auth == null || auth.getAuthorities().stream().noneMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: Only administrators can import Moodle rosters into the system."));
        }
        if (courseId == null || courseId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Course ID is required for Moodle roster import."));
        }
        int imported = moodleService.importStudentsFromMoodle(courseId.trim());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("importedCount", imported);
        response.put("message", "Successfully imported " + imported + " new student(s) from Moodle course '" + courseId + "' into MySQL database.");
        return ResponseEntity.ok(response);
    }

    /**
     * Synchronize course attendance records to Moodle.
     * POST /api/moodle/sync/{courseId}
     */
    @PostMapping("/sync/{courseId}")
    public ResponseEntity<MoodleSyncResponse> syncAttendanceToMoodle(@PathVariable String courseId) {
        try {
            MoodleSyncResponse response = moodleService.syncAttendanceToMoodle(courseId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MoodleSyncResponse(false, e.getMessage(), 0, courseId));
        }
    }

    /**
     * Fetch assignment deadlines from Moodle.
     * GET /api/moodle/assignments?courseId=CS101&studentId=STU101
     */
    @GetMapping("/assignments")
    public ResponseEntity<List<com.smartattend.backend.dtos.MoodleAssignmentDto>> getAssignments(
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String studentId) {
        List<com.smartattend.backend.dtos.MoodleAssignmentDto> assignments = moodleService.fetchAssignments(courseId, studentId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Refresh assignment deadlines from Moodle.
     * POST /api/moodle/assignments/refresh?courseId=CS101&assignmentId=101&daysToExtend=3
     */
    @PostMapping("/assignments/refresh")
    public ResponseEntity<List<com.smartattend.backend.dtos.MoodleAssignmentDto>> refreshAssignments(
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) Long assignmentId,
            @RequestParam(required = false) Integer daysToExtend) {
        List<com.smartattend.backend.dtos.MoodleAssignmentDto> assignments = moodleService.refreshAssignments(courseId, assignmentId, daysToExtend);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Send a peer message via Moodle messaging web service.
     * POST /api/moodle/messages
     */
    @PostMapping("/messages")
    public ResponseEntity<?> sendMessage(
            @org.springframework.web.bind.annotation.RequestBody com.smartattend.backend.dtos.MoodleMessageDto request,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Student-Id", required = false) String headerSenderId) {
        String sender = (headerSenderId != null && !headerSenderId.trim().isEmpty())
                ? headerSenderId.trim()
                : request.getSenderStudentId();

        if (sender == null || sender.trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Sender student ID is required.");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            com.smartattend.backend.dtos.MoodleMessageResponse response = moodleService.sendMessage(
                    sender,
                    request.getRecipientStudentId(),
                    request.getMessageText(),
                    request.getCourseId()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /**
     * Get recent conversations for a student.
     * GET /api/moodle/conversations?studentId=STU101
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<com.smartattend.backend.dtos.MoodleConversationDto>> getConversations(
            @RequestParam(required = false) String studentId,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Student-Id", required = false) String headerStudentId) {
        String effectiveStudentId = (studentId != null && !studentId.trim().isEmpty())
                ? studentId.trim()
                : headerStudentId;

        List<com.smartattend.backend.dtos.MoodleConversationDto> convos = moodleService.getConversations(effectiveStudentId);
        return ResponseEntity.ok(convos);
    }

    /**
     * Get chronological message thread between two students.
     * GET /api/moodle/messages/thread?studentId=...&peerId=...
     */
    @GetMapping("/messages/thread")
    public ResponseEntity<List<com.smartattend.backend.dtos.MoodleMessageResponse>> getMessageThread(
            @RequestParam String studentId,
            @RequestParam String peerId) {
        return ResponseEntity.ok(moodleService.getThread(studentId, peerId));
    }
}
