package com.smartattend.backend.services;

import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.LectureSession;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.LectureSessionRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LectureSessionService {

    public static final Set<String> VALID_DIVISIONS = Set.of("A", "B", "C");
    public static final Set<String> VALID_LECTURE_TYPES = Set.of("THEORY", "LAB");
    public static final Set<String> VALID_BATCHES = Set.of("A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3");

    private final LectureSessionRepository lectureSessionRepository;
    private final CourseRepository courseRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final UserAccountRepository userAccountRepository;

    public LectureSessionService(LectureSessionRepository lectureSessionRepository,
                                 CourseRepository courseRepository,
                                 AttendanceRepository attendanceRepository,
                                 StudentRepository studentRepository,
                                 UserAccountRepository userAccountRepository) {
        this.lectureSessionRepository = lectureSessionRepository;
        this.courseRepository = courseRepository;
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional
    public LectureSession createLectureSession(LectureSession session, String requestingUsername, String requestingRole) {
        if (session == null) {
            throw new IllegalArgumentException("Lecture session cannot be null.");
        }
        if (session.getCourseId() == null || session.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }

        Course course = courseRepository.findByCourseId(session.getCourseId().trim())
                .orElseThrow(() -> new IllegalArgumentException("Course not found: " + session.getCourseId()));

        // Authoritative permission check: Only Faculty and Admin can create classes/lectures
        boolean isTeacherOrFaculty = "ROLE_TEACHER".equalsIgnoreCase(requestingRole) || "ROLE_FACULTY".equalsIgnoreCase(requestingRole);
        boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(requestingRole);
        if (!isTeacherOrFaculty && !isAdmin) {
            throw new AccessDeniedException("Access denied: HOD and Students cannot schedule lectures. Only Faculty and Admin are authorized.");
        }
        if (isAdmin) {
            String facultyIdToUse = (session.getFacultyId() != null && !session.getFacultyId().trim().isEmpty())
                    ? session.getFacultyId().trim()
                    : (course.getAssignedFacultyId() != null ? course.getAssignedFacultyId() : requestingUsername);
            session.setFacultyId(facultyIdToUse);
            Optional<UserAccount> facultyAccount = userAccountRepository.findByUsername(facultyIdToUse);
            session.setFacultyName(facultyAccount.map(UserAccount::getFullName)
                    .orElse(course.getAssignedFacultyName() != null ? course.getAssignedFacultyName() : facultyIdToUse));
        } else {
            if (course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(requestingUsername)) {
                throw new AccessDeniedException("Faculty can only create classes/lectures for courses assigned to them.");
            }
            session.setFacultyId(requestingUsername);
            Optional<UserAccount> facultyAccount = userAccountRepository.findByUsername(requestingUsername);
            session.setFacultyName(facultyAccount.map(UserAccount::getFullName).orElse(course.getAssignedFacultyName() != null ? course.getAssignedFacultyName() : requestingUsername));
        }

        session.setCourseName(course.getCourseName());

        // 1. Validate Lecture Type (THEORY or LAB)
        String lectureType = session.getLectureType() != null ? session.getLectureType().trim().toUpperCase() : "THEORY";
        if (!VALID_LECTURE_TYPES.contains(lectureType)) {
            throw new IllegalArgumentException("Invalid lecture type: " + session.getLectureType() + ". Must be 'THEORY' or 'LAB'.");
        }
        session.setLectureType(lectureType);

        if (session.getAcademicYear() == null || session.getAcademicYear().trim().isEmpty()) {
            session.setAcademicYear(course.getAcademicYear() != null ? course.getAcademicYear() : "FE");
        }

        // 2. Validate Division (A, B, or C)
        String division = session.getDivision() != null && !session.getDivision().trim().isEmpty()
                ? session.getDivision().trim().toUpperCase()
                : (course.getDivision() != null ? course.getDivision().trim().toUpperCase() : "A");
        if (!VALID_DIVISIONS.contains(division)) {
            throw new IllegalArgumentException("Invalid division: " + division + ". Must be A, B, or C.");
        }
        session.setDivision(division);

        // 3. Validate Batch (ALL for theory, or valid batch A1-A3, B1-B3, C1-C3 belonging to division)
        String batch = session.getBatch() != null && !session.getBatch().trim().isEmpty()
                ? session.getBatch().trim().toUpperCase()
                : ("THEORY".equals(lectureType) ? "ALL" : (course.getBatch() != null ? course.getBatch().trim().toUpperCase() : "ALL"));
        if (!"ALL".equalsIgnoreCase(batch)) {
            if (!batch.startsWith(division)) {
                throw new IllegalArgumentException("Invalid batch: " + batch + " does not belong to Division " + division);
            }
            if (!VALID_BATCHES.contains(batch)) {
                throw new IllegalArgumentException("Invalid batch: " + batch + ". Must be one of A1-A3, B1-B3, C1-C3.");
            }
        }
        session.setBatch(batch);

        if (session.getSessionDate() == null) {
            session.setSessionDate(LocalDate.now());
        }
        if (session.getSessionTime() == null || session.getSessionTime().trim().isEmpty()) {
            session.setSessionTime("10:00 AM");
        }

        // Generate unique, readable session code: SES_<courseId>_<div/batch>_<timestamp>
        String divPart = session.getDivision().replaceAll("[^A-Za-z0-9]", "");
        String batchPart = session.getBatch().replaceAll("[^A-Za-z0-9]", "");
        String rawCode = "SES_" + session.getCourseId().replaceAll("[^A-Za-z0-9]", "") + "_" + divPart + "_" + batchPart + "_" + System.currentTimeMillis();
        session.setSessionCode(rawCode);
        session.setActive(true);

        LectureSession saved = lectureSessionRepository.save(session);
        enrichSessionMetrics(saved);
        return saved;
    }

    public List<LectureSession> getAllSessions() {
        List<LectureSession> sessions = lectureSessionRepository.findAllByOrderBySessionDateDescSessionTimeDesc();
        sessions.forEach(this::enrichSessionMetrics);
        return sessions;
    }

    public List<LectureSession> getSessionsByFaculty(String facultyId) {
        if (facultyId == null) {
            return new ArrayList<>();
        }
        List<LectureSession> sessions = lectureSessionRepository.findByFacultyIdOrderBySessionDateDescSessionTimeDesc(facultyId);
        sessions.forEach(this::enrichSessionMetrics);
        return sessions;
    }

    public List<LectureSession> getSessionsByCourse(String courseId) {
        if (courseId == null) {
            return new ArrayList<>();
        }
        List<LectureSession> sessions = lectureSessionRepository.findByCourseIdOrderBySessionDateDescSessionTimeDesc(courseId);
        sessions.forEach(this::enrichSessionMetrics);
        return sessions;
    }

    public List<LectureSession> getSessionsForStudent(String studentId) {
        if (studentId == null || studentId.trim().isEmpty()) {
            return new ArrayList<>();
        }
        Optional<Student> studentOpt = studentRepository.findByStudentId(studentId.trim());
        if (studentOpt.isEmpty()) {
            Optional<UserAccount> userOpt = userAccountRepository.findByUsername(studentId.trim());
            if (userOpt.isPresent() && userOpt.get().getStudentId() != null) {
                studentOpt = studentRepository.findByStudentId(userOpt.get().getStudentId().trim());
            }
        }
        if (studentOpt.isEmpty()) {
            return new ArrayList<>();
        }

        Student student = studentOpt.get();
        List<LectureSession> allSessions = lectureSessionRepository.findAllByOrderBySessionDateDescSessionTimeDesc();

        return allSessions.stream().filter(s -> {
            // 1. Division check: mandatory! Student in Division B cannot see Division A or C
            if (s.getDivision() != null && student.getDivision() != null) {
                if (!s.getDivision().trim().equalsIgnoreCase(student.getDivision().trim())) {
                    return false;
                }
            }
            // 2. Batch check: if class is assigned to B1, only B1 student sees it. If ALL, all batches in division see it.
            if (s.getBatch() != null && !"ALL".equalsIgnoreCase(s.getBatch().trim())) {
                if (student.getBatch() == null || !s.getBatch().trim().equalsIgnoreCase(student.getBatch().trim())) {
                    return false;
                }
            }
            // 3. Academic Year check
            if (s.getAcademicYear() != null && student.getAcademicYear() != null) {
                if (!s.getAcademicYear().trim().equalsIgnoreCase(student.getAcademicYear().trim())) {
                    return false;
                }
            }
            // 4. Branch & Semester check via course
            if (s.getCourseId() != null) {
                Optional<Course> courseOpt = courseRepository.findByCourseId(s.getCourseId().trim());
                if (courseOpt.isPresent()) {
                    Course course = courseOpt.get();
                    if (course.getBranch() != null && student.getBranch() != null) {
                        if (!course.getBranch().trim().equalsIgnoreCase(student.getBranch().trim())) {
                            return false;
                        }
                    }
                    if (course.getSemester() != null && student.getSemester() != null) {
                        if (!course.getSemester().equals(student.getSemester())) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }).peek(this::enrichSessionMetrics).collect(Collectors.toList());
    }

    public Optional<LectureSession> getSessionById(Long id) {
        Optional<LectureSession> session = lectureSessionRepository.findById(id);
        session.ifPresent(this::enrichSessionMetrics);
        return session;
    }

    public Optional<LectureSession> getSessionByCode(String sessionCode) {
        Optional<LectureSession> session = lectureSessionRepository.findBySessionCode(sessionCode);
        session.ifPresent(this::enrichSessionMetrics);
        return session;
    }

    @Transactional
    public LectureSession toggleActive(Long id, boolean active) {
        LectureSession session = lectureSessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture session not found with ID: " + id));
        session.setActive(active);
        LectureSession saved = lectureSessionRepository.save(session);
        enrichSessionMetrics(saved);
        return saved;
    }

    @Transactional
    public void deleteSession(Long id, String requestingUsername, String requestingRole) {
        LectureSession session = lectureSessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture session not found with ID: " + id));

        boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(requestingRole) || "ADMIN".equalsIgnoreCase(requestingRole);
        boolean isFaculty = "ROLE_FACULTY".equalsIgnoreCase(requestingRole) || "ROLE_TEACHER".equalsIgnoreCase(requestingRole)
                || "FACULTY".equalsIgnoreCase(requestingRole) || "TEACHER".equalsIgnoreCase(requestingRole);

        if (!isAdmin && !isFaculty) {
            throw new AccessDeniedException("Access denied: Only Faculty and Admin can delete class sessions.");
        }

        if (isFaculty && !isAdmin) {
            if (session.getFacultyId() == null || !session.getFacultyId().equalsIgnoreCase(requestingUsername)) {
                throw new AccessDeniedException("Access denied: Faculty can only delete class sessions they themselves created.");
            }
        }

        // Cascade deletion of attendance records linked to this session
        if (session.getSessionCode() != null && !session.getSessionCode().trim().isEmpty()) {
            List<Attendance> linkedAttendance = attendanceRepository.findBySessionCode(session.getSessionCode());
            if (linkedAttendance != null && !linkedAttendance.isEmpty()) {
                attendanceRepository.deleteAll(linkedAttendance);
            }
        }

        lectureSessionRepository.delete(session);
    }

    @Transactional
    public void deleteSession(Long id) {
        LectureSession session = lectureSessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture session not found with ID: " + id));
        if (session.getSessionCode() != null && !session.getSessionCode().trim().isEmpty()) {
            List<Attendance> linkedAttendance = attendanceRepository.findBySessionCode(session.getSessionCode());
            if (linkedAttendance != null && !linkedAttendance.isEmpty()) {
                attendanceRepository.deleteAll(linkedAttendance);
            }
        }
        lectureSessionRepository.delete(session);
    }

    public List<Attendance> getAttendanceForSession(String sessionCode) {
        return attendanceRepository.findBySessionCode(sessionCode);
    }

    private void enrichSessionMetrics(LectureSession session) {
        if (session.getSessionCode() != null) {
            long count = attendanceRepository.countBySessionCode(session.getSessionCode());
            session.setAttendanceCount(count);
        }
        // Calculate cohort student count
        long total = studentRepository.count();
        session.setTotalStudents(total);
    }
}
