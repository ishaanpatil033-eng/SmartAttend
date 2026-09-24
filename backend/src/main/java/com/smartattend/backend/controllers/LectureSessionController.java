package com.smartattend.backend.controllers;

import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.LectureSession;
import com.smartattend.backend.services.LectureSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classes")
public class LectureSessionController {

    private final LectureSessionService lectureSessionService;

    public LectureSessionController(LectureSessionService lectureSessionService) {
        this.lectureSessionService = lectureSessionService;
    }

    @GetMapping
    public ResponseEntity<List<LectureSession>> getAllClasses(@RequestParam(required = false) String courseId,
                                                              @RequestParam(required = false) String facultyId,
                                                              Authentication auth) {
        boolean isFaculty = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));

        if (isFaculty && !isAdminOrHod) {
            return ResponseEntity.ok(lectureSessionService.getSessionsByFaculty(auth.getName()));
        }
        if (courseId != null && !courseId.trim().isEmpty()) {
            return ResponseEntity.ok(lectureSessionService.getSessionsByCourse(courseId.trim()));
        }
        if (facultyId != null && !facultyId.trim().isEmpty()) {
            return ResponseEntity.ok(lectureSessionService.getSessionsByFaculty(facultyId.trim()));
        }
        return ResponseEntity.ok(lectureSessionService.getAllSessions());
    }

    @PostMapping
    public ResponseEntity<?> createClass(@RequestBody LectureSession session, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        boolean isTeacherOrFaculty = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_TEACHER".equals(a.getAuthority()) || "ROLE_FACULTY".equals(a.getAuthority()));
        boolean isAdmin = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()));
        boolean isHod = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_HOD".equals(a.getAuthority()));

        if (isHod || (!isTeacherOrFaculty && !isAdmin)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: HOD and Students cannot schedule lectures. Only Faculty and Admin are authorized."));
        }

        String username = authentication.getName();
        String role = isAdmin ? "ROLE_ADMIN" : "ROLE_FACULTY";
        try {
            LectureSession created = lectureSessionService.createLectureSession(session, username, role);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (AccessDeniedException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Failed to create class: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClass(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        String username = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        boolean isFaculty = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));

        if (!isAdmin && !isFaculty) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only Faculty and Admin can delete class sessions."));
        }

        String role = isAdmin ? "ROLE_ADMIN" : "ROLE_FACULTY";
        try {
            lectureSessionService.deleteSession(id, username, role);
            return ResponseEntity.ok(Map.of("success", true, "message", "Class session deleted successfully."));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete session: " + e.getMessage()));
        }
    }

    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<?> getFacultyClasses(@PathVariable String facultyId, Authentication auth) {
        boolean isFaculty = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        if (isFaculty && !isAdminOrHod && !auth.getName().equalsIgnoreCase(facultyId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You can only view your own classes."));
        }
        return ResponseEntity.ok(lectureSessionService.getSessionsByFaculty(facultyId));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getStudentClasses(@PathVariable String studentId, Authentication auth) {
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()))) {
            if (!auth.getName().equalsIgnoreCase(studentId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Students can only view their own class schedule."));
            }
        }
        return ResponseEntity.ok(lectureSessionService.getSessionsForStudent(studentId));
    }

    @GetMapping("/code/{sessionCode}")
    public ResponseEntity<?> getClassByCode(@PathVariable String sessionCode, Authentication auth) {
        var opt = lectureSessionService.getSessionByCode(sessionCode);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Session not found."));
        }
        LectureSession session = opt.get();
        boolean isFaculty = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        if (isFaculty && !isAdminOrHod) {
            if (session.getFacultyId() != null && !session.getFacultyId().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot view another faculty's lecture session."));
            }
        }
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<?> toggleClassStatus(@PathVariable Long id, @RequestParam boolean active, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        boolean isFaculty = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        if (isFaculty && !isAdminOrHod) {
            var sessionOpt = lectureSessionService.getSessionById(id);
            if (sessionOpt.isPresent()) {
                LectureSession s = sessionOpt.get();
                if (s.getFacultyId() != null && !s.getFacultyId().equalsIgnoreCase(auth.getName())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You can only manage your own lecture sessions."));
                }
            }
        }
        try {
            LectureSession updated = lectureSessionService.toggleActive(id, active);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{sessionCode}/attendance")
    public ResponseEntity<?> getSessionAttendance(@PathVariable String sessionCode, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        boolean isFaculty = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        if (isFaculty && !isAdminOrHod) {
            var sessionOpt = lectureSessionService.getSessionByCode(sessionCode);
            if (sessionOpt.isPresent()) {
                LectureSession s = sessionOpt.get();
                if (s.getFacultyId() != null && !s.getFacultyId().equalsIgnoreCase(auth.getName())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You can only view attendance for your own lecture sessions."));
                }
            }
        }
        return ResponseEntity.ok(lectureSessionService.getAttendanceForSession(sessionCode));
    }

    @PostMapping("/{sessionCode}/location")
    public ResponseEntity<?> setClassroomLocation(@PathVariable String sessionCode,
                                                  @RequestBody Map<String, Object> locationData,
                                                  Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        boolean isFaculty = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdmin = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()));

        if (!isFaculty && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only Faculty and Admin can establish classroom location."));
        }

        try {
            Double latitude = locationData.get("latitude") != null ? Double.valueOf(locationData.get("latitude").toString()) : null;
            Double longitude = locationData.get("longitude") != null ? Double.valueOf(locationData.get("longitude").toString()) : null;
            Double accuracy = locationData.get("accuracy") != null ? Double.valueOf(locationData.get("accuracy").toString()) : null;

            String username = authentication.getName();
            String role = isAdmin ? "ROLE_ADMIN" : "ROLE_FACULTY";

            LectureSession updated = lectureSessionService.setClassroomLocation(sessionCode, latitude, longitude, accuracy, username, role);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Classroom location captured successfully.",
                    "session", updated
            ));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to set location: " + e.getMessage()));
        }
    }
}
