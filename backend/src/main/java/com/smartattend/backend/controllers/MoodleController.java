package com.smartattend.backend.controllers;

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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        Map<String, Object> status = new HashMap<>();
        status.put("configured", moodleService.isConfigured());
        status.put("baseUrl", moodleService.getMoodleBaseUrl());
        return ResponseEntity.ok(status);
    }

    /**
     * Fetch enrolled student roster from Moodle.
     * GET /api/moodle/roster?courseId=CS101
     */
    @GetMapping("/roster")
    public ResponseEntity<List<MoodleStudentDto>> getMoodleRoster(@RequestParam(required = false, defaultValue = "CS101") String courseId) {
        List<MoodleStudentDto> roster = moodleService.fetchRoster(courseId);
        return ResponseEntity.ok(roster);
    }

    /**
     * Import Moodle enrolled students into SmartAttend MySQL database.
     * POST /api/moodle/roster/import?courseId=CS101
     */
    @PostMapping("/roster/import")
    public ResponseEntity<Map<String, Object>> importMoodleStudents(@RequestParam(required = false, defaultValue = "CS101") String courseId) {
        int imported = moodleService.importStudentsFromMoodle(courseId);
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
}
