package com.smartattend.backend.controllers;

import com.smartattend.backend.dtos.ChangePasswordRequest;
import com.smartattend.backend.dtos.CreateFacultyRequest;
import com.smartattend.backend.dtos.LoginRequest;
import com.smartattend.backend.dtos.ResetPasswordRequest;
import com.smartattend.backend.dtos.UserInfoDto;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.services.SecurityAuditService;
import com.smartattend.backend.services.UserAccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserAccountService userAccountService;
    private final SecurityAuditService securityAuditService;
    private final StudentRepository studentRepository;

    public AuthController(AuthenticationManager authenticationManager,
                          UserAccountService userAccountService,
                          SecurityAuditService securityAuditService,
                          StudentRepository studentRepository) {
        this.authenticationManager = authenticationManager;
        this.userAccountService = userAccountService;
        this.securityAuditService = securityAuditService;
        this.studentRepository = studentRepository;
    }

    /**
     * Authenticate user with username and password, creating a secure server-side session.
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        if (loginRequest == null || loginRequest.getUsername() == null || loginRequest.getPassword() == null) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Username and password are required.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        String username = loginRequest.getUsername().trim();
        String clientIp = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        try {
            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(username, loginRequest.getPassword());
            Authentication authentication = authenticationManager.authenticate(authToken);

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Establish and persist server-side session
            HttpSession session = request.getSession(true);
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, SecurityContextHolder.getContext());

            UserAccount account = userAccountService.findByUsername(username).orElse(null);
            if (account == null) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "User account profile not found.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
            }

            securityAuditService.logEvent("LOGIN_SUCCESS", username, account.getStudentId(), clientIp, userAgent, null, null, "User logged in with role " + account.getRole());

            UserInfoDto userInfo = buildUserInfoDto(account);
            return ResponseEntity.ok(userInfo);
        } catch (BadCredentialsException e) {
            securityAuditService.logEvent("LOGIN_FAILURE", username, null, clientIp, userAgent, null, null, "Bad credentials entered");
            Map<String, String> err = new HashMap<>();
            err.put("error", "Invalid username or password.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        } catch (Exception e) {
            securityAuditService.logEvent("LOGIN_FAILURE", username, null, clientIp, userAgent, null, null, "Authentication error: " + e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("error", "Authentication failed. " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
    }

    /**
     * Get currently authenticated user identity and safe profile details.
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Not authenticated.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        String username = auth.getName();
        UserAccount account = userAccountService.findByUsername(username).orElse(null);
        if (account == null) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "User profile not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        UserInfoDto userInfo = buildUserInfoDto(account);
        return ResponseEntity.ok(userInfo);
    }

    private UserInfoDto buildUserInfoDto(UserAccount account) {
        UserInfoDto userInfo = new UserInfoDto(
                account.getId(),
                account.getUsername(),
                account.getRole(),
                account.getStudentId(),
                account.getFullName(),
                account.getEmail()
        );

        if ("ROLE_STUDENT".equalsIgnoreCase(account.getRole()) || account.getStudentId() != null) {
            String sid = (account.getStudentId() != null && !account.getStudentId().trim().isEmpty())
                    ? account.getStudentId().trim()
                    : account.getUsername();
            studentRepository.findByStudentId(sid).ifPresent(s -> {
                if (s.getBranch() != null) userInfo.setDepartment(s.getBranch());
                userInfo.setDivision(s.getDivision());
                userInfo.setBatch(s.getBatch());
                userInfo.setAcademicYear(s.getAcademicYear());
                userInfo.setSemester(s.getSemester());
            });
        }
        return userInfo;
    }

    /**
     * Terminate the authenticated server session.
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = (auth != null) ? auth.getName() : null;

        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();

        if (username != null) {
            securityAuditService.logEvent("LOGOUT", username, request.getRemoteAddr(), "User logged out");
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Logged out successfully.");
        return ResponseEntity.ok(res);
    }

    /**
     * Change password for the currently authenticated user.
     * POST /api/auth/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req, HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Authentication required.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        String username = auth.getName();
        if (req != null && req.getUsername() != null && !req.getUsername().trim().isEmpty()) {
            if (!req.getUsername().trim().equalsIgnoreCase(username)) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "You cannot change another user's password.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
            }
        }

        try {
            userAccountService.changePassword(username, req.getCurrentPassword(), req.getNewPassword(), req.getConfirmPassword());
            securityAuditService.logEvent("PASSWORD_CHANGE", username, request.getRemoteAddr(), "Password changed successfully");
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Password changed successfully.");
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    /**
     * Reset password for student or faculty accounts by Admin or HOD.
     * POST /api/auth/reset-password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest req, HttpServletRequest request) {
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

        if (req == null || req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Target username is required.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        try {
            String tempPassword = userAccountService.resetPassword(req.getUsername().trim(), auth.getName());
            securityAuditService.logEvent("PASSWORD_RESET", auth.getName(), request.getRemoteAddr(),
                    "Password reset performed for target user: " + req.getUsername().trim());

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Password reset successfully.");
            res.put("username", req.getUsername().trim());
            res.put("temporaryPassword", tempPassword);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    /**
     * Create faculty account with 6-digit numeric ID.
     * POST /api/auth/faculty
     */
    @PostMapping("/faculty")
    public ResponseEntity<?> createFaculty(@RequestBody CreateFacultyRequest req, HttpServletRequest request) {
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
            err.put("error", "Access denied: Only Admin or HOD can create faculty accounts.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        }

        if (req == null) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Faculty data is required.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        try {
            UserAccount account = userAccountService.createFaculty(req.getFacultyId(), req.getFullName(), req.getEmail());
            securityAuditService.logEvent("FACULTY_CREATE", auth.getName(), request.getRemoteAddr(),
                    "Faculty account created: " + account.getUsername());

            UserInfoDto dto = new UserInfoDto(
                    account.getId(),
                    account.getUsername(),
                    account.getRole(),
                    account.getStudentId(),
                    account.getFullName(),
                    account.getEmail()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    /**
     * List all faculty accounts.
     * GET /api/auth/faculty
     */
    @GetMapping("/faculty")
    public ResponseEntity<?> getFaculty() {
        var faculty = userAccountService.getAllUsers().stream()
                .filter(u -> u.isEnabled() && ("ROLE_FACULTY".equalsIgnoreCase(u.getRole()) || "ROLE_TEACHER".equalsIgnoreCase(u.getRole())))
                .map(a -> new UserInfoDto(a.getId(), a.getUsername(), a.getRole(), a.getStudentId(), a.getFullName(), a.getEmail()))
                .toList();
        return ResponseEntity.ok(faculty);
    }

    /**
     * View user details by username, studentId, or numeric ID.
     * Enforces the authoritative privacy matrix:
     * - Student: Own only
     * - Faculty: Own only, or students with verified lecture attendance
     * - HOD: Student YES, Faculty YES, Own HOD YES, Admin NO (403)
     * - Admin: Student YES, Faculty YES, Own Admin YES, HOD NO (403)
     * GET /api/auth/users/{userId}
     */
    @GetMapping("/users/{userId}")
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
