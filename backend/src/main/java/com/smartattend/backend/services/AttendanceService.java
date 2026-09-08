package com.smartattend.backend.services;

import com.smartattend.backend.dtos.AttendanceRequest;
import com.smartattend.backend.dtos.QrScanRequest;
import com.smartattend.backend.dtos.QrTokenResponse;
import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.AttendanceQrToken;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.Student;
import com.smartattend.backend.repositories.AttendanceQrTokenRepository;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AttendanceQrTokenRepository qrTokenRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             AttendanceQrTokenRepository qrTokenRepository,
                             StudentRepository studentRepository,
                             CourseRepository courseRepository) {
        this.attendanceRepository = attendanceRepository;
        this.qrTokenRepository = qrTokenRepository;
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
    }

    /**
     * Generates a dynamic QR token for a class/course that strictly expires in 5 seconds.
     */
    @Transactional
    public QrTokenResponse generateDynamicQrToken(String courseId) {
        String safeCourseId = (courseId != null && !courseId.trim().isEmpty())
                ? courseId.trim()
                : "CS101";

        // Ensure course exists in database
        courseRepository.findByCourseId(safeCourseId).orElseGet(() -> {
            Course newCourse = new Course(safeCourseId, "Course " + safeCourseId);
            return courseRepository.save(newCourse);
        });

        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(5);
        String tokenString = UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        AttendanceQrToken qrToken = new AttendanceQrToken(tokenString, safeCourseId, now, expiresAt);
        qrTokenRepository.save(qrToken);

        return new QrTokenResponse(tokenString, safeCourseId, 5, expiresAt);
    }

    /**
     * Records student attendance using the scanned dynamic QR code.
     * Verifies that the QR token exists, belongs to the course, and is within its 5-second validity.
     */
    @Transactional
    public Attendance recordAttendanceViaQr(QrScanRequest scanRequest) {
        if (scanRequest.getStudentId() == null || scanRequest.getStudentId().trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID is required.");
        }
        if (scanRequest.getCourseId() == null || scanRequest.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        if (scanRequest.getQrToken() == null || scanRequest.getQrToken().trim().isEmpty()) {
            throw new IllegalArgumentException("Scanned QR token is required.");
        }

        String studentId = scanRequest.getStudentId().trim();
        String courseId = scanRequest.getCourseId().trim();
        String scannedToken = scanRequest.getQrToken().trim();

        // 1. Look up the QR token in the database
        AttendanceQrToken tokenEntity = qrTokenRepository.findByToken(scannedToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid QR code. Please scan the current live QR code."));

        // 2. Verify the QR token belongs to the matching course
        if (!tokenEntity.getCourseId().equalsIgnoreCase(courseId)) {
            throw new IllegalArgumentException("This QR code belongs to course '" + tokenEntity.getCourseId()
                    + "', not '" + courseId + "'.");
        }

        // 3. Verify that the 5-second window has not passed
        if (tokenEntity.isExpired() || Instant.now().isAfter(tokenEntity.getExpiresAt())) {
            throw new IllegalArgumentException("This QR code has expired! QR codes refresh automatically every 5 seconds. Please scan the updated code.");
        }

        // 4. Look up or auto-register student for smooth beginner testing
        Student student = studentRepository.findByStudentId(studentId).orElseGet(() -> {
            Student newStudent = new Student(studentId, "Student " + studentId, studentId.toLowerCase() + "@smartattend.edu");
            return studentRepository.save(newStudent);
        });

        // 5. Look up or auto-register course
        Course course = courseRepository.findByCourseId(courseId).orElseGet(() -> {
            Course newCourse = new Course(courseId, "Course " + courseId);
            return courseRepository.save(newCourse);
        });

        // 6. Check if attendance has already been recorded for this student in this course today
        LocalDate today = LocalDate.now();
        if (attendanceRepository.findByStudentAndCourseAndAttendanceDate(student, course, today).isPresent()) {
            throw new IllegalStateException("Attendance has already been marked for student '"
                    + studentId + "' in course '" + courseId + "' today.");
        }

        // 7. Save and return the verified attendance record
        Attendance attendance = new Attendance(student, course, today, LocalTime.now(), "PRESENT");
        return attendanceRepository.save(attendance);
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
        LocalTime time = (request.getAttendanceTime() != null) ? request.getAttendanceTime() : LocalTime.now();
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
}
