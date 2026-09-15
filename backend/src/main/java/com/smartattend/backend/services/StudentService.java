package com.smartattend.backend.services;

import com.smartattend.backend.dtos.ClassmateDto;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StudentService {

    private final StudentRepository studentRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public static final Set<String> VALID_BRANCHES = Set.of(
            "Computer Science",
            "CS",
            "Information Technology",
            "IT",
            "Artificial Intelligence and Machine Learning",
            "AIML",
            "Data Science",
            "DS",
            "Mechanical Engineering",
            "ME",
            "Civil Engineering",
            "CE"
    );
    public static final Set<String> VALID_DIVISIONS = Set.of("A", "B", "C");
    public static final Set<String> VALID_BATCHES = Set.of("A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3");

    public StudentService(StudentRepository studentRepository,
                          AttendanceRepository attendanceRepository,
                          UserAccountRepository userAccountRepository,
                          PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.attendanceRepository = attendanceRepository;
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private void validateStudentCohort(Student student) {
        if (student.getBranch() != null && !student.getBranch().trim().isEmpty()) {
            boolean valid = VALID_BRANCHES.stream().anyMatch(b -> b.equalsIgnoreCase(student.getBranch().trim()));
            if (!valid) {
                throw new IllegalArgumentException("Invalid branch: " + student.getBranch() + ". Must be a recognized institutional branch.");
            }
        }
        if (student.getDivision() != null && !student.getDivision().trim().isEmpty()) {
            String div = student.getDivision().trim().toUpperCase();
            if (!VALID_DIVISIONS.contains(div)) {
                throw new IllegalArgumentException("Invalid division: " + div + ". Must be A, B, or C.");
            }
            student.setDivision(div);
        }
        if (student.getBatch() != null && !student.getBatch().trim().isEmpty()) {
            String batch = student.getBatch().trim().toUpperCase();
            String div = student.getDivision() != null ? student.getDivision().trim().toUpperCase() : "A";
            if (!batch.startsWith(div)) {
                throw new IllegalArgumentException("Invalid batch: " + batch + " does not belong to Division " + div);
            }
            if (!VALID_BATCHES.contains(batch)) {
                throw new IllegalArgumentException("Invalid batch: " + batch + ". Must be one of A1-A3, B1-B3, C1-C3.");
            }
            student.setBatch(batch);
        }
    }

    @Transactional
    public Student createStudent(Student student) {
        if (student.getStudentId() == null || student.getStudentId().trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID is required.");
        }
        String safeStudentId = student.getStudentId().trim();
        if (!safeStudentId.matches("^\\d{8}$")) {
            throw new IllegalArgumentException("Student ID must be exactly 8 numeric digits.");
        }
        if (student.getStudentName() == null || student.getStudentName().trim().isEmpty()) {
            throw new IllegalArgumentException("Student Name is required.");
        }
        if (student.getEmail() == null || student.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Student Email is required.");
        }

        if (studentRepository.findByStudentId(safeStudentId).isPresent()) {
            throw new IllegalArgumentException("Student with ID " + safeStudentId + " already exists.");
        }
        if (studentRepository.findByEmail(student.getEmail().trim()).isPresent()) {
            throw new IllegalArgumentException("Student with email " + student.getEmail().trim() + " already exists.");
        }

        student.setStudentId(safeStudentId);
        student.setStudentName(student.getStudentName().trim());
        student.setEmail(student.getEmail().trim());
        validateStudentCohort(student);

        Student saved = studentRepository.save(student);

        // Automatically create the linked UserAccount with default password <student_id>@apsit
        if (!userAccountRepository.existsByUsername(safeStudentId)) {
            String defaultPassword = safeStudentId + "@apsit";
            UserAccount account = new UserAccount(
                    safeStudentId,
                    passwordEncoder.encode(defaultPassword),
                    "ROLE_STUDENT",
                    safeStudentId,
                    saved.getStudentName(),
                    saved.getEmail()
            );
            userAccountRepository.save(account);
        }

        return saved;
    }

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public Optional<Student> getStudentById(Long id) {
        return studentRepository.findById(id);
    }

    public Optional<Student> getStudentByStudentId(String studentId) {
        return studentRepository.findByStudentId(studentId);
    }

    @Transactional
    public Student updateStudent(Long id, Student updated) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student with database ID " + id + " not found."));

        if (updated.getStudentName() != null && !updated.getStudentName().trim().isEmpty()) {
            student.setStudentName(updated.getStudentName().trim());
        }
        if (updated.getEmail() != null && !updated.getEmail().trim().isEmpty()) {
            student.setEmail(updated.getEmail().trim());
        }
        if (updated.getBranch() != null) student.setBranch(updated.getBranch().trim());
        if (updated.getDivision() != null) student.setDivision(updated.getDivision().trim());
        if (updated.getBatch() != null) student.setBatch(updated.getBatch().trim());
        if (updated.getAcademicYear() != null) student.setAcademicYear(updated.getAcademicYear().trim());
        if (updated.getSemester() != null) student.setSemester(updated.getSemester());
        validateStudentCohort(student);

        Student saved = studentRepository.save(student);

        userAccountRepository.findByStudentId(student.getStudentId()).ifPresent(acc -> {
            acc.setFullName(saved.getStudentName());
            acc.setEmail(saved.getEmail());
            userAccountRepository.save(acc);
        });

        return saved;
    }

    /**
     * Delete student and cascade delete their linked attendance records
     * to ensure database integrity without foreign key violations.
     */
    @Transactional
    public void deleteStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student with database ID " + id + " not found."));
        List<Attendance> attendances = attendanceRepository.findByStudent(student);
        if (!attendances.isEmpty()) {
            attendanceRepository.deleteAll(attendances);
        }
        userAccountRepository.findByStudentId(student.getStudentId())
                .ifPresent(userAccountRepository::delete);
        studentRepository.delete(student);
    }

    /**
     * Retrieves authorized classmates for a student based strictly on backend cohort identity
     * (academicYear, semester, batch) and shared enrolled courses.
     * Prevents students from accessing unauthorized academic cohorts or unrelated student records.
     */
    public List<ClassmateDto> getAuthorizedClassmates(String requestingStudentId, String courseFilter, String batchFilter) {
        if (requestingStudentId == null || requestingStudentId.trim().isEmpty()) {
            throw new IllegalArgumentException("Requesting student ID is required.");
        }

        Student requestingStudent = studentRepository.findByStudentId(requestingStudentId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Student '" + requestingStudentId + "' not found."));

        String reqYear = requestingStudent.getAcademicYear() != null ? requestingStudent.getAcademicYear() : "FE";
        String reqBatch = requestingStudent.getBatch() != null ? requestingStudent.getBatch() : "E1";
        Integer reqSemester = requestingStudent.getSemester() != null ? requestingStudent.getSemester() : 1;

        // Query requesting student's enrolled courses from attendance records
        List<Attendance> reqAttendances = attendanceRepository.findByStudent(requestingStudent);
        Set<String> reqCourseIds = reqAttendances.stream()
                .map(a -> a.getCourse().getCourseId())
                .collect(Collectors.toSet());

        List<Student> allStudents = studentRepository.findAll();
        List<ClassmateDto> authorizedClassmates = new ArrayList<>();

        for (Student peer : allStudents) {
            // Determine peer's enrolled courses
            List<Attendance> peerAttendances = attendanceRepository.findByStudent(peer);
            Set<String> peerCourses = peerAttendances.stream()
                    .map(a -> a.getCourse().getCourseId())
                    .collect(Collectors.toSet());

            // Check authorization: Must share same cohort (academicYear + batch) OR share an enrolled course
            boolean sharesCohort = reqYear.equalsIgnoreCase(peer.getAcademicYear())
                    && reqBatch.equalsIgnoreCase(peer.getBatch());

            boolean sharesCourse = reqCourseIds.stream().anyMatch(peerCourses::contains);

            if (sharesCohort || sharesCourse) {
                // Apply optional filters strictly within the authorized set
                if (courseFilter != null && !courseFilter.trim().isEmpty()) {
                    if (!peerCourses.contains(courseFilter.trim())) {
                        continue;
                    }
                }
                if (batchFilter != null && !batchFilter.trim().isEmpty()) {
                    if (peer.getBatch() == null || !peer.getBatch().equalsIgnoreCase(batchFilter.trim())) {
                        continue;
                    }
                }

                String peerEmail = peer.getStudentId().equalsIgnoreCase(requestingStudentId) ? peer.getEmail() : null;
                authorizedClassmates.add(new ClassmateDto(
                        peer.getStudentId(),
                        peer.getStudentName(),
                        peerEmail,
                        peer.getAcademicYear(),
                        peer.getSemester(),
                        peer.getBatch(),
                        new ArrayList<>(peerCourses)
                ));
            }
        }

        return authorizedClassmates;
    }

    /**
     * Retrieves an authorized classmate profile for peer contact.
     * Enforces privacy by returning only peer-appropriate information and rejecting unauthorized access.
     */
    public ClassmateDto getClassmateProfile(String requestingStudentId, String targetStudentId) {
        if (requestingStudentId == null || targetStudentId == null) {
            throw new IllegalArgumentException("Both requesting and target student IDs are required.");
        }

        Student target = studentRepository.findByStudentId(targetStudentId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Student '" + targetStudentId + "' not found."));

        if (!requestingStudentId.trim().equalsIgnoreCase(targetStudentId.trim())) {
            List<ClassmateDto> authorized = getAuthorizedClassmates(requestingStudentId, null, null);
            boolean isAuthorized = authorized.stream()
                    .anyMatch(c -> c.getStudentId().equalsIgnoreCase(targetStudentId.trim()));

            if (!isAuthorized) {
                throw new org.springframework.security.access.AccessDeniedException("Unauthorized: You do not have permission to view profiles outside your academic cohort or enrolled courses.");
            }
        }

        List<Attendance> attendances = attendanceRepository.findByStudent(target);
        List<String> courses = attendances.stream()
                .map(a -> a.getCourse().getCourseId())
                .distinct()
                .collect(Collectors.toList());

        String targetEmail = requestingStudentId.trim().equalsIgnoreCase(targetStudentId.trim()) ? target.getEmail() : null;
        return new ClassmateDto(
                target.getStudentId(),
                target.getStudentName(),
                targetEmail,
                target.getAcademicYear(),
                target.getSemester(),
                target.getBatch(),
                courses
        );
    }
}

