package com.smartattend.backend.services;

import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.repositories.AttendanceQrTokenRepository;
import com.smartattend.backend.repositories.AttendanceRepository;
import com.smartattend.backend.repositories.CourseRepository;
import com.smartattend.backend.repositories.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class CourseService {

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

    private final CourseRepository courseRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceQrTokenRepository qrTokenRepository;
    private final StudentRepository studentRepository;

    public CourseService(CourseRepository courseRepository,
                         AttendanceRepository attendanceRepository,
                         AttendanceQrTokenRepository qrTokenRepository,
                         StudentRepository studentRepository) {
        this.courseRepository = courseRepository;
        this.attendanceRepository = attendanceRepository;
        this.qrTokenRepository = qrTokenRepository;
        this.studentRepository = studentRepository;
    }

    private void validateCourseAcademicStructure(Course course) {
        if (course.getBranch() != null && !course.getBranch().trim().isEmpty()) {
            boolean validBranch = VALID_BRANCHES.stream()
                    .anyMatch(b -> b.equalsIgnoreCase(course.getBranch().trim()));
            if (!validBranch) {
                throw new IllegalArgumentException("Invalid branch: " + course.getBranch() + ". Must be one of the recognized institutional branches.");
            }
        }
        if (course.getDivision() != null && !course.getDivision().trim().isEmpty()) {
            String div = course.getDivision().trim().toUpperCase();
            if (!VALID_DIVISIONS.contains(div)) {
                throw new IllegalArgumentException("Invalid division: " + div + ". Must be A, B, or C.");
            }
            course.setDivision(div);
        }
        if (course.getBatch() != null && !course.getBatch().trim().isEmpty()) {
            String batch = course.getBatch().trim().toUpperCase();
            String div = course.getDivision() != null ? course.getDivision().toUpperCase() : "A";
            if (!batch.equalsIgnoreCase("ALL") && !batch.startsWith(div)) {
                throw new IllegalArgumentException("Invalid batch: " + batch + " does not belong to Division " + div);
            }
            course.setBatch(batch);
        }
        if (course.getCourseType() != null && !course.getCourseType().trim().isEmpty()) {
            String type = course.getCourseType().trim().toUpperCase();
            if (!type.equals("THEORY") && !type.equals("LAB")) {
                throw new IllegalArgumentException("Course type must be either 'THEORY' or 'LAB'.");
            }
            course.setCourseType(type);
        }
    }

    public Course createCourse(Course course) {
        if (course.getCourseId() == null || course.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        if (course.getCourseName() == null || course.getCourseName().trim().isEmpty()) {
            throw new IllegalArgumentException("Course Name is required.");
        }

        if (courseRepository.findByCourseId(course.getCourseId().trim()).isPresent()) {
            throw new IllegalArgumentException("Course with ID " + course.getCourseId() + " already exists.");
        }

        course.setCourseId(course.getCourseId().trim());
        course.setCourseName(course.getCourseName().trim());
        validateCourseAcademicStructure(course);

        return courseRepository.save(course);
    }

    @Transactional
    public Course updateCourse(Long id, Course updated) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Course not found with database ID: " + id));

        if (updated.getCourseName() != null && !updated.getCourseName().trim().isEmpty()) {
            course.setCourseName(updated.getCourseName().trim());
        }
        if (updated.getBranch() != null) course.setBranch(updated.getBranch().trim());
        if (updated.getDivision() != null) course.setDivision(updated.getDivision().trim());
        if (updated.getBatch() != null) course.setBatch(updated.getBatch().trim());
        if (updated.getAcademicYear() != null) course.setAcademicYear(updated.getAcademicYear().trim());
        if (updated.getSemester() != null) course.setSemester(updated.getSemester());
        if (updated.getCourseType() != null) course.setCourseType(updated.getCourseType().trim());
        if (updated.getAssignedFacultyId() != null) course.setAssignedFacultyId(updated.getAssignedFacultyId().trim());
        if (updated.getAssignedFacultyName() != null) course.setAssignedFacultyName(updated.getAssignedFacultyName().trim());

        validateCourseAcademicStructure(course);
        return courseRepository.save(course);
    }

    public List<Course> getCoursesForFaculty(String facultyId) {
        if (facultyId == null || facultyId.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return courseRepository.findByAssignedFacultyId(facultyId.trim());
    }

    public List<Course> getCoursesForStudent(String studentId) {
        if (studentId == null || studentId.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return studentRepository.findByStudentId(studentId.trim())
                .map(st -> {
                    List<Course> all = courseRepository.findAll();
                    return all.stream().filter(c -> {
                        boolean branchMatch = c.getBranch() == null || st.getBranch() == null || c.getBranch().equalsIgnoreCase(st.getBranch());
                        boolean yearMatch = c.getAcademicYear() == null || st.getAcademicYear() == null || c.getAcademicYear().equalsIgnoreCase(st.getAcademicYear());
                        boolean semMatch = c.getSemester() == null || st.getSemester() == null || c.getSemester().equals(st.getSemester());
                        boolean divMatch = c.getDivision() == null || st.getDivision() == null || c.getDivision().equalsIgnoreCase(st.getDivision());
                        boolean batchMatch = "THEORY".equalsIgnoreCase(c.getCourseType()) ||
                                c.getBatch() == null || "ALL".equalsIgnoreCase(c.getBatch()) ||
                                (st.getBatch() != null && c.getBatch().equalsIgnoreCase(st.getBatch()));
                        return branchMatch && yearMatch && semMatch && divMatch && batchMatch;
                    }).toList();
                })
                .orElse(java.util.Collections.emptyList());
    }

    @Transactional
    public Course assignFacultyToCourse(String courseId, String facultyId, String facultyName) {
        Course course = courseRepository.findByCourseId(courseId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Course '" + courseId + "' not found."));
        course.setAssignedFacultyId(facultyId != null ? facultyId.trim() : null);
        course.setAssignedFacultyName(facultyName != null ? facultyName.trim() : null);
        return courseRepository.save(course);
    }

    @Transactional
    public Course removeFacultyFromCourse(String courseId) {
        Course course = courseRepository.findByCourseId(courseId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Course '" + courseId + "' not found."));
        course.setAssignedFacultyId(null);
        course.setAssignedFacultyName(null);
        return courseRepository.save(course);
    }

    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    public Optional<Course> getCourseById(Long id) {
        return courseRepository.findById(id);
    }

    public Optional<Course> getCourseByCourseId(String courseId) {
        return courseRepository.findByCourseId(courseId);
    }

    /**
     * Delete course and cascade delete linked attendance records & QR tokens
     * to ensure database integrity without foreign key violations.
     */
    @Transactional
    public void deleteCourse(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Course with database ID " + id + " not found."));

        // Clean up linked attendance
        List<Attendance> attendances = attendanceRepository.findByCourse(course);
        if (!attendances.isEmpty()) {
            attendanceRepository.deleteAll(attendances);
        }

        // Clean up linked QR tokens
        qrTokenRepository.deleteByCourseId(course.getCourseId());

        courseRepository.delete(course);
    }
}
