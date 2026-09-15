package com.smartattend.backend.controllers;

import com.smartattend.backend.dtos.CreateFacultyRequest;
import com.smartattend.backend.dtos.UserInfoDto;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.services.SecurityAuditService;
import com.smartattend.backend.services.UserAccountService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserAccountService userAccountService;
    private final SecurityAuditService securityAuditService;

    public AdminUserController(UserAccountService userAccountService,
                               SecurityAuditService securityAuditService) {
        this.userAccountService = userAccountService;
        this.securityAuditService = securityAuditService;
    }

    /**
     * Reset password for a student or faculty user by user ID.
     * POST /api/admin/users/{userId}/reset-password
     */
    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<?> resetUserPassword(@PathVariable String userId, HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        boolean isAuthorized = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_HOD"));
        if (!isAuthorized) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Access denied: Only Admin or HOD can reset passwords.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        }

        if (userId == null || userId.trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Target user ID is required.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        try {
            String tempPassword = userAccountService.resetPassword(userId.trim(), auth.getName());
            securityAuditService.logEvent("PASSWORD_RESET", auth.getName(), request.getRemoteAddr(),
                    "Password reset performed via admin endpoint for user: " + userId.trim());

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Password reset successfully.");
            res.put("username", userId.trim());
            res.put("temporaryPassword", tempPassword);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    /**
     * Deactivate user account (Admin only).
     * DELETE /api/admin/users/{userId}
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deactivateUser(@PathVariable String userId, HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Access denied: Only Admin can deactivate or delete users.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        }

        if (userId == null || userId.trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Target user ID is required.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        try {
            userAccountService.deactivateUser(userId.trim());
            securityAuditService.logEvent("USER_DEACTIVATE", auth.getName(), request.getRemoteAddr(),
                    "User account deactivated: " + userId.trim());

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "User " + userId.trim() + " has been deactivated successfully.");
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    /**
     * Update faculty profile (Admin or HOD).
     * PUT /api/admin/users/faculty/{facultyId}
     */
    @PutMapping("/faculty/{facultyId}")
    public ResponseEntity<?> updateFaculty(@PathVariable String facultyId,
                                           @RequestBody CreateFacultyRequest req,
                                           HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        boolean isAuthorized = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_HOD"));
        if (!isAuthorized) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Access denied: Only Admin or HOD can edit faculty.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        }

        try {
            UserAccount updated = userAccountService.updateFaculty(facultyId.trim(), req.getFullName(), req.getEmail());
            securityAuditService.logEvent("FACULTY_UPDATE", auth.getName(), request.getRemoteAddr(),
                    "Faculty updated: " + facultyId.trim());

            UserInfoDto dto = new UserInfoDto(
                    updated.getId(),
                    updated.getUsername(),
                    updated.getRole(),
                    updated.getStudentId(),
                    updated.getFullName(),
                    updated.getEmail()
            );
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    /**
     * Delete faculty account (Admin only).
     * DELETE /api/admin/users/faculty/{facultyId}
     */
    @DeleteMapping("/faculty/{facultyId}")
    public ResponseEntity<?> deleteFaculty(@PathVariable String facultyId, HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Access denied: Only Admin can delete faculty accounts.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        }

        try {
            userAccountService.deleteFaculty(facultyId.trim());
            securityAuditService.logEvent("FACULTY_DELETE", auth.getName(), request.getRemoteAddr(),
                    "Faculty deleted: " + facultyId.trim());

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Faculty " + facultyId.trim() + " deleted successfully.");
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    /**
     * View user details by username, studentId, or numeric ID.
     * Enforces the authoritative privacy matrix:
     * - Student: Own only
     * - Faculty: Own only, or students with verified lecture attendance
     * - HOD: Student YES, Faculty YES, Own HOD YES, Admin NO (403)
     * - Admin: Student YES, Faculty YES, Own Admin YES, HOD NO (403)
     * GET /api/admin/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserDetails(@PathVariable String userId, Authentication authentication) {
        try {
            UserInfoDto dto = userAccountService.getUserDetails(userId, authentication);
            if (dto == null) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "User '" + userId + "' not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
            }
            return ResponseEntity.ok(dto);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        }
    }
}
