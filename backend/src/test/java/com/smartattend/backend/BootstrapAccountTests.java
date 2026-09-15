package com.smartattend.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartattend.backend.dtos.LoginRequest;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class BootstrapAccountTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountService userAccountService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    public void setup() {
        userAccountService.initDefaultUsers();
    }

    @Test
    @DisplayName("Criterion 1: Only the four canonical bootstrap accounts exist and no maker account exists")
    public void testCanonicalBootstrapAccountsExistNoMaker() {
        // Assert no maker account
        assertFalse(userAccountRepository.findByUsername("smartattend_maker").isPresent(),
                "smartattend_maker must NOT exist in the database.");

        // Assert the four canonical accounts exist
        assertTrue(userAccountRepository.findByUsername("admin").isPresent(), "admin account must exist.");
        assertTrue(userAccountRepository.findByUsername("hod").isPresent(), "hod account must exist.");
        assertTrue(userAccountRepository.findByUsername("123456").isPresent(), "faculty 123456 account must exist.");
        assertTrue(userAccountRepository.findByUsername("12345678").isPresent(), "student 12345678 account must exist.");
    }

    @Test
    @DisplayName("Criterion 2: Multiple server restarts do not duplicate canonical accounts (Idempotent)")
    public void testMultipleRestartsDoNotDuplicateCanonicalAccounts() {
        long countBefore = userAccountRepository.count();

        // Simulate multiple application startups / restart events
        userAccountService.initDefaultUsers();
        userAccountService.initDefaultUsers();

        assertEquals(countBefore, userAccountRepository.count(),
                "Subsequent init calls must preserve canonical accounts without duplicating.");
    }

    @Test
    @DisplayName("Criterion 3: All four canonical accounts authenticate successfully with exact roles")
    public void testCanonicalAccountsCanAuthenticate() throws Exception {
        // 1. Admin
        verifyLogin("admin", "Admin@123", "ROLE_ADMIN");

        // 2. HOD
        verifyLogin("hod", "Hod@123", "ROLE_HOD");

        // 3. Faculty
        verifyLogin("123456", "123456@edu", "ROLE_FACULTY");

        // 4. Student
        verifyLogin("12345678", "12345678@apsit", "ROLE_STUDENT");
    }

    private void verifyLogin(String username, String password, String expectedRole) throws Exception {
        LoginRequest req = new LoginRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(username, json.get("username").asText());
        assertEquals(expectedRole, json.get("role").asText());
        assertNotNull(result.getRequest().getSession(false), "Valid HTTP session must be created");
    }

    @Test
    @DisplayName("Criterion 4: Canonical Student 12345678 has complete valid academic cohort profile")
    public void testStudentHasValidCohortProfile() {
        Optional<Student> studentOpt = studentRepository.findByStudentId("12345678");
        assertTrue(studentOpt.isPresent(), "Student 12345678 must be persisted in students repository");

        Student student = studentOpt.get();
        assertEquals("Computer Science", student.getBranch(), "Branch must be Computer Science");
        assertEquals("A", student.getDivision(), "Division must be A");
        assertEquals("A1", student.getBatch(), "Batch must be A1");
        assertEquals("FE", student.getAcademicYear(), "Year must be FE");
        assertEquals(1, student.getSemester(), "Semester must be 1");
        assertTrue(student.getActive(), "Student must be active");
    }

    @Test
    @DisplayName("Criterion 5: Plaintext passwords are never stored in database (BCrypt hash only)")
    public void testPlaintextPasswordsNeverStoredInDatabase() {
        List<UserAccount> accounts = userAccountRepository.findAll();
        for (UserAccount acc : accounts) {
            String hash = acc.getPasswordHash();
            assertNotNull(hash);
            assertTrue(hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$"),
                    "Password for user " + acc.getUsername() + " must be BCrypt hashed");
            assertNotEquals("Admin@123", hash);
            assertNotEquals("Hod@123", hash);
            assertNotEquals("123456@edu", hash);
            assertNotEquals("12345678@apsit", hash);
        }
        UserAccount studentAcc = userAccountRepository.findByUsername("12345678").orElseThrow();
        assertTrue(passwordEncoder.matches("12345678@apsit", studentAcc.getPasswordHash()),
                "Student account in database must match 12345678@apsit");
    }

    @Test
    @DisplayName("Criterion 6: Passwords are never returned through any API response")
    public void testPasswordsNeverReturnedInApiResponse() throws Exception {
        MockHttpSession session = performLogin("admin", "Admin@123");

        // Check /api/auth/me response
        MvcResult meResult = mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andReturn();

        String meResponse = meResult.getResponse().getContentAsString();
        assertFalse(meResponse.toLowerCase().contains("password"), "/api/auth/me must never contain 'password'");
    }

    @Test
    @DisplayName("Criterion 7: No passwords or obsolete branding exist in frontend code")
    public void testNoCredentialsOrObsoleteBrandingInFrontendCode() throws IOException {
        Path frontendSrc = Paths.get("../frontend/src");
        if (!Files.exists(frontendSrc)) {
            frontendSrc = Paths.get("frontend/src");
        }

        if (Files.exists(frontendSrc)) {
            try (Stream<Path> paths = Files.walk(frontendSrc)) {
                List<Path> codeFiles = paths.filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".js") || p.toString().endsWith(".jsx") || p.toString().endsWith(".html"))
                        .collect(Collectors.toList());

                for (Path codeFile : codeFiles) {
                    String fileContent = Files.readString(codeFile);
                    assertFalse(fileContent.contains("smartattend_maker"),
                            "Frontend file " + codeFile.getFileName() + " must NOT contain 'smartattend_maker'!");
                    assertFalse(fileContent.contains("@apsit"),
                            "Frontend file " + codeFile.getFileName() + " must NOT contain '@apsit'!");
                }
            }
        }
    }

    @Test
    @DisplayName("Criterion 8: Invalid password returns 401 Unauthorized, unauthenticated access rejected")
    public void testInvalidPasswordAndUnauthenticatedAccess() throws Exception {
        // 1. Wrong password returns 401
        LoginRequest badPasswordRequest = new LoginRequest("admin", "WrongPassword@123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badPasswordRequest)))
                .andExpect(status().isUnauthorized());

        // 2. Requesting protected endpoint without session returns 401
        mockMvc.perform(get("/api/attendance/admin/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Criterion 9: Admin and HOD accounts cannot be deleted")
    public void testAdminAndHodCannotBeDeleted() {
        UserAccount admin = userAccountRepository.findByUsername("admin").orElseThrow();
        UserAccount hod = userAccountRepository.findByUsername("hod").orElseThrow();

        assertThrows(IllegalArgumentException.class, () -> userAccountService.deleteUser(admin.getId()),
                "Deleting Admin account must throw IllegalArgumentException");

        assertThrows(IllegalArgumentException.class, () -> userAccountService.deleteUser(hod.getId()),
                "Deleting HOD account must throw IllegalArgumentException");
    }

    private MockHttpSession performLogin(String username, String password) throws Exception {
        LoginRequest req = new LoginRequest(username, password);
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        return (MockHttpSession) res.getRequest().getSession(false);
    }
}
