package com.smartattend.backend.controllers;

import com.smartattend.backend.dtos.AttendanceRequest;
import com.smartattend.backend.dtos.QrScanRequest;
import com.smartattend.backend.dtos.QrTokenResponse;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.services.AttendanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    /**
     * Generate a new dynamic QR token that expires in 5 seconds.
     * POST /api/attendance/qr/generate?courseId=CS101
     */
    @PostMapping("/qr/generate")
    public ResponseEntity<QrTokenResponse> generateQrToken(@RequestParam(required = false, defaultValue = "CS101") String courseId) {
        QrTokenResponse response = attendanceService.generateDynamicQrToken(courseId);
        return ResponseEntity.ok(response);
    }

    /**
     * Mark attendance using a scanned dynamic QR token.
     * POST /api/attendance/qr/scan
     */
    @PostMapping("/qr/scan")
    public ResponseEntity<?> scanQrAttendance(@RequestBody QrScanRequest scanRequest) {
        try {
            Attendance record = attendanceService.recordAttendanceViaQr(scanRequest);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Attendance recorded successfully for " + record.getStudent().getStudentName() + "!");
            response.put("attendance", record);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (IllegalStateException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }
    }

    /**
     * Record a new manual attendance entry.
     * POST /api/attendance
     */
    @PostMapping
    public ResponseEntity<?> recordAttendance(@RequestBody AttendanceRequest request) {
        try {
            Attendance record = attendanceService.recordAttendance(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(record);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }
    }

    /**
     * View all attendance records.
     * GET /api/attendance
     */
    @GetMapping
    public ResponseEntity<List<Attendance>> getAllAttendance() {
        List<Attendance> records = attendanceService.getAllAttendance();
        return ResponseEntity.ok(records);
    }

    /**
     * View attendance records for a specific class/course.
     * GET /api/attendance/course/{courseId}
     */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<?> getAttendanceByCourse(@PathVariable String courseId) {
        try {
            List<Attendance> records = attendanceService.getAttendanceByCourseId(courseId);
            return ResponseEntity.ok(records);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * View attendance records for a specific student.
     * GET /api/attendance/student/{studentId}
     */
    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getAttendanceByStudent(@PathVariable String studentId) {
        try {
            List<Attendance> records = attendanceService.getAttendanceByStudentId(studentId);
            return ResponseEntity.ok(records);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }
}
