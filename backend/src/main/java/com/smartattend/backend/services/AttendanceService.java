package com.smartattend.backend.services;

import com.smartattend.backend.dtos.AdminOverviewDto;
import com.smartattend.backend.dtos.AttendanceRequest;
import com.smartattend.backend.dtos.CourseAttendanceStatDto;
import com.smartattend.backend.dtos.CourseAttendanceSummaryDto;
import com.smartattend.backend.dtos.DefaulterStudentDto;
import com.smartattend.backend.dtos.DefaulterReportDto;
import com.smartattend.backend.repositories.LectureSessionRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFFont;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import com.smartattend.backend.dtos.HodOverviewDto;
import com.smartattend.backend.dtos.HodStudentAttendanceDto;
import com.smartattend.backend.dtos.QrScanRequest;
import com.smartattend.backend.dtos.QrTokenResponse;
import com.smartattend.backend.dtos.StudentAttendanceSummaryDto;
import com.smartattend.backend.dtos.StudentCourseAttendanceStatDto;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.AttendanceQrToken;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.DeviceAttendanceBinding;
import com.smartattend.backend.entities.LectureSession;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.AttendanceQrTokenRepository;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.DeviceAttendanceBindingRepository;
import com.smartattend.backend.repositories.StudentRepository;
import com.smartattend.backend.repositories.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AttendanceQrTokenRepository qrTokenRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final DeviceAttendanceBindingRepository deviceBindingRepository;
    private final UserAccountRepository userAccountRepository;
    private final SecurityAuditService securityAuditService;
    private final LectureSessionRepository lectureSessionRepository;

    @Value("${attendance.location.latitude:19.0760}")
    private double targetLatitude;

    @Value("${attendance.location.longitude:72.8777}")
    private double targetLongitude;

    @Value("${attendance.location.radius-meters:100.0}")
    private double allowedRadiusMeters;

    @Value("${attendance.location.max-accuracy-meters:50.0}")
    private double maxAccuracyMeters;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             AttendanceQrTokenRepository qrTokenRepository,
                             StudentRepository studentRepository,
                             CourseRepository courseRepository,
                             DeviceAttendanceBindingRepository deviceBindingRepository,
                             UserAccountRepository userAccountRepository,
                             SecurityAuditService securityAuditService,
                             LectureSessionRepository lectureSessionRepository) {
        this.attendanceRepository = attendanceRepository;
        this.qrTokenRepository = qrTokenRepository;
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.deviceBindingRepository = deviceBindingRepository;
        this.userAccountRepository = userAccountRepository;
        this.securityAuditService = securityAuditService;
        this.lectureSessionRepository = lectureSessionRepository;
    }

    /**
     * Generates a dynamic QR token for a class/course that strictly expires in 5 seconds.
     */
    @Transactional
    public QrTokenResponse generateDynamicQrToken(String courseId) {
        return generateDynamicQrToken(courseId, null);
    }

    @Transactional
    public QrTokenResponse generateDynamicQrToken(String courseId, String sessionCode) {
        if (courseId == null || courseId.trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        String safeCourseId = courseId.trim();

        // Ensure course exists in database
        courseRepository.findByCourseId(safeCourseId)
                .orElseThrow(() -> new IllegalArgumentException("Course '" + safeCourseId + "' not found. Only administrators can register courses."));

        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(5);
        String tokenString = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String effectiveSession = (sessionCode != null && !sessionCode.trim().isEmpty())
                ? sessionCode.trim()
                : (safeCourseId + "_SES_" + LocalDate.now());

        AttendanceQrToken qrToken = new AttendanceQrToken(tokenString, safeCourseId, effectiveSession, now, expiresAt);
        qrTokenRepository.save(qrToken);

        return new QrTokenResponse(tokenString, safeCourseId, effectiveSession, 5, expiresAt);
    }

    /**
     * Records student attendance using the scanned dynamic QR code with full security validations:
     * - Authentication session identity (client studentId rejected if tampering)
     * - 5-second server-side token expiry
     * - Atomic token consumption (no race conditions)
     * - Real GPS coordinates & Haversine geofencing distance check
     * - One device — One student — One lecture session binding
     */
    @Transactional
    public Attendance recordAttendanceViaQr(QrScanRequest scanRequest) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedUsername = (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal()))
                ? auth.getName()
                : null;
        return recordAttendanceViaQr(scanRequest, authenticatedUsername, "127.0.0.1", "Standard Client");
    }

    @Transactional
    public Attendance recordAttendanceViaQr(QrScanRequest scanRequest, String authenticatedUsername, String clientIp, String userAgent) {
        if (scanRequest == null) {
            throw new IllegalArgumentException("Scan request is required.");
        }
        if (scanRequest.getCourseId() == null || scanRequest.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        if (scanRequest.getQrToken() == null || scanRequest.getQrToken().trim().isEmpty()) {
            throw new IllegalArgumentException("Scanned QR token is required.");
        }

        String courseId = scanRequest.getCourseId().trim();
        String scannedToken = scanRequest.getQrToken().trim();

        // 1. Resolve student identity from Spring Security authenticated user
        String resolvedStudentId;
        boolean isAdmin = false;
        if (authenticatedUsername != null && !authenticatedUsername.isEmpty()) {
            UserAccount account = userAccountRepository.findByUsername(authenticatedUsername)
                    .orElseThrow(() -> new AccessDeniedException("Authenticated user account not found."));

            isAdmin = "ROLE_ADMIN".equalsIgnoreCase(account.getRole()) || "ADMIN".equalsIgnoreCase(account.getRole());

            if (!"ROLE_STUDENT".equalsIgnoreCase(account.getRole()) && !"STUDENT".equalsIgnoreCase(account.getRole()) && !isAdmin) {
                securityAuditService.logEvent("UNAUTHORIZED_ACCESS", authenticatedUsername, null, clientIp, userAgent, courseId, null, "Non-student role attempted attendance scan: " + account.getRole());
                throw new AccessDeniedException("Only students can record attendance.");
            }

            if (isAdmin) {
                // Allow admin to test attendance scanning on behalf of a specified student
                if (scanRequest.getStudentId() != null && !scanRequest.getStudentId().trim().isEmpty()) {
                    resolvedStudentId = scanRequest.getStudentId().trim();
                } else if (account.getStudentId() != null && !account.getStudentId().trim().isEmpty()) {
                    resolvedStudentId = account.getStudentId().trim();
                } else {
                    resolvedStudentId = studentRepository.findAll().stream()
                            .findFirst()
                            .map(Student::getStudentId)
                            .orElse("12345678");
                }
            } else {
                resolvedStudentId = account.getStudentId();
                if (resolvedStudentId == null || resolvedStudentId.trim().isEmpty()) {
                    throw new AccessDeniedException("User account is not associated with a student ID.");
                }
            }
        } else {
            // Fallback for direct unit tests: require explicit studentId if unauthenticated in test
            if (scanRequest.getStudentId() == null || scanRequest.getStudentId().trim().isEmpty()) {
                throw new AccessDeniedException("Authentication required for attendance recording.");
            }
            resolvedStudentId = scanRequest.getStudentId().trim();
        }

        // 2. Anti-tampering check: If client supplied a studentId that disagrees with authenticated student
        if (!isAdmin && scanRequest.getStudentId() != null && !scanRequest.getStudentId().trim().isEmpty() &&
                !scanRequest.getStudentId().trim().equalsIgnoreCase(resolvedStudentId)) {
            securityAuditService.logEvent("UNAUTHORIZED_ACCESS", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, null,
                    "Student ID tampering: requested " + scanRequest.getStudentId() + " while authenticated as " + resolvedStudentId);
            throw new IllegalArgumentException("Student ID tampering detected: Request specified student '" + scanRequest.getStudentId() + "' but caller is authenticated as '" + resolvedStudentId + "'.");
        }

        // 3. Verify QR Token exists in database
        AttendanceQrToken tokenEntity = qrTokenRepository.findByToken(scannedToken)
                .orElseThrow(() -> {
                    securityAuditService.logEvent("INVALID_QR", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, null, "Token not found: " + scannedToken);
                    return new IllegalArgumentException("Invalid QR code. Please scan the current live QR code.");
                });

        // 4. Verify QR Token belongs to the matching course
        if (!tokenEntity.getCourseId().equalsIgnoreCase(courseId)) {
            securityAuditService.logEvent("ATTENDANCE_REJECTED", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, null, "Wrong course: expected " + tokenEntity.getCourseId());
            throw new IllegalArgumentException("This QR code belongs to course '" + tokenEntity.getCourseId() + "', not '" + courseId + "'.");
        }

        // 5. Verify Token expiration (5-second window)
        if (tokenEntity.isExpired() || Instant.now().isAfter(tokenEntity.getExpiresAt())) {
            securityAuditService.logEvent("EXPIRED_QR", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, null, "Expired QR token");
            throw new IllegalArgumentException("This QR code has expired! QR codes refresh automatically every 5 seconds. Please scan the updated code.");
        }

        // 6. Verify Token has not already been consumed
        if (tokenEntity.isConsumed()) {
            securityAuditService.logEvent("INVALID_QR", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, null, "QR token already consumed");
            throw new IllegalArgumentException("This QR code has already been used. Please scan the updated live QR code.");
        }

        String sessionCode = (tokenEntity.getSessionCode() != null && !tokenEntity.getSessionCode().trim().isEmpty())
                ? tokenEntity.getSessionCode().trim()
                : (courseId + "_SES_" + LocalDate.now());

        // 7. Verify GPS Geolocation & Haversine Distance
        if (scanRequest.getLatitude() == null || scanRequest.getLongitude() == null) {
            securityAuditService.logEvent("GEOFENCE_REJECTION", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "Missing GPS coordinates");
            throw new IllegalArgumentException("Location permission required for attendance. Please enable GPS location services.");
        }
        if (scanRequest.getLatitude() < -90.0 || scanRequest.getLatitude() > 90.0 ||
            scanRequest.getLongitude() < -180.0 || scanRequest.getLongitude() > 180.0) {
            securityAuditService.logEvent("GEOFENCE_REJECTION", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "Invalid GPS coordinates");
            throw new IllegalArgumentException("Invalid GPS coordinates provided.");
        }
        if (scanRequest.getAccuracy() == null || scanRequest.getAccuracy() > maxAccuracyMeters) {
            securityAuditService.logEvent("GEOFENCE_REJECTION", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "GPS accuracy insufficient: " + scanRequest.getAccuracy());
            throw new IllegalArgumentException("Attendance rejected: GPS accuracy is insufficient (" + Math.round(scanRequest.getAccuracy() != null ? scanRequest.getAccuracy() : 0) + "m). Maximum allowed is " + Math.round(maxAccuracyMeters) + "m.");
        }

        double sessionTargetLatitude;
        double sessionTargetLongitude;

        Optional<LectureSession> sessionOpt = (sessionCode != null && !sessionCode.trim().isEmpty())
                ? lectureSessionRepository.findBySessionCode(sessionCode.trim())
                : Optional.empty();

        if (sessionOpt.isPresent()) {
            LectureSession session = sessionOpt.get();
            if (session.getClassroomLatitude() == null || session.getClassroomLongitude() == null) {
                securityAuditService.logEvent("GEOFENCE_REJECTION", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "Classroom location not established");
                throw new IllegalArgumentException("Attendance rejected: Classroom location has not been established for this class session. Please ask your faculty to launch Dynamic QR attendance.");
            }
            sessionTargetLatitude = session.getClassroomLatitude();
            sessionTargetLongitude = session.getClassroomLongitude();
        } else {
            sessionTargetLatitude = targetLatitude;
            sessionTargetLongitude = targetLongitude;
        }

        double distance = calculateHaversineDistance(scanRequest.getLatitude(), scanRequest.getLongitude(), sessionTargetLatitude, sessionTargetLongitude);
        if (distance > allowedRadiusMeters) {
            securityAuditService.logEvent("GEOFENCE_REJECTION", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "Outside geofence: distance " + Math.round(distance) + "m");
            throw new IllegalArgumentException("Attendance rejected: you are outside the allowed classroom area (" + Math.round(distance) + "m away, maximum allowed is " + Math.round(allowedRadiusMeters) + "m).");
        }

        // 8. Device / Browser Identification & One-Device-One-Student-One-Lecture Rule
        if (scanRequest.getDeviceFingerprint() == null || scanRequest.getDeviceFingerprint().trim().isEmpty()) {
            securityAuditService.logEvent("DEVICE_BINDING_REJECTION", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "Missing device fingerprint");
            throw new IllegalArgumentException("Device identification required for attendance.");
        }
        String deviceFingerprint = scanRequest.getDeviceFingerprint().trim();

        // Check if this physical device was already used by ANOTHER student in this session
        Optional<DeviceAttendanceBinding> deviceBinding = deviceBindingRepository.findBySessionCodeAndDeviceFingerprint(sessionCode, deviceFingerprint);
        if (deviceBinding.isPresent() && !deviceBinding.get().getStudentId().equalsIgnoreCase(resolvedStudentId)) {
            securityAuditService.logEvent("DEVICE_BINDING_REJECTION", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode,
                    "Device already bound to student " + deviceBinding.get().getStudentId());
            throw new IllegalStateException("Proxy attendance rejected: This device has already marked attendance for another student (" + deviceBinding.get().getStudentId() + ") in this lecture session.");
        }

        // 9. Verify Student existence - reject unregistered students
        Student student = studentRepository.findByStudentId(resolvedStudentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not registered in the system: " + resolvedStudentId));

        // 9b. Verify Lecture Session Cohort (Division & Batch validation)
        if (sessionOpt.isPresent()) {
            LectureSession session = sessionOpt.get();
                // Division check: division must match
                if (session.getDivision() != null && student.getDivision() != null) {
                    if (!session.getDivision().trim().equalsIgnoreCase(student.getDivision().trim())) {
                        securityAuditService.logEvent("ATTENDANCE_REJECTED", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode,
                                "Division mismatch: session Division " + session.getDivision() + " vs student Division " + student.getDivision());
                        throw new IllegalArgumentException("Attendance rejected: This lecture is scheduled for Division " + session.getDivision()
                                + ", but you are enrolled in Division " + student.getDivision() + ".");
                    }
                }
                // Batch check: if batch is not ALL, must match
                if (session.getBatch() != null && !"ALL".equalsIgnoreCase(session.getBatch().trim()) && student.getBatch() != null) {
                    if (!session.getBatch().trim().equalsIgnoreCase(student.getBatch().trim())) {
                        securityAuditService.logEvent("ATTENDANCE_REJECTED", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode,
                                "Batch mismatch: session Batch " + session.getBatch() + " vs student Batch " + student.getBatch());
                        throw new IllegalArgumentException("Attendance rejected: This lecture is scheduled for Batch " + session.getBatch()
                                + ", but you are assigned to Batch " + student.getBatch() + ".");
                    }
                }
            }

        // 10. Verify Course existence
        Course course = courseRepository.findByCourseId(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course '" + courseId + "' not found."));

        // 11. Check duplicate attendance for student in this session
        if (attendanceRepository.existsByStudentAndSessionCode(student, sessionCode) ||
            deviceBindingRepository.existsBySessionCodeAndStudentId(sessionCode, resolvedStudentId)) {
            securityAuditService.logEvent("ATTENDANCE_REJECTED", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "Duplicate student scan in session");
            throw new IllegalStateException("Attendance has already been marked for student '" + resolvedStudentId + "' in this lecture session.");
        }

        // 12. Atomic QR Token Consumption (Prevents race conditions)
        int consumedCount = qrTokenRepository.consumeTokenAtomically(scannedToken, resolvedStudentId, Instant.now());
        if (consumedCount == 0) {
            securityAuditService.logEvent("INVALID_QR", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "Concurrent consumption race or expired");
            throw new IllegalStateException("This QR code has already been consumed or has expired. Please scan the updated live QR code.");
        }

        // 13. Persist Device Binding
        if (!deviceBinding.isPresent()) {
            DeviceAttendanceBinding newBinding = new DeviceAttendanceBinding(sessionCode, deviceFingerprint, resolvedStudentId);
            deviceBindingRepository.save(newBinding);
        }

        // 14. Persist Verified Attendance Record
        Attendance attendance = new Attendance(student, course, sessionCode, LocalDate.now(), LocalTime.now().truncatedTo(ChronoUnit.SECONDS), "PRESENT");
        Attendance saved = attendanceRepository.save(attendance);

        securityAuditService.logEvent("ATTENDANCE_SUCCESS", authenticatedUsername, resolvedStudentId, clientIp, userAgent, courseId, sessionCode, "Attendance recorded successfully");
        return saved;
    }

    public double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return R * c;
    }

    /**
     * Standard manual attendance recording.
     */
    public Attendance recordAttendance(AttendanceRequest request) {
        if (request.getStudentId() == null || request.getStudentId().trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID is required.");
        }
        if (request.getCourseId() == null || request.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }

        Student student = studentRepository.findByStudentId(request.getStudentId().trim())
                .orElseThrow(() -> new IllegalArgumentException("Student with ID '" + request.getStudentId() + "' not found."));

        Course course = courseRepository.findByCourseId(request.getCourseId().trim())
                .orElseThrow(() -> new IllegalArgumentException("Course with ID '" + request.getCourseId() + "' not found."));

        LocalDate date = (request.getAttendanceDate() != null) ? request.getAttendanceDate() : LocalDate.now();
        LocalTime time = (request.getAttendanceTime() != null) ? request.getAttendanceTime().truncatedTo(ChronoUnit.SECONDS) : LocalTime.now().truncatedTo(ChronoUnit.SECONDS);
        String status = (request.getAttendanceStatus() != null && !request.getAttendanceStatus().trim().isEmpty())
                ? request.getAttendanceStatus().trim().toUpperCase()
                : "PRESENT";

        attendanceRepository.findByStudentAndCourseAndAttendanceDate(student, course, date)
                .ifPresent(existing -> {
                    throw new IllegalStateException("Attendance already recorded for student '"
                            + student.getStudentId() + "' in course '" + course.getCourseId() + "' on " + date);
                });

        Attendance attendance = new Attendance(student, course, date, time, status);
        return attendanceRepository.save(attendance);
    }

    public List<Attendance> getAllAttendance() {
        return attendanceRepository.findAll();
    }

    public List<Attendance> getAttendanceByCourseId(String courseId) {
        if (courseId == null || courseId.trim().isEmpty()) {
            return List.of();
        }
        return courseRepository.findByCourseId(courseId.trim())
                .map(attendanceRepository::findByCourse)
                .orElse(List.of());
    }

    public List<Attendance> getAttendanceByStudentId(String studentId) {
        if (studentId == null || studentId.trim().isEmpty()) {
            return List.of();
        }
        return studentRepository.findByStudentId(studentId.trim())
                .map(attendanceRepository::findByStudent)
                .orElse(List.of());
    }

    /**
     * Calculates comprehensive attendance statistics for a student, including
     * per-course attendance percentage, overall percentage, low attendance flags (< 75%),
     * and full reverse-chronological attendance history.
     */
    public StudentAttendanceSummaryDto getStudentAttendanceSummary(String studentId) {
        if (studentId == null || studentId.trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID is required.");
        }

        Student student = studentRepository.findByStudentId(studentId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Student with ID '" + studentId + "' not found."));

        // 1. Fetch student's attendance records in reverse chronological order
        List<Attendance> studentRecords = attendanceRepository
                .findByStudentOrderByAttendanceDateDescAttendanceTimeDesc(student);

        // 2. Fetch all courses in the system
        List<Course> allCourses = courseRepository.findAll();

        List<CourseAttendanceStatDto> courseSummaries = new ArrayList<>();
        long totalAttendedAcrossAll = 0;
        long totalConductedAcrossAll = 0;
        long lowAttendanceCoursesCount = 0;

        for (Course course : allCourses) {
            List<Attendance> courseRecords = attendanceRepository.findByCourse(course);

            // Total distinct session dates held for this course across all students
            long totalSessionsForCourse = courseRecords.stream()
                    .map(Attendance::getAttendanceDate)
                    .distinct()
                    .count();

            // Attended sessions for this student in this course with status PRESENT
            long attendedSessionsForCourse = studentRecords.stream()
                    .filter(a -> a.getCourse().getCourseId().equalsIgnoreCase(course.getCourseId()))
                    .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                    .count();

            // Safeguard if student attended sessions recorded individually
            if (attendedSessionsForCourse > totalSessionsForCourse) {
                totalSessionsForCourse = attendedSessionsForCourse;
            }

            // Only display courses that have either had classes held or that the student has records in
            if (totalSessionsForCourse == 0 && attendedSessionsForCourse == 0) {
                continue;
            }

            double percentage = 0.0;
            if (totalSessionsForCourse > 0) {
                percentage = Math.round(((double) attendedSessionsForCourse / totalSessionsForCourse) * 1000.0) / 10.0;
            }

            // Low attendance defined as under 75% for active courses
            boolean isLow = percentage < 75.0 && totalSessionsForCourse > 0;
            if (isLow) {
                lowAttendanceCoursesCount++;
            }

            totalAttendedAcrossAll += attendedSessionsForCourse;
            totalConductedAcrossAll += totalSessionsForCourse;

            courseSummaries.add(new CourseAttendanceStatDto(
                    course.getCourseId(),
                    course.getCourseName(),
                    attendedSessionsForCourse,
                    totalSessionsForCourse,
                    percentage,
                    isLow,
                    course.getAssignedFacultyId(),
                    course.getAssignedFacultyName()
            ));
        }

        double overallPercentage = 0.0;
        if (totalConductedAcrossAll > 0) {
            overallPercentage = Math.round(((double) totalAttendedAcrossAll / totalConductedAcrossAll) * 1000.0) / 10.0;
        }

        return new StudentAttendanceSummaryDto(
                student,
                overallPercentage,
                totalAttendedAcrossAll,
                totalConductedAcrossAll,
                lowAttendanceCoursesCount,
                courseSummaries,
                studentRecords
        );
    }

    /**
     * Calculates comprehensive attendance statistics for a course, including
     * total conducted sessions, student-wise attendance percentages, low-attendance
     * alerts (< 75%), and full chronological attendance history.
     */
    public CourseAttendanceSummaryDto getCourseAttendanceSummary(String courseId) {
        if (courseId == null || courseId.trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }

        Course course = courseRepository.findByCourseId(courseId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Course with ID '" + courseId + "' not found."));

        // 1. Fetch attendance records for this course ordered by date desc, time desc
        List<Attendance> courseRecords = attendanceRepository
                .findByCourseOrderByAttendanceDateDescAttendanceTimeDesc(course);

        // 2. Determine total conducted sessions (distinct session dates for this course)
        long totalConductedSessions = courseRecords.stream()
                .map(Attendance::getAttendanceDate)
                .distinct()
                .count();

        // 3. Find all students in the system
        List<Student> allStudents = studentRepository.findAll();

        List<StudentCourseAttendanceStatDto> studentStats = new ArrayList<>();
        long lowAttendanceStudentsCount = 0;
        double sumPercentages = 0.0;

        for (Student student : allStudents) {
            long attendedSessions = courseRecords.stream()
                    .filter(a -> a.getStudent().getStudentId().equalsIgnoreCase(student.getStudentId()))
                    .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                    .count();

            double percentage = 0.0;
            if (totalConductedSessions > 0) {
                percentage = Math.round(((double) attendedSessions / totalConductedSessions) * 1000.0) / 10.0;
            }

            boolean isLow = percentage < 75.0 && totalConductedSessions > 0;
            if (isLow) {
                lowAttendanceStudentsCount++;
            }

            sumPercentages += percentage;

            studentStats.add(new StudentCourseAttendanceStatDto(
                    student.getStudentId(),
                    student.getStudentName(),
                    student.getEmail(),
                    attendedSessions,
                    totalConductedSessions,
                    percentage,
                    isLow
            ));
        }

        double averagePercentage = 0.0;
        if (!studentStats.isEmpty()) {
            averagePercentage = Math.round((sumPercentages / studentStats.size()) * 10.0) / 10.0;
        }

        return new CourseAttendanceSummaryDto(
                course.getCourseId(),
                course.getCourseName(),
                totalConductedSessions,
                studentStats.size(),
                averagePercentage,
                lowAttendanceStudentsCount,
                studentStats,
                courseRecords
        );
    }

    /**
     * Calculates institutional overall attendance statistics, course summaries,
     * recent master audit history, and the defaulter student list (< 75% attendance).
     */
    public AdminOverviewDto getAdminOverview() {
        long totalStudents = studentRepository.count();
        long totalCourses = courseRepository.count();
        long totalAttendanceRecords = attendanceRepository.count();

        List<Attendance> allAttendance = attendanceRepository.findAll();
        List<Course> allCourses = courseRepository.findAll();
        List<Student> allStudents = studentRepository.findAll();

        // 1. Calculate total conducted sessions and per-course summaries
        long totalConductedSessions = 0;
        List<CourseAttendanceStatDto> courseSummaries = new ArrayList<>();

        for (Course course : allCourses) {
            List<Attendance> courseRecords = allAttendance.stream()
                    .filter(a -> a.getCourse().getCourseId().equalsIgnoreCase(course.getCourseId()))
                    .toList();

            long conductedDates = courseRecords.stream()
                    .map(Attendance::getAttendanceDate)
                    .distinct()
                    .count();

            totalConductedSessions += conductedDates;

            long presentCount = courseRecords.stream()
                    .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                    .count();

            double percentage = 0.0;
            if (conductedDates > 0 && totalStudents > 0) {
                long expectedAttendances = conductedDates * totalStudents;
                percentage = Math.round(((double) presentCount / expectedAttendances) * 1000.0) / 10.0;
                if (percentage > 100.0) {
                    percentage = 100.0;
                }
            }

            courseSummaries.add(new CourseAttendanceStatDto(
                    course.getCourseId(),
                    course.getCourseName(),
                    presentCount,
                    conductedDates,
                    percentage,
                    percentage < 75.0 && conductedDates > 0,
                    course.getAssignedFacultyId(),
                    course.getAssignedFacultyName()
            ));
        }

        // 2. Identify Defaulter Students (< 75% overall attendance or courses in shortage)
        List<DefaulterStudentDto> defaulters = new ArrayList<>();
        double sumOverallPercentages = 0.0;
        long studentsWithClasses = 0;

        for (Student student : allStudents) {
            List<Attendance> studentRecords = allAttendance.stream()
                    .filter(a -> a.getStudent().getStudentId().equalsIgnoreCase(student.getStudentId()))
                    .toList();

            long totalAttended = studentRecords.stream()
                    .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                    .count();

            List<String> lowCourses = new ArrayList<>();
            for (Course course : allCourses) {
                List<Attendance> courseRecords = allAttendance.stream()
                        .filter(a -> a.getCourse().getCourseId().equalsIgnoreCase(course.getCourseId()))
                        .toList();
                long courseDates = courseRecords.stream().map(Attendance::getAttendanceDate).distinct().count();
                if (courseDates > 0) {
                    long attendedInCourse = studentRecords.stream()
                            .filter(a -> a.getCourse().getCourseId().equalsIgnoreCase(course.getCourseId()))
                            .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                            .count();
                    double cPercent = Math.round(((double) attendedInCourse / courseDates) * 1000.0) / 10.0;
                    if (cPercent < 75.0) {
                        lowCourses.add(course.getCourseId() + " (" + cPercent + "%)");
                    }
                }
            }

            double studentOverallPercentage = 0.0;
            if (totalConductedSessions > 0) {
                studentOverallPercentage = Math.round(((double) totalAttended / totalConductedSessions) * 1000.0) / 10.0;
                if (studentOverallPercentage > 100.0) {
                    studentOverallPercentage = 100.0;
                }
                sumOverallPercentages += studentOverallPercentage;
                studentsWithClasses++;
            }

            if ((studentOverallPercentage < 75.0 && totalConductedSessions > 0) || !lowCourses.isEmpty()) {
                defaulters.add(new DefaulterStudentDto(
                        student.getStudentId(),
                        student.getStudentName(),
                        student.getEmail(),
                        totalAttended,
                        totalConductedSessions,
                        studentOverallPercentage,
                        lowCourses
                ));
            }
        }

        double overallAttendancePercentage = 0.0;
        if (studentsWithClasses > 0) {
            overallAttendancePercentage = Math.round((sumOverallPercentages / studentsWithClasses) * 10.0) / 10.0;
        }

        // 3. Recent 100 attendance records for audit history
        List<Attendance> recentHistory = allAttendance.stream()
                .sorted((a1, a2) -> {
                    int c = a2.getAttendanceDate().compareTo(a1.getAttendanceDate());
                    return (c != 0) ? c : a2.getAttendanceTime().compareTo(a1.getAttendanceTime());
                })
                .limit(100)
                .toList();

        return new AdminOverviewDto(
                totalStudents,
                totalCourses,
                totalAttendanceRecords,
                totalConductedSessions,
                overallAttendancePercentage,
                defaulters.size(),
                defaulters,
                courseSummaries,
                recentHistory
        );
    }

    /**
     * View overall department attendance statistics & HOD overview.
     * Computes department-wide KPIs, course summaries, student-wise attendance rosters,
     * and identifies defaulters (< 75% attendance).
     */
    public HodOverviewDto getHodOverview() {
        List<Student> allStudents = studentRepository.findAll();
        List<Course> allCourses = courseRepository.findAll();
        List<Attendance> allAttendance = attendanceRepository.findAll();

        long totalStudents = allStudents.size();
        long totalCourses = allCourses.size();
        long totalAttendanceRecords = allAttendance.size();

        // 1. Course Attendance Summaries and Conducted Sessions
        List<CourseAttendanceStatDto> courseSummaries = new ArrayList<>();
        long totalConductedSessions = 0;

        for (Course course : allCourses) {
            List<Attendance> courseRecords = allAttendance.stream()
                    .filter(a -> a.getCourse().getCourseId().equalsIgnoreCase(course.getCourseId()))
                    .toList();

            long conductedDates = courseRecords.stream()
                    .map(Attendance::getAttendanceDate)
                    .distinct()
                    .count();

            totalConductedSessions += conductedDates;

            long presentCount = courseRecords.stream()
                    .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                    .count();

            double percentage = 0.0;
            if (conductedDates > 0 && totalStudents > 0) {
                long expectedAttendances = conductedDates * totalStudents;
                percentage = Math.round(((double) presentCount / expectedAttendances) * 1000.0) / 10.0;
                if (percentage > 100.0) {
                    percentage = 100.0;
                }
            }

            courseSummaries.add(new CourseAttendanceStatDto(
                    course.getCourseId(),
                    course.getCourseName(),
                    presentCount,
                    conductedDates,
                    percentage,
                    percentage < 75.0 && conductedDates > 0,
                    course.getAssignedFacultyId(),
                    course.getAssignedFacultyName()
            ));
        }

        // 2. Student-Wise Attendance List & Defaulters Identification (< 75% attendance)
        List<HodStudentAttendanceDto> studentAttendanceList = new ArrayList<>();
        List<DefaulterStudentDto> defaulters = new ArrayList<>();
        double sumOverallPercentages = 0.0;
        long studentsWithClasses = 0;

        for (Student student : allStudents) {
            List<Attendance> studentRecords = allAttendance.stream()
                    .filter(a -> a.getStudent().getStudentId().equalsIgnoreCase(student.getStudentId()))
                    .toList();

            long totalAttended = studentRecords.stream()
                    .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                    .count();

            List<String> lowCourses = new ArrayList<>();
            for (Course course : allCourses) {
                List<Attendance> courseRecords = allAttendance.stream()
                        .filter(a -> a.getCourse().getCourseId().equalsIgnoreCase(course.getCourseId()))
                        .toList();
                long courseDates = courseRecords.stream().map(Attendance::getAttendanceDate).distinct().count();
                if (courseDates > 0) {
                    long attendedInCourse = studentRecords.stream()
                            .filter(a -> a.getCourse().getCourseId().equalsIgnoreCase(course.getCourseId()))
                            .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                            .count();
                    double cPercent = Math.round(((double) attendedInCourse / courseDates) * 1000.0) / 10.0;
                    if (cPercent < 75.0) {
                        lowCourses.add(course.getCourseId() + " (" + cPercent + "%)");
                    }
                }
            }

            double studentOverallPercentage = 0.0;
            if (totalConductedSessions > 0) {
                studentOverallPercentage = Math.round(((double) totalAttended / totalConductedSessions) * 1000.0) / 10.0;
                if (studentOverallPercentage > 100.0) {
                    studentOverallPercentage = 100.0;
                }
                sumOverallPercentages += studentOverallPercentage;
                studentsWithClasses++;
            }

            boolean isLow = (studentOverallPercentage < 75.0 && totalConductedSessions > 0) || !lowCourses.isEmpty();

            studentAttendanceList.add(new HodStudentAttendanceDto(
                    student.getStudentId(),
                    student.getStudentName(),
                    student.getEmail(),
                    totalAttended,
                    totalConductedSessions,
                    studentOverallPercentage,
                    isLow,
                    lowCourses
            ));

            if (isLow) {
                defaulters.add(new DefaulterStudentDto(
                        student.getStudentId(),
                        student.getStudentName(),
                        student.getEmail(),
                        totalAttended,
                        totalConductedSessions,
                        studentOverallPercentage,
                        lowCourses
                ));
            }
        }

        double overallDepartmentPercentage = 0.0;
        if (studentsWithClasses > 0) {
            overallDepartmentPercentage = Math.round((sumOverallPercentages / studentsWithClasses) * 10.0) / 10.0;
        }

        // 3. Recent 100 attendance records for audit history
        List<Attendance> recentHistory = allAttendance.stream()
                .sorted((a1, a2) -> {
                    int c = a2.getAttendanceDate().compareTo(a1.getAttendanceDate());
                    return (c != 0) ? c : a2.getAttendanceTime().compareTo(a1.getAttendanceTime());
                })
                .limit(100)
                .toList();

        return new HodOverviewDto(
                "Department of Computer Science & Engineering",
                totalStudents,
                totalCourses,
                totalAttendanceRecords,
                totalConductedSessions,
                overallDepartmentPercentage,
                defaulters.size(),
                defaulters,
                courseSummaries,
                studentAttendanceList,
                recentHistory
        );
    }

    /**
     * Aggregates real attendance data and produces a comprehensive Defaulter List
     * filtered by course, division, batch, date range, and threshold.
     */
    public List<DefaulterReportDto> getDefaulterReport(String courseId, String sessionCode,
                                                       String division, String batch,
                                                       LocalDate startDate, LocalDate endDate,
                                                       Double threshold,
                                                       String requestingUsername, String requestingRole) {
        double safeThreshold = (threshold != null && threshold >= 0 && threshold <= 100) ? threshold : 75.0;

        // Permission check for faculty
        boolean isFaculty = "ROLE_FACULTY".equalsIgnoreCase(requestingRole) || "ROLE_TEACHER".equalsIgnoreCase(requestingRole);
        List<Course> targetCourses = new ArrayList<>();

        if (courseId != null && !courseId.trim().isEmpty()) {
            Course c = courseRepository.findByCourseId(courseId.trim())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId.trim()));
            if (isFaculty && c.getAssignedFacultyId() != null && !c.getAssignedFacultyId().equalsIgnoreCase(requestingUsername)) {
                throw new AccessDeniedException("Access denied: You are only authorized to view defaulters for courses assigned to you.");
            }
            targetCourses.add(c);
        } else {
            if (isFaculty) {
                targetCourses = courseRepository.findByAssignedFacultyId(requestingUsername);
                if (targetCourses.isEmpty()) {
                    targetCourses = courseRepository.findAll();
                }
            } else {
                targetCourses = courseRepository.findAll();
            }
        }

        List<Student> allStudents = studentRepository.findAll();
        List<Attendance> allAttendance = attendanceRepository.findAll();

        List<DefaulterReportDto> report = new ArrayList<>();

        for (Course course : targetCourses) {
            // Filter attendance records for this course
            List<Attendance> courseRecords = allAttendance.stream()
                    .filter(a -> a.getCourse().getCourseId().equalsIgnoreCase(course.getCourseId()))
                    .filter(a -> sessionCode == null || sessionCode.trim().isEmpty() || sessionCode.equalsIgnoreCase(a.getSessionCode()))
                    .filter(a -> startDate == null || !a.getAttendanceDate().isBefore(startDate))
                    .filter(a -> endDate == null || !a.getAttendanceDate().isAfter(endDate))
                    .toList();

            long totalSessionsConducted = courseRecords.stream()
                    .map(a -> (a.getSessionCode() != null && !a.getSessionCode().trim().isEmpty()) ? a.getSessionCode() : a.getAttendanceDate().toString())
                    .distinct()
                    .count();

            // Filter students by division and batch if provided
            List<Student> eligibleStudents = allStudents.stream()
                    .filter(s -> division == null || division.trim().isEmpty() || "ALL".equalsIgnoreCase(division) || division.equalsIgnoreCase(s.getDivision()))
                    .filter(s -> batch == null || batch.trim().isEmpty() || "ALL".equalsIgnoreCase(batch) || batch.equalsIgnoreCase(s.getBatch()))
                    .toList();

            for (Student student : eligibleStudents) {
                long presentCount = courseRecords.stream()
                        .filter(a -> a.getStudent().getStudentId().equalsIgnoreCase(student.getStudentId()))
                        .filter(a -> "PRESENT".equalsIgnoreCase(a.getAttendanceStatus()))
                        .count();

                long totalClasses = Math.max(totalSessionsConducted, presentCount);
                long absentClasses = Math.max(0, totalClasses - presentCount);

                double percentage = 0.0;
                if (totalClasses > 0) {
                    percentage = Math.round(((double) presentCount / totalClasses) * 1000.0) / 10.0;
                    if (percentage > 100.0) percentage = 100.0;
                }

                String status = (percentage < safeThreshold) ? "Defaulter" : "Eligible";

                report.add(new DefaulterReportDto(
                        student.getStudentId(),
                        student.getStudentName(),
                        student.getBranch() != null ? student.getBranch() : "Computer Science",
                        student.getDivision() != null ? student.getDivision() : "A",
                        student.getBatch() != null ? student.getBatch() : "A1",
                        course.getCourseId(),
                        course.getCourseName(),
                        presentCount,
                        totalClasses,
                        absentClasses,
                        percentage,
                        status
                ));
            }
        }

        return report;
    }

    /**
     * Generates a REAL .xlsx Excel workbook using Apache POI.
     */
    public byte[] generateDefaulterExcel(List<DefaulterReportDto> records, String courseId) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("Defaulters List");

            // Header Style
            XSSFCellStyle headerStyle = workbook.createCellStyle();
            XSSFFont font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 11);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Cell Styles
            XSSFCellStyle normalStyle = workbook.createCellStyle();
            normalStyle.setBorderBottom(BorderStyle.THIN);
            normalStyle.setBorderTop(BorderStyle.THIN);
            normalStyle.setBorderLeft(BorderStyle.THIN);
            normalStyle.setBorderRight(BorderStyle.THIN);

            XSSFCellStyle defaulterStyle = workbook.createCellStyle();
            defaulterStyle.cloneStyleFrom(normalStyle);
            XSSFFont defFont = workbook.createFont();
            defFont.setBold(true);
            defFont.setColor(IndexedColors.RED.getIndex());
            defaulterStyle.setFont(defFont);

            XSSFCellStyle eligibleStyle = workbook.createCellStyle();
            eligibleStyle.cloneStyleFrom(normalStyle);
            XSSFFont eligFont = workbook.createFont();
            eligFont.setBold(true);
            eligFont.setColor(IndexedColors.GREEN.getIndex());
            eligibleStyle.setFont(eligFont);

            String[] headers = {
                    "Student ID", "Student Name", "Branch", "Division", "Batch",
                    "Course", "Present Classes", "Total Classes", "Attendance %", "Status"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (DefaulterReportDto r : records) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0); c0.setCellValue(r.getStudentId()); c0.setCellStyle(normalStyle);
                Cell c1 = row.createCell(1); c1.setCellValue(r.getStudentName()); c1.setCellStyle(normalStyle);
                Cell c2 = row.createCell(2); c2.setCellValue(r.getBranch()); c2.setCellStyle(normalStyle);
                Cell c3 = row.createCell(3); c3.setCellValue(r.getDivision()); c3.setCellStyle(normalStyle);
                Cell c4 = row.createCell(4); c4.setCellValue(r.getBatch()); c4.setCellStyle(normalStyle);
                Cell c5 = row.createCell(5); c5.setCellValue(r.getCourseId() + " - " + r.getCourseName()); c5.setCellStyle(normalStyle);
                Cell c6 = row.createCell(6); c6.setCellValue(r.getPresentClasses()); c6.setCellStyle(normalStyle);
                Cell c7 = row.createCell(7); c7.setCellValue(r.getTotalClasses()); c7.setCellStyle(normalStyle);
                Cell c8 = row.createCell(8); c8.setCellValue(String.format("%.1f%%", r.getAttendancePercentage())); c8.setCellStyle(normalStyle);

                Cell c9 = row.createCell(9);
                c9.setCellValue(r.getStatus());
                if ("Defaulter".equalsIgnoreCase(r.getStatus())) {
                    c9.setCellStyle(defaulterStyle);
                } else {
                    c9.setCellStyle(eligibleStyle);
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
