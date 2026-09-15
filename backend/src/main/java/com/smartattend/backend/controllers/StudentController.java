package com.smartattend.backend.controllers;

import com.smartattend.backend.dtos.ClassmateDto;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.services.StudentService;
import com.smartattend.backend.services.UserAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService studentService;
    private final UserAccountService userAccountService;
    private final com.smartattend.backend.repositories.LectureSessionRepository lectureSessionRepository;
    private final com.smartattend.backend.repositories.AttendanceRepository attendanceRepository;

    public StudentController(StudentService studentService,
                             UserAccountService userAccountService,
                             com.smartattend.backend.repositories.LectureSessionRepository lectureSessionRepository,
                             com.smartattend.backend.repositories.AttendanceRepository attendanceRepository) {
        this.studentService = studentService;
        this.userAccountService = userAccountService;
        this.lectureSessionRepository = lectureSessionRepository;
        this.attendanceRepository = attendanceRepository;
    }

    /**
     * Create a new student.
     * POST /api/students
     */
    @PostMapping
    public ResponseEntity<?> createStudent(@RequestBody Student student) {
        try {
            Student created = studentService.createStudent(student);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * View all students.
     * GET /api/students
     */
    @GetMapping
    public ResponseEntity<?> getAllStudents(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream().noneMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only Admin or HOD can list all students."));
        }
        List<Student> students = studentService.getAllStudents();
        return ResponseEntity.ok(students);
    }

    /**
     * View a student by internal database ID.
     * Enforces student ownership and faculty lecture attendance matrix.
     * GET /api/students/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getStudentById(@PathVariable Long id, Authentication authentication) {
        return studentService.getStudentById(id)
                .<ResponseEntity<?>>map(student -> {
                    if (!isAuthorizedForStudent(authentication, student)) {
                        Map<String, String> error = new HashMap<>();
                        error.put("error", "Access denied: You are not authorized to view this student's details.");
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
                    }
                    return ResponseEntity.ok(student);
                })
                .orElseGet(() -> {
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "Student with database ID " + id + " not found.");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
                });
    }

    /**
     * View a student by their unique student ID (e.g. STU101).
     * Enforces student ownership: STU101 requesting STU102 receives 403 Forbidden.
     * Enforces faculty lecture attendance: Faculty can ONLY view students who attended their lecture.
     * GET /api/students/search/{studentId}
     */
    @GetMapping("/search/{studentId}")
    public ResponseEntity<?> getStudentByStudentId(@PathVariable String studentId, Authentication authentication) {
        var optStudent = studentService.getStudentByStudentId(studentId);
        if (optStudent.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Student with student ID '" + studentId + "' not found.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        Student student = optStudent.get();
        if (!isAuthorizedForStudent(authentication, student)) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Access denied: You are not authorized to view this student's profile.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        }
        return ResponseEntity.ok(student);
    }

    /**
     * Update a student by database ID.
     * PUT /api/students/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStudent(@PathVariable Long id, @RequestBody Student student) {
        try {
            Student updated = studentService.updateStudent(id, student);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * Delete a student by database ID.
     * DELETE /api/students/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStudent(@PathVariable Long id) {
        try {
            studentService.deleteStudent(id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Student with database ID " + id + " deleted successfully.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * Get authorized classmates for a student directory (cohort/course-based authorization).
     * GET /api/students/classmates?studentId=STU101&courseId=CS101&batch=E1
     */
    @GetMapping("/classmates")
    public ResponseEntity<?> getClassmates(
            @RequestParam(required = false) String studentId,
            @RequestHeader(value = "X-Student-Id", required = false) String headerStudentId,
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String batch,
            Authentication authentication) {

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()));

        String effectiveStudentId = resolveEffectiveStudentId(authentication, studentId, headerStudentId);

        if ((effectiveStudentId == null || effectiveStudentId.trim().isEmpty()) && isAdmin) {
            var all = studentService.getAllStudents();
            if (!all.isEmpty()) {
                effectiveStudentId = all.get(0).getStudentId();
            } else {
                effectiveStudentId = "STU101";
            }
        }

        if (effectiveStudentId == null || effectiveStudentId.trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Requesting student ID is required.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        try {
            List<ClassmateDto> classmates = studentService.getAuthorizedClassmates(
                    effectiveStudentId, courseId, batch);
            return ResponseEntity.ok(classmates);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }
    }

    /**
     * Get authorized classmate profile for peer contact.
     * GET /api/students/classmates/{targetStudentId}/profile?studentId=STU101
     */
    @GetMapping("/classmates/{targetStudentId}/profile")
    public ResponseEntity<?> getClassmateProfile(
            @PathVariable String targetStudentId,
            @RequestParam(required = false) String studentId,
            @RequestHeader(value = "X-Student-Id", required = false) String headerStudentId,
            Authentication authentication) {

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()));

        if (isAdmin) {
            var optStudent = studentService.getStudentByStudentId(targetStudentId);
            if (optStudent.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Classmate profile not found."));
            }
            Student s = optStudent.get();
            return ResponseEntity.ok(new ClassmateDto(
                    s.getStudentId(),
                    s.getStudentName(),
                    s.getEmail(),
                    s.getAcademicYear(),
                    s.getSemester(),
                    s.getBatch(),
                    java.util.List.of()
            ));
        }

        String effectiveStudentId = resolveEffectiveStudentId(authentication, studentId, headerStudentId);

        if (effectiveStudentId == null || effectiveStudentId.trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Requesting student ID is required.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        try {
            ClassmateDto profile = studentService.getClassmateProfile(
                    effectiveStudentId, targetStudentId);
            return ResponseEntity.ok(profile);
        } catch (org.springframework.security.access.AccessDeniedException | SecurityException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }
    }

    private boolean isAuthorizedForStudent(Authentication authentication, Student student) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return false;
        }

        // Admin and HOD can see student details
        boolean isAdminOrHod = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        if (isAdminOrHod) {
            return true;
        }

        // Student can see ONLY own details
        boolean isStudent = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_STUDENT".equals(a.getAuthority()));
        if (isStudent) {
            String username = authentication.getName();
            UserAccount account = userAccountService.findByUsername(username).orElse(null);
            String requesterStudentId = (account != null && account.getStudentId() != null)
                    ? account.getStudentId()
                    : username;
            return requesterStudentId.equalsIgnoreCase(student.getStudentId());
        }

        // Faculty: Can see details of ONLY students who have an actual attendance record
        // in a Class/Lecture created by that Faculty.
        boolean isFaculty = authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        if (isFaculty) {
            String facultyId = authentication.getName();
            java.util.List<String> sessionCodes = lectureSessionRepository
                    .findByFacultyIdOrderBySessionDateDescSessionTimeDesc(facultyId)
                    .stream()
                    .map(com.smartattend.backend.entities.LectureSession::getSessionCode)
                    .filter(c -> c != null && !c.trim().isEmpty())
                    .toList();
            if (sessionCodes.isEmpty()) {
                return false;
            }
            return attendanceRepository.existsByStudentAndSessionCodeIn(student, sessionCodes);
        }

        return false;
    }

    private boolean isAuthorizedForStudent(Authentication authentication, String targetStudentId) {
        return studentService.getStudentByStudentId(targetStudentId)
                .map(s -> isAuthorizedForStudent(authentication, s))
                .orElse(false);
    }

    private String resolveEffectiveStudentId(Authentication authentication, String paramStudentId, String headerStudentId) {
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            String username = authentication.getName();
            UserAccount account = userAccountService.findByUsername(username).orElse(null);
            if (account != null && account.getStudentId() != null) {
                return account.getStudentId();
            }
        }
        return (paramStudentId != null && !paramStudentId.trim().isEmpty()) ? paramStudentId.trim() : headerStudentId;
    }
}
