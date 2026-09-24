package com.smartattend.backend.controllers;

import com.smartattend.backend.dtos.AdminOverviewDto;
import com.smartattend.backend.dtos.DefaulterReportDto;
import com.smartattend.backend.dtos.AttendanceRequest;
import com.smartattend.backend.dtos.CourseAttendanceSummaryDto;
import com.smartattend.backend.dtos.HodOverviewDto;
import com.smartattend.backend.dtos.QrScanRequest;
import com.smartattend.backend.dtos.QrTokenResponse;
import com.smartattend.backend.dtos.StudentAttendanceSummaryDto;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.services.AttendanceService;
import com.smartattend.backend.services.UserAccountService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final UserAccountService userAccountService;
    private final com.smartattend.backend.services.LectureSessionService lectureSessionService;

    public AttendanceController(AttendanceService attendanceService,
                                UserAccountService userAccountService,
                                com.smartattend.backend.services.LectureSessionService lectureSessionService) {
        this.attendanceService = attendanceService;
        this.userAccountService = userAccountService;
        this.lectureSessionService = lectureSessionService;
    }

    /**
     * Generate a new dynamic QR token that expires in 5 seconds.
     * POST /api/attendance/qr/generate?courseId=CS101&sessionCode=...
     */
    @PostMapping("/qr/generate")
    public ResponseEntity<?> generateQrToken(@RequestParam(required = false) String courseId,
                                             @RequestParam(required = false) String sessionCode,
                                             Authentication authentication) {
        String resolvedCourseId = courseId;
        if (authentication != null && authentication.isAuthenticated()) {
            boolean isFaculty = authentication.getAuthorities().stream().anyMatch(a ->
                    "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
            boolean isAdminOrHod = authentication.getAuthorities().stream().anyMatch(a ->
                    "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
            if (sessionCode != null && !sessionCode.trim().isEmpty()) {
                var sessionOpt = lectureSessionService.getSessionByCode(sessionCode.trim());
                if (sessionOpt.isPresent()) {
                    var s = sessionOpt.get();
                    if (isFaculty && !isAdminOrHod && s.getFacultyId() != null && !s.getFacultyId().equalsIgnoreCase(authentication.getName())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "Access denied: You cannot generate QR codes for another faculty's lecture session."));
                    }
                    if (resolvedCourseId == null || resolvedCourseId.trim().isEmpty()) {
                        resolvedCourseId = s.getCourseId();
                    }
                }
            }
        }
        if (resolvedCourseId == null || resolvedCourseId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Course ID is required to generate dynamic QR token."));
        }
        try {
            QrTokenResponse response = attendanceService.generateDynamicQrToken(resolvedCourseId, sessionCode);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Mark attendance using a scanned dynamic QR token.
     * POST /api/attendance/qr/scan
     */
    @PostMapping("/qr/scan")
    public ResponseEntity<?> scanQrAttendance(@RequestBody QrScanRequest scanRequest,
                                           HttpServletRequest request,
                                           Authentication authentication) {
        String authenticatedUsername = (authentication != null && authentication.isAuthenticated())
                ? authentication.getName()
                : null;
        String clientIp = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        try {
            Attendance record = attendanceService.recordAttendanceViaQr(scanRequest, authenticatedUsername, clientIp, userAgent);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Attendance recorded successfully for " + record.getStudent().getStudentName() + "!");
            response.put("attendance", record);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (AccessDeniedException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
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
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to record attendance: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
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
     * Enforces student ownership: A student can only view their own attendance records.
     * GET /api/attendance/student/{studentId}
     */
    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getAttendanceByStudent(@PathVariable String studentId, Authentication authentication) {
        if (!isAuthorizedForStudent(authentication, studentId)) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Access denied: You are not authorized to view another student's attendance records.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        }

        try {
            List<Attendance> records = attendanceService.getAttendanceByStudentId(studentId);
            return ResponseEntity.ok(records);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * View comprehensive attendance statistics & summary for a student.
     * Enforces student ownership: A student can only view their own attendance summary.
     * GET /api/attendance/student/{studentId}/summary
     */
    @GetMapping("/student/{studentId}/summary")
    public ResponseEntity<?> getStudentAttendanceSummary(@PathVariable String studentId, Authentication authentication) {
        if (!isAuthorizedForStudent(authentication, studentId)) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Access denied: You are not authorized to view another student's attendance summary.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        }

        try {
            StudentAttendanceSummaryDto summary = attendanceService.getStudentAttendanceSummary(studentId);
            return ResponseEntity.ok(summary);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * View comprehensive attendance statistics & summary for a course.
     * GET /api/attendance/course/{courseId}/summary
     */
    @GetMapping("/course/{courseId}/summary")
    public ResponseEntity<?> getCourseAttendanceSummary(@PathVariable String courseId) {
        try {
            CourseAttendanceSummaryDto summary = attendanceService.getCourseAttendanceSummary(courseId);
            return ResponseEntity.ok(summary);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * View overall institutional attendance statistics & admin overview.
     * GET /api/attendance/admin/overview
     */
    @GetMapping("/admin/overview")
    public ResponseEntity<AdminOverviewDto> getAdminOverview() {
        AdminOverviewDto overview = attendanceService.getAdminOverview();
        return ResponseEntity.ok(overview);
    }

    /**
     * View department attendance statistics & HOD overview.
     * GET /api/attendance/hod/overview
     */
    @GetMapping("/hod/overview")
    public ResponseEntity<HodOverviewDto> getHodOverview() {
        HodOverviewDto overview = attendanceService.getHodOverview();
        return ResponseEntity.ok(overview);
    }

    private boolean isAuthorizedForStudent(Authentication authentication, String targetStudentId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        // Faculty and Administrators can view any student's attendance
        boolean isStaffOrAdmin = authentication.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") ||
                a.getAuthority().equals("ROLE_TEACHER") ||
                a.getAuthority().equals("ROLE_FACULTY") ||
                a.getAuthority().equals("ROLE_HOD"));

        if (isStaffOrAdmin) {
            return true;
        }

        // If user is a student, they can ONLY view their own records
        String username = authentication.getName();
        UserAccount account = userAccountService.findByUsername(username).orElse(null);
        if (account != null && account.getStudentId() != null) {
            return account.getStudentId().equalsIgnoreCase(targetStudentId);
        }

        return username.equalsIgnoreCase(targetStudentId);
    }

    /**
     * View Defaulter List with multi-criteria filters.
     * GET /api/attendance/defaulters
     */
    @GetMapping("/defaulters")
    public ResponseEntity<?> getDefaulterReport(
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String sessionCode,
            @RequestParam(required = false) String division,
            @RequestParam(required = false) String batch,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "75.0") Double threshold,
            Authentication auth) {
        try {
            String requestingUser = auth != null ? auth.getName() : "admin";
            String requestingRole = (auth != null && !auth.getAuthorities().isEmpty())
                    ? auth.getAuthorities().iterator().next().getAuthority()
                    : "ROLE_ADMIN";

            List<DefaulterReportDto> report = attendanceService.getDefaulterReport(
                    courseId, sessionCode, division, batch, startDate, endDate, threshold, requestingUser, requestingRole);
            return ResponseEntity.ok(report);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Export Defaulter List as authentic .xlsx Excel workbook.
     * GET /api/attendance/defaulters/export
     */
    @GetMapping("/defaulters/export")
    public ResponseEntity<?> exportDefaulterExcel(
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String sessionCode,
            @RequestParam(required = false) String division,
            @RequestParam(required = false) String batch,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "75.0") Double threshold,
            Authentication auth) {
        try {
            String requestingUser = auth != null ? auth.getName() : "admin";
            String requestingRole = (auth != null && !auth.getAuthorities().isEmpty())
                    ? auth.getAuthorities().iterator().next().getAuthority()
                    : "ROLE_ADMIN";

            List<DefaulterReportDto> report = attendanceService.getDefaulterReport(
                    courseId, sessionCode, division, batch, startDate, endDate, threshold, requestingUser, requestingRole);

            byte[] excelBytes = attendanceService.generateDefaulterExcel(report, courseId);

            String safeCourseName = (courseId != null && !courseId.trim().isEmpty()) ? courseId.trim() : "All_Courses";
            String filename = "SmartAttend_Defaulter_List_" + safeCourseName + "_" + LocalDate.now() + ".xlsx";

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelBytes);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Excel export failed: " + e.getMessage()));
        }
    }
}
