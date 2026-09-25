package com.smartattend.backend.services;

import com.smartattend.backend.entities.Course;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.dtos.UserInfoDto;
import com.smartattend.backend.entities.LectureSession;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.LectureSessionRepository;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class UserAccountService implements UserDetailsService {

    private final UserAccountRepository userAccountRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final LectureSessionRepository lectureSessionRepository;
    private final AttendanceRepository attendanceRepository;
    private final CourseRepository courseRepository;

    public UserAccountService(UserAccountRepository userAccountRepository,
                              StudentRepository studentRepository,
                              PasswordEncoder passwordEncoder,
                              LectureSessionRepository lectureSessionRepository,
                              AttendanceRepository attendanceRepository,
                              CourseRepository courseRepository) {
        this.userAccountRepository = userAccountRepository;
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.lectureSessionRepository = lectureSessionRepository;
        this.attendanceRepository = attendanceRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserAccount account = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        List<GrantedAuthority> authorities;
        String rawRole = account.getRole() != null ? account.getRole().trim().toUpperCase() : "";
        String normalizedRole = rawRole.startsWith("ROLE_") ? rawRole : ("ROLE_" + rawRole);

        if ("ROLE_FACULTY".equals(normalizedRole) || "ROLE_TEACHER".equals(normalizedRole)) {
            authorities = Arrays.asList(
                    new SimpleGrantedAuthority("ROLE_FACULTY"),
                    new SimpleGrantedAuthority("ROLE_TEACHER")
            );
        } else {
            authorities = Collections.singletonList(new SimpleGrantedAuthority(normalizedRole));
        }

        return new User(
                account.getUsername(),
                account.getPasswordHash(),
                account.isEnabled(),
                true,
                true,
                true,
                authorities
        );
    }

    public Optional<UserAccount> findByUsername(String username) {
        return userAccountRepository.findByUsername(username);
    }

    public Optional<UserAccount> findByStudentId(String studentId) {
        return userAccountRepository.findByStudentId(studentId);
    }

    public UserAccount getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        String username = auth.getName();
        return userAccountRepository.findByUsername(username).orElse(null);
    }

    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword) {
        changePassword(username, currentPassword, newPassword, null);
    }

    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword, String confirmPassword) {
        if (currentPassword == null || currentPassword.isEmpty()) {
            throw new IllegalArgumentException("Current password is required.");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long.");
        }
        if (confirmPassword != null && !newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("New password and confirmation password do not match.");
        }

        UserAccount account = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        if ("ROLE_ADMIN".equalsIgnoreCase(account.getRole())
                || "ROLE_HOD".equalsIgnoreCase(account.getRole())) {
            throw new IllegalArgumentException("Admin and HOD accounts cannot change password through the website.");
        }

        if (!passwordEncoder.matches(currentPassword, account.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        account.setPasswordHash(passwordEncoder.encode(newPassword));
        userAccountRepository.save(account);
    }

    @Transactional
    public String resetPassword(String targetUsername) {
        return resetPassword(targetUsername, null);
    }

    @Transactional
    public String resetPassword(String targetUsername, String requestingUsername) {
        if (targetUsername == null || targetUsername.trim().isEmpty()) {
            throw new IllegalArgumentException("Target username is required.");
        }
        String safeTarget = targetUsername.trim();

        if (requestingUsername != null && safeTarget.equalsIgnoreCase(requestingUsername.trim())) {
            throw new IllegalArgumentException("Admin and HOD cannot reset their own password.");
        }

        UserAccount targetAccount = userAccountRepository.findByUsername(safeTarget)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found: " + safeTarget));

        if ("ROLE_ADMIN".equalsIgnoreCase(targetAccount.getRole())
                || "ROLE_HOD".equalsIgnoreCase(targetAccount.getRole())) {
            throw new IllegalArgumentException("Admin and HOD accounts cannot be reset.");
        }

        String newPassword;
        if ("ROLE_STUDENT".equalsIgnoreCase(targetAccount.getRole())) {
            String studentId = targetAccount.getStudentId() != null && !targetAccount.getStudentId().isEmpty()
                    ? targetAccount.getStudentId()
                    : targetAccount.getUsername();
            newPassword = studentId + "@apsit";
        } else if ("ROLE_FACULTY".equalsIgnoreCase(targetAccount.getRole()) || "ROLE_TEACHER".equalsIgnoreCase(targetAccount.getRole())) {
            newPassword = targetAccount.getUsername() + "@edu";
        } else {
            throw new IllegalArgumentException("Password reset is only supported for student and faculty accounts.");
        }

        targetAccount.setPasswordHash(passwordEncoder.encode(newPassword));
        userAccountRepository.save(targetAccount);

        return newPassword;
    }

    @Transactional
    public UserAccount createFaculty(String facultyId, String fullName, String email) {
        if (facultyId == null || facultyId.trim().isEmpty()) {
            throw new IllegalArgumentException("Faculty ID is required.");
        }
        String safeFacultyId = facultyId.trim();
        if (!safeFacultyId.matches("^\\d{6}$")) {
            throw new IllegalArgumentException("Faculty ID must be exactly 6 numeric digits.");
        }
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new IllegalArgumentException("Full name is required.");
        }
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required.");
        }
        if (userAccountRepository.existsByUsername(safeFacultyId)) {
            throw new IllegalArgumentException("Faculty account with ID " + safeFacultyId + " already exists.");
        }

        String initialPassword = safeFacultyId + "@edu";
        UserAccount account = new UserAccount(
                safeFacultyId,
                passwordEncoder.encode(initialPassword),
                "ROLE_FACULTY",
                null,
                fullName.trim(),
                email.trim()
        );
        return userAccountRepository.save(account);
    }

    @Transactional
    public UserAccount registerUser(String username, String plainPassword, String role, String studentId, String fullName, String email) {
        if (userAccountRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists: " + username);
        }
        UserAccount account = new UserAccount(
                username,
                passwordEncoder.encode(plainPassword),
                role,
                studentId,
                fullName,
                email
        );
        return userAccountRepository.save(account);
    }

    public List<UserAccount> getAllUsers() {
        return userAccountRepository.findAll();
    }

    public List<UserAccount> getUsersByRole(String role) {
        return userAccountRepository.findAllByRole(role);
    }

    public UserInfoDto buildUserInfoDto(UserAccount account) {
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

    public UserInfoDto buildUserInfoDto(Student s) {
        return new UserInfoDto(
                s.getId(),
                s.getStudentId(),
                "ROLE_STUDENT",
                s.getStudentId(),
                s.getStudentName(),
                s.getEmail(),
                s.getBranch(),
                s.getDivision(),
                s.getBatch(),
                s.getAcademicYear(),
                s.getSemester()
        );
    }

    public UserInfoDto getUserDetails(String targetUserId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("Authentication required.");
        }

        if (targetUserId == null || targetUserId.trim().isEmpty()) {
            return null;
        }
        String cleanTarget = targetUserId.trim();

        String requestingUsername = authentication.getName();
        UserAccount requestingAccount = userAccountRepository.findByUsername(requestingUsername).orElse(null);

        // Resolve target account
        Optional<UserAccount> optTarget = userAccountRepository.findByUsername(cleanTarget);
        if (optTarget.isEmpty()) {
            optTarget = userAccountRepository.findByStudentId(cleanTarget);
        }
        if (optTarget.isEmpty()) {
            try {
                Long numericId = Long.parseLong(cleanTarget);
                optTarget = userAccountRepository.findById(numericId);
            } catch (NumberFormatException ignored) {}
        }

        UserAccount targetAccount = optTarget.orElse(null);
        Student targetStudent = null;

        if (targetAccount == null) {
            Optional<Student> optStudent = studentRepository.findByStudentId(cleanTarget);
            if (optStudent.isPresent()) {
                targetStudent = optStudent.get();
            } else {
                return null; // Not found
            }
        }

        String targetRole = targetAccount != null ? targetAccount.getRole() : "ROLE_STUDENT";
        if (targetRole == null) targetRole = "ROLE_STUDENT";
        targetRole = targetRole.toUpperCase();
        if (!targetRole.startsWith("ROLE_")) targetRole = "ROLE_" + targetRole;

        // Check if requester has specific roles from authorities
        boolean isReqAdmin = authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        boolean isReqHod = authentication.getAuthorities().stream().anyMatch(a -> "ROLE_HOD".equals(a.getAuthority()));
        boolean isReqFaculty = authentication.getAuthorities().stream().anyMatch(a -> "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isReqStudent = authentication.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()));

        // Check if self
        boolean isSelf = false;
        if (targetAccount != null) {
            if (requestingUsername.equalsIgnoreCase(targetAccount.getUsername())) {
                isSelf = true;
            }
            if (requestingAccount != null && requestingAccount.getStudentId() != null
                    && targetAccount.getStudentId() != null
                    && requestingAccount.getStudentId().equalsIgnoreCase(targetAccount.getStudentId())) {
                isSelf = true;
            }
        } else if (targetStudent != null) {
            if (requestingUsername.equalsIgnoreCase(targetStudent.getStudentId())) {
                isSelf = true;
            }
            if (requestingAccount != null && requestingAccount.getStudentId() != null
                    && requestingAccount.getStudentId().equalsIgnoreCase(targetStudent.getStudentId())) {
                isSelf = true;
            }
        }

        // Own details are ALWAYS allowed for all roles
        if (isSelf) {
            return targetAccount != null ? buildUserInfoDto(targetAccount) : buildUserInfoDto(targetStudent);
        }

        // 1. STUDENT requester: can see ONLY own details
        if (isReqStudent) {
            throw new AccessDeniedException("Access denied: Students can only view their own details.");
        }

        // 2. FACULTY requester: can see details of ONLY students who have an actual attendance record
        // in a lecture created by that Faculty. Cannot see other Faculty, HOD, or Admin.
        if (isReqFaculty && !isReqHod && !isReqAdmin) {
            if ("ROLE_STUDENT".equals(targetRole)) {
                Student student = targetStudent;
                if (student == null && targetAccount != null) {
                    String sid = (targetAccount.getStudentId() != null && !targetAccount.getStudentId().trim().isEmpty())
                            ? targetAccount.getStudentId().trim()
                            : targetAccount.getUsername();
                    student = studentRepository.findByStudentId(sid).orElse(null);
                }
                if (student == null) {
                    throw new AccessDeniedException("Access denied: Faculty can only view students with verified lecture attendance.");
                }
                List<String> sessionCodes = lectureSessionRepository
                        .findByFacultyIdOrderBySessionDateDescSessionTimeDesc(requestingUsername)
                        .stream()
                        .map(com.smartattend.backend.entities.LectureSession::getSessionCode)
                        .filter(c -> c != null && !c.trim().isEmpty())
                        .toList();
                if (sessionCodes.isEmpty() || !attendanceRepository.existsByStudentAndSessionCodeIn(student, sessionCodes)) {
                    throw new AccessDeniedException("Access denied: Faculty can only view students who have attended their lectures.");
                }
                return targetAccount != null ? buildUserInfoDto(targetAccount) : buildUserInfoDto(student);
            } else {
                throw new AccessDeniedException("Access denied: Faculty cannot view other faculty, HOD, or Admin details.");
            }
        }

        // 3. HOD requester: can see student and faculty details. CANNOT see Admin details. CANNOT see other HOD.
        if (isReqHod && !isReqAdmin) {
            if ("ROLE_ADMIN".equals(targetRole)) {
                throw new AccessDeniedException("Access denied: HOD cannot view Admin details.");
            }
            if ("ROLE_HOD".equals(targetRole)) {
                throw new AccessDeniedException("Access denied: HOD cannot view another HOD's details.");
            }
            // Allowed for Student or Faculty
            return targetAccount != null ? buildUserInfoDto(targetAccount) : buildUserInfoDto(targetStudent);
        }

        // 4. ADMIN requester: can see student and faculty details. CANNOT see HOD details. CANNOT see other Admin.
        if (isReqAdmin) {
            if ("ROLE_HOD".equals(targetRole)) {
                throw new AccessDeniedException("Access denied: Admin cannot view HOD details.");
            }
            if ("ROLE_ADMIN".equals(targetRole)) {
                throw new AccessDeniedException("Access denied: Admin cannot view another Admin's details.");
            }
            // Allowed for Student or Faculty
            return targetAccount != null ? buildUserInfoDto(targetAccount) : buildUserInfoDto(targetStudent);
        }

        throw new AccessDeniedException("Access denied: Unauthorized to view user details.");
    }

    @Transactional
    public void deleteUser(Long id) {
        UserAccount account = userAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with database ID: " + id));
        if ("ROLE_ADMIN".equalsIgnoreCase(account.getRole()) || "ROLE_HOD".equalsIgnoreCase(account.getRole())) {
            throw new IllegalArgumentException("Admin and HOD accounts cannot be deleted.");
        }
        userAccountRepository.delete(account);
    }

    @Transactional
    public UserAccount updateFaculty(String facultyId, String fullName, String email) {
        if (facultyId == null || facultyId.trim().isEmpty()) {
            throw new IllegalArgumentException("Faculty ID is required.");
        }
        UserAccount account = userAccountRepository.findByUsername(facultyId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Faculty not found with ID: " + facultyId.trim()));
        if (fullName != null && !fullName.trim().isEmpty()) {
            account.setFullName(fullName.trim());
            List<Course> courses = courseRepository.findByAssignedFacultyId(facultyId.trim());
            for (Course c : courses) {
                c.setAssignedFacultyName(fullName.trim());
            }
            courseRepository.saveAll(courses);
        }
        if (email != null && !email.trim().isEmpty()) {
            account.setEmail(email.trim());
        }
        return userAccountRepository.save(account);
    }

    @Transactional
    public void deleteFaculty(String facultyId) {
        if (facultyId == null || facultyId.trim().isEmpty()) {
            throw new IllegalArgumentException("Faculty ID is required.");
        }
        UserAccount account = userAccountRepository.findByUsername(facultyId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Faculty not found with ID: " + facultyId.trim()));
        if ("ROLE_ADMIN".equalsIgnoreCase(account.getRole()) || "ROLE_HOD".equalsIgnoreCase(account.getRole())) {
            throw new IllegalArgumentException("Admin and HOD accounts cannot be deleted.");
        }
        userAccountRepository.delete(account);
    }

    @Transactional
    public void deactivateUser(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required.");
        }
        UserAccount account = userAccountRepository.findByUsername(username.trim())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username.trim()));
        if ("ROLE_ADMIN".equalsIgnoreCase(account.getRole()) || "ROLE_HOD".equalsIgnoreCase(account.getRole())) {
            throw new IllegalArgumentException("Admin and HOD accounts cannot be deleted.");
        }
        account.setEnabled(false);
        userAccountRepository.save(account);
        if (account.getStudentId() != null) {
            studentRepository.findByStudentId(account.getStudentId()).ifPresent(s -> {
                s.setActive(false);
                studentRepository.save(s);
            });
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initDefaultUsers() {
        // Seed 4 canonical institutional role accounts
        seedUserIfNotExists("admin", "Admin@123", "ROLE_ADMIN", null, "System Administrator", "admin@smartattend.edu");
        seedUserIfNotExists("hod", "Hod@123", "ROLE_HOD", null, "Head of Department", "hod@smartattend.edu");
        seedUserIfNotExists("123456", "123456@edu", "ROLE_FACULTY", null, "Prof. Faculty", "faculty123456@smartattend.edu");
        seedUserIfNotExists("12345678", "12345678@apsit", "ROLE_STUDENT", "12345678", "Student 12345678", "student12345678@smartattend.edu");
        seedStudentIfNotExists("12345678", "Student 12345678", "student12345678@smartattend.edu", "FE", 1, "A", "A1", "Computer Science");
        seedCanonicalCourse("FSJP", "Java", "Computer Science", "A", "ALL", "FE", 1, "THEORY", "123456", "Prof. Faculty");
    }

    private void seedCanonicalCourse(String courseId, String courseName, String branch, String division, String batch,
                                    String year, int semester, String courseType, String facultyId, String facultyName) {
        Optional<Course> existingOpt = courseRepository.findByCourseId(courseId);
        if (existingOpt.isEmpty()) {
            Course c = new Course(courseId, courseName, branch, division, batch, year, semester, courseType, facultyId, facultyName);
            courseRepository.save(c);
        } else {
            Course c = existingOpt.get();
            c.setCourseName(courseName);
            c.setBranch(branch);
            c.setDivision(division);
            c.setBatch(batch);
            c.setAcademicYear(year);
            c.setSemester(semester);
            c.setCourseType(courseType);
            c.setAssignedFacultyId(facultyId);
            c.setAssignedFacultyName(facultyName);
            courseRepository.save(c);
        }
    }

    private void seedUserIfNotExists(String username, String plainPassword, String role, String studentId, String fullName, String email) {
        Optional<UserAccount> existing = userAccountRepository.findByUsername(username);
        if (existing.isPresent()) {
            UserAccount account = existing.get();
            if (!passwordEncoder.matches(plainPassword, account.getPasswordHash())) {
                account.setPasswordHash(passwordEncoder.encode(plainPassword));
            }
            account.setEnabled(true);
            account.setRole(role);
            userAccountRepository.save(account);
        } else {
            registerUser(username, plainPassword, role, studentId, fullName, email);
        }
    }

    private void seedStudentIfNotExists(String studentId, String name, String email, String year, int semester, String division, String batch, String branch) {
        Optional<Student> existingOpt = studentRepository.findByStudentId(studentId);
        if (existingOpt.isEmpty()) {
            Student st = new Student(studentId, name, email, branch, division, year, semester, batch);
            studentRepository.save(st);
        } else {
            Student st = existingOpt.get();
            st.setBranch(branch);
            st.setDivision(division);
            st.setBatch(batch);
            st.setAcademicYear(year);
            st.setSemester(semester);
            studentRepository.save(st);
        }
    }
}
