package com.smartattend.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartattend.backend.dtos.ChangePasswordRequest;
import com.smartattend.backend.dtos.LoginRequest;
import com.smartattend.backend.dtos.ResetPasswordRequest;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
import com.smartattend.backend.services.StudentService;
import com.smartattend.backend.services.UserAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class PasswordManagementTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountService userAccountService;

    @Autowired
    private StudentService studentService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userAccountService.initDefaultUsers();
        // Reset passwords to known defaults for idempotent test runs
        resetUserPassword("admin", "Admin@123");
        resetUserPassword("hod", "Hod@123");
        resetUserPassword("123456", "123456@edu");
        resetUserPassword("12345678", "12345678@apsit");
    }

    private void resetUserPassword(String username, String plainPassword) {
        userAccountRepository.findByUsername(username).ifPresent(account -> {
            account.setPasswordHash(passwordEncoder.encode(plainPassword));
            userAccountRepository.save(account);
        });
    }

    private MockHttpSession loginAs(String username, String password) throws Exception {
        LoginRequest loginRequest = new LoginRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertNotNull(session, "Session must be established on successful login");
        return session;
    }

    // 1. Student can change password with correct current password.
    @Test
    @DisplayName("1. Student can change password with correct current password")
    void test1_studentCanChangePasswordWithCorrectCurrentPassword() throws Exception {
        MockHttpSession session = loginAs("12345678", "12345678@apsit");
        String newPass = "StudentNewPass@2026";
        ChangePasswordRequest req = new ChangePasswordRequest("12345678@apsit", newPass, newPass);

        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Password changed successfully."));

        // Old password fails
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("12345678", "12345678@apsit"))))
                .andExpect(status().isUnauthorized());

        // New password succeeds
        MockHttpSession newSession = loginAs("12345678", newPass);
        assertNotNull(newSession);
    }

    // 2. Student cannot change password with incorrect current password.
    @Test
    @DisplayName("2. Student cannot change password with incorrect current password")
    void test2_studentCannotChangePasswordWithIncorrectCurrentPassword() throws Exception {
        MockHttpSession session = loginAs("12345678", "12345678@apsit");
        ChangePasswordRequest req = new ChangePasswordRequest("WrongPass999", "BrandNewPass@2026", "BrandNewPass@2026");

        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Current password is incorrect."));

        // Original password still intact
        MockHttpSession stillWorks = loginAs("12345678", "12345678@apsit");
        assertNotNull(stillWorks);
    }

    // 3. Faculty can change password with correct current password.
    @Test
    @DisplayName("3. Faculty can change password with correct current password")
    void test3_facultyCanChangePasswordWithCorrectCurrentPassword() throws Exception {
        MockHttpSession session = loginAs("123456", "123456@edu");
        String newPass = "FacultyNewPass@2026";
        ChangePasswordRequest req = new ChangePasswordRequest("123456@edu", newPass, newPass);

        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Old password fails
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("123456", "123456@edu"))))
                .andExpect(status().isUnauthorized());

        // New password succeeds
        MockHttpSession newSession = loginAs("123456", newPass);
        assertNotNull(newSession);
    }

    // 4. Faculty cannot change password with incorrect current password.
    @Test
    @DisplayName("4. Faculty cannot change password with incorrect current password")
    void test4_facultyCannotChangePasswordWithIncorrectCurrentPassword() throws Exception {
        MockHttpSession session = loginAs("123456", "123456@edu");
        ChangePasswordRequest req = new ChangePasswordRequest("WrongFacultyPass", "FacultyNewPass@2026", "FacultyNewPass@2026");

        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Current password is incorrect."));

        // Original password still intact
        MockHttpSession stillWorks = loginAs("123456", "123456@edu");
        assertNotNull(stillWorks);
    }

    // 5. Student cannot change another user's password.
    @Test
    @DisplayName("5. Student cannot change another user's password")
    void test5_studentCannotChangeAnotherUsersPassword() throws Exception {
        MockHttpSession session = loginAs("12345678", "12345678@apsit");
        ChangePasswordRequest req = new ChangePasswordRequest("123456", "123456@edu", "HackedPass@2026", "HackedPass@2026");

        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("You cannot change another user's password."));

        // Target faculty password remains intact
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        assertNotNull(facultySession);
    }

    // 6. Faculty cannot change another user's password.
    @Test
    @DisplayName("6. Faculty cannot change another user's password")
    void test6_facultyCannotChangeAnotherUsersPassword() throws Exception {
        MockHttpSession session = loginAs("123456", "123456@edu");
        ChangePasswordRequest req = new ChangePasswordRequest("12345678", "12345678@apsit", "HackedPass@2026", "HackedPass@2026");

        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("You cannot change another user's password."));

        // Target student password remains intact
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        assertNotNull(studentSession);
    }

    // 7. Unauthenticated user cannot change password.
    @Test
    @DisplayName("7. Unauthenticated user cannot change password")
    void test7_unauthenticatedUserCannotChangePassword() throws Exception {
        ChangePasswordRequest req = new ChangePasswordRequest("AnyPassword@123", "NewSecretPass@123", "NewSecretPass@123");

        mockMvc.perform(post("/api/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // 8. Admin can reset Student.
    @Test
    @DisplayName("8. Admin can reset Student")
    void test8_adminCanResetStudent() throws Exception {
        // Change student password first
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        mockMvc.perform(post("/api/auth/change-password")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ChangePasswordRequest("12345678@apsit", "TemporaryPass999", "TemporaryPass999"))))
                .andExpect(status().isOk());

        // Admin resets student password
        MockHttpSession adminSession = loginAs("admin", "Admin@123");
        ResetPasswordRequest resetReq = new ResetPasswordRequest("12345678");

        mockMvc.perform(post("/api/auth/reset-password")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.temporaryPassword").value("12345678@apsit"));

        // Student can log in with reset password
        MockHttpSession resetSession = loginAs("12345678", "12345678@apsit");
        assertNotNull(resetSession);
    }

    // 9. Admin can reset Faculty.
    @Test
    @DisplayName("9. Admin can reset Faculty")
    void test9_adminCanResetFaculty() throws Exception {
        // Change faculty password first
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        mockMvc.perform(post("/api/auth/change-password")
                .session(facultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ChangePasswordRequest("123456@edu", "FacultyTempPass999", "FacultyTempPass999"))))
                .andExpect(status().isOk());

        // Admin resets faculty password via /api/admin/users/{userId}/reset-password
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        mockMvc.perform(post("/api/admin/users/123456/reset-password")
                .session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.temporaryPassword").value("123456@edu"));

        // Faculty can log in with reset password
        MockHttpSession resetSession = loginAs("123456", "123456@edu");
        assertNotNull(resetSession);
    }

    // 10. HOD can reset Student.
    @Test
    @DisplayName("10. HOD can reset Student")
    void test10_hodCanResetStudent() throws Exception {
        // Change student password first
        MockHttpSession studentSession = loginAs("12345678", "12345678@apsit");
        mockMvc.perform(post("/api/auth/change-password")
                .session(studentSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ChangePasswordRequest("12345678@apsit", "TemporaryPass888", "TemporaryPass888"))))
                .andExpect(status().isOk());

        // HOD resets student password
        MockHttpSession hodSession = loginAs("hod", "Hod@123");
        ResetPasswordRequest resetReq = new ResetPasswordRequest("12345678");

        mockMvc.perform(post("/api/auth/reset-password")
                .session(hodSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.temporaryPassword").value("12345678@apsit"));

        // Student can log in with reset password
        MockHttpSession resetSession = loginAs("12345678", "12345678@apsit");
        assertNotNull(resetSession);
    }

    // 11. HOD can reset Faculty.
    @Test
    @DisplayName("11. HOD can reset Faculty")
    void test11_hodCanResetFaculty() throws Exception {
        // Change faculty password first
        MockHttpSession facultySession = loginAs("123456", "123456@edu");
        mockMvc.perform(post("/api/auth/change-password")
                .session(facultySession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ChangePasswordRequest("123456@edu", "FacultyTempPass888", "FacultyTempPass888"))))
                .andExpect(status().isOk());

        // HOD resets faculty password
        MockHttpSession hodSession = loginAs("hod", "Hod@123");
        ResetPasswordRequest resetReq = new ResetPasswordRequest("123456");

        mockMvc.perform(post("/api/auth/reset-password")
                .session(hodSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.temporaryPassword").value("123456@edu"));

        // Faculty can log in with reset password
        MockHttpSession resetSession = loginAs("123456", "123456@edu");
        assertNotNull(resetSession);
    }

    // 12. Admin cannot reset another Admin.
    @Test
    @DisplayName("12. Admin cannot reset another Admin")
    void test12_adminCannotResetAnotherAdmin() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        // Attempt to reset admin self or another admin
        ResetPasswordRequest adminTarget = new ResetPasswordRequest("admin");
        mockMvc.perform(post("/api/auth/reset-password")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(adminTarget)))
                .andExpect(status().isBadRequest());
    }

    // 13. Admin cannot reset HOD.
    @Test
    @DisplayName("13. Admin cannot reset HOD")
    void test13_adminCannotResetHod() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        ResetPasswordRequest hodTarget = new ResetPasswordRequest("hod");
        mockMvc.perform(post("/api/auth/reset-password")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(hodTarget)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Admin and HOD accounts cannot be reset."));
    }

    // 14. HOD cannot reset Admin.
    @Test
    @DisplayName("14. HOD cannot reset Admin")
    void test14_hodCannotResetAdmin() throws Exception {
        MockHttpSession hodSession = loginAs("hod", "Hod@123");

        ResetPasswordRequest adminTarget = new ResetPasswordRequest("admin");
        mockMvc.perform(post("/api/auth/reset-password")
                .session(hodSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(adminTarget)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Admin and HOD accounts cannot be reset."));
    }

    // 15. HOD cannot reset another HOD.
    @Test
    @DisplayName("15. HOD cannot reset another HOD")
    void test15_hodCannotResetAnotherHod() throws Exception {
        MockHttpSession hodSession = loginAs("hod", "Hod@123");

        ResetPasswordRequest hodTarget = new ResetPasswordRequest("hod");
        mockMvc.perform(post("/api/auth/reset-password")
                .session(hodSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(hodTarget)))
                .andExpect(status().isBadRequest());
    }

    // 16. Admin/HOD cannot use the website to change their own password.
    @Test
    @DisplayName("16. Admin/HOD cannot use the website to change their own password")
    void test16_adminAndHodCannotChangeOwnPasswordViaWebsite() throws Exception {
        // Admin attempt
        MockHttpSession adminSession = loginAs("admin", "Admin@123");
        ChangePasswordRequest adminReq = new ChangePasswordRequest("Admin@123", "NewAdminSecret@123", "NewAdminSecret@123");

        mockMvc.perform(post("/api/auth/change-password")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(adminReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Admin and HOD accounts cannot change password through the website."));

        // HOD attempt
        MockHttpSession hodSession = loginAs("hod", "Hod@123");
        ChangePasswordRequest hodReq = new ChangePasswordRequest("Hod@123", "NewHodSecret@123", "NewHodSecret@123");

        mockMvc.perform(post("/api/auth/change-password")
                .session(hodSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(hodReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Admin and HOD accounts cannot change password through the website."));
    }

    // 17. Student reset password is exactly <student_id>@smartattend.
    @Test
    @DisplayName("17. Student reset password is exactly <student_id>@smartattend")
    void test17_studentResetPasswordIsExactlyIdAtSmartAttend() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");
        ResetPasswordRequest resetReq = new ResetPasswordRequest("12345678");

        MvcResult result = mockMvc.perform(post("/api/auth/reset-password")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temporaryPassword").value("12345678@apsit"))
                .andReturn();

        // Verify login works with the exact derived password
        MockHttpSession verifiedSession = loginAs("12345678", "12345678@apsit");
        assertNotNull(verifiedSession);
    }

    // 18. Faculty reset password is exactly <faculty_id>@edu.
    @Test
    @DisplayName("18. Faculty reset password is exactly <faculty_id>@edu")
    void test18_facultyResetPasswordIsExactlyIdAtEdu() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");
        ResetPasswordRequest resetReq = new ResetPasswordRequest("123456");

        mockMvc.perform(post("/api/auth/reset-password")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temporaryPassword").value("123456@edu"));

        // Verify login works with the exact derived password
        MockHttpSession verifiedSession = loginAs("123456", "123456@edu");
        assertNotNull(verifiedSession);
    }

    // 19. Reset passwords are stored only as BCrypt hashes.
    @Test
    @DisplayName("19. Reset passwords are stored only as BCrypt hashes")
    void test19_resetPasswordsAreStoredOnlyAsBcryptHashes() throws Exception {
        MockHttpSession adminSession = loginAs("admin", "Admin@123");

        // Reset student
        mockMvc.perform(post("/api/auth/reset-password")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ResetPasswordRequest("12345678"))))
                .andExpect(status().isOk());

        UserAccount studentAcc = userAccountRepository.findByUsername("12345678").orElseThrow();
        assertNotNull(studentAcc.getPasswordHash());
        assertNotEquals("12345678@apsit", studentAcc.getPasswordHash(), "Plaintext password must NEVER be stored in the database");
        assertTrue(studentAcc.getPasswordHash().startsWith("$2a$") || studentAcc.getPasswordHash().startsWith("$2b$") || studentAcc.getPasswordHash().startsWith("$2y$"),
                "Stored password must be a valid BCrypt hash");
        assertTrue(passwordEncoder.matches("12345678@apsit", studentAcc.getPasswordHash()),
                "BCrypt hash must match the derived temporary password");

        // Reset faculty
        mockMvc.perform(post("/api/auth/reset-password")
                .session(adminSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ResetPasswordRequest("123456"))))
                .andExpect(status().isOk());

        UserAccount facultyAcc = userAccountRepository.findByUsername("123456").orElseThrow();
        assertNotNull(facultyAcc.getPasswordHash());
        assertNotEquals("123456@edu", facultyAcc.getPasswordHash(), "Plaintext password must NEVER be stored in the database");
        assertTrue(facultyAcc.getPasswordHash().startsWith("$2a$") || facultyAcc.getPasswordHash().startsWith("$2b$") || facultyAcc.getPasswordHash().startsWith("$2y$"),
                "Stored password must be a valid BCrypt hash");
        assertTrue(passwordEncoder.matches("123456@edu", facultyAcc.getPasswordHash()),
                "BCrypt hash must match the derived temporary password");
    }

    // 20. No Forgot Password endpoint/UI exists.
    @Test
    @DisplayName("20. No Forgot Password endpoint exists")
    void test20_noForgotPasswordEndpointExists() throws Exception {
        // Any request to /api/auth/forgot-password or /api/auth/recovery must return 401 Unauthorized or 404 Not Found
        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"student@smartattend.edu\"}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status == 401 || status == 404, "Endpoint must not exist or allow access: " + status);
                });

        mockMvc.perform(get("/api/auth/forgot-password"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status == 401 || status == 404, "Endpoint must not exist: " + status);
                });

        mockMvc.perform(post("/api/auth/recovery"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status == 401 || status == 404, "Recovery endpoint must not exist: " + status);
                });
    }

    // Additional validations
    @Test
    @DisplayName("21. Password change fails if confirmation does not match")
    void test21_passwordChangeFailsMismatchConfirmation() throws Exception {
        MockHttpSession session = loginAs("12345678", "12345678@apsit");
        ChangePasswordRequest req = new ChangePasswordRequest("12345678@apsit", "NewSecret@123", "DifferentSecret@456");

        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("New password and confirmation password do not match."));
    }

    @Test
    @DisplayName("22. Password change fails if new password is < 6 characters")
    void test22_passwordChangeFailsShortPassword() throws Exception {
        MockHttpSession session = loginAs("123456", "123456@edu");
        ChangePasswordRequest req = new ChangePasswordRequest("123456@edu", "12345", "12345");

        mockMvc.perform(post("/api/auth/change-password")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("New password must be at least 6 characters long."));
    }

    @Test
    @DisplayName("23. Invalid student ID format is rejected")
    void test23_invalidStudentIdRejected() {
        assertThrows(IllegalArgumentException.class, () ->
            studentService.createStudent(new Student("1234567", "Short ID", "short@example.com")));
        assertThrows(IllegalArgumentException.class, () ->
            studentService.createStudent(new Student("123456789", "Long ID", "long@example.com")));
        assertThrows(IllegalArgumentException.class, () ->
            studentService.createStudent(new Student("1234567a", "Alpha ID", "alpha@example.com")));
    }

    @Test
    @DisplayName("24. Invalid faculty ID format is rejected")
    void test24_invalidFacultyIdRejected() {
        assertThrows(IllegalArgumentException.class, () ->
            userAccountService.createFaculty("12345", "Short Faculty", "shortfac@example.com"));
        assertThrows(IllegalArgumentException.class, () ->
            userAccountService.createFaculty("1234567", "Long Faculty", "longfac@example.com"));
        assertThrows(IllegalArgumentException.class, () ->
            userAccountService.createFaculty("12345a", "Alpha Faculty", "alphafac@example.com"));
    }
}
