package com.smartattend.backend.controllers;

import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.UserAccount;
import com.smartattend.backend.repositories.UserAccountRepository;
import com.smartattend.backend.services.CourseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;
    private final UserAccountRepository userAccountRepository;

    public CourseController(CourseService courseService, UserAccountRepository userAccountRepository) {
        this.courseService = courseService;
        this.userAccountRepository = userAccountRepository;
    }

    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private boolean isHod(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_HOD".equals(a.getAuthority()));
    }

    private boolean isFaculty(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
    }

    private boolean isStudent(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()));
    }

    /**
     * Create a new class/course.
     * POST /api/courses
     * Strictly restricted to ADMIN. HOD, Faculty, Student forbidden.
     */
    @PostMapping
    public ResponseEntity<?> createCourse(@RequestBody Course course, Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: Only administrators can create courses."));
        }
        try {
            Course created = courseService.createCourse(course);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * View courses.
     * GET /api/courses
     * - Admin/HOD: sees all courses
     * - Faculty: sees ONLY assigned courses
     * - Student: sees eligible academic courses
     */
    @GetMapping
    public ResponseEntity<List<Course>> getAllCourses(Authentication auth) {
        if (isFaculty(auth) && !isAdmin(auth) && !isHod(auth)) {
            List<Course> assigned = courseService.getCoursesForFaculty(auth.getName());
            return ResponseEntity.ok(assigned);
        }
        if (isStudent(auth) && !isAdmin(auth) && !isHod(auth)) {
            List<Course> eligible = courseService.getCoursesForStudent(auth.getName());
            return ResponseEntity.ok(eligible);
        }
        List<Course> courses = courseService.getAllCourses();
        return ResponseEntity.ok(courses);
    }

    /**
     * View a class/course by internal database ID.
     * GET /api/courses/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getCourseById(@PathVariable Long id, Authentication auth) {
        Optional<Course> courseOpt = courseService.getCourseById(id);
        if (courseOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Course with database ID " + id + " not found."));
        }

        Course course = courseOpt.get();
        if (isFaculty(auth) && !isAdmin(auth) && !isHod(auth)) {
            if (course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: You are not assigned to this course."));
            }
        }

        return ResponseEntity.ok(course);
    }

    /**
     * View a class/course by unique course ID (e.g. CS101).
     * GET /api/courses/search/{courseId}
     */
    @GetMapping("/search/{courseId}")
    public ResponseEntity<?> getCourseByCourseId(@PathVariable String courseId, Authentication auth) {
        Optional<Course> courseOpt = courseService.getCourseByCourseId(courseId);
        if (courseOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Course with course ID '" + courseId + "' not found."));
        }

        Course course = courseOpt.get();
        if (isFaculty(auth) && !isAdmin(auth) && !isHod(auth)) {
            if (course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: You are not assigned to this course."));
            }
        }

        return ResponseEntity.ok(course);
    }

    /**
     * Update course.
     * PUT /api/courses/{id}
     * Strictly restricted to ADMIN.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable Long id, @RequestBody Course course, Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: Only administrators can update courses."));
        }
        try {
            Course updated = courseService.updateCourse(id, course);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * Assign faculty to course.
     * POST /api/courses/{courseId}/assign-faculty
     * Strictly restricted to ADMIN.
     */
    @PostMapping("/{courseId}/assign-faculty")
    public ResponseEntity<?> assignFacultyToCourse(@PathVariable String courseId,
                                                   @RequestBody Map<String, String> payload,
                                                   Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: Only administrators can assign faculty to courses."));
        }
        String facultyId = payload.get("facultyId");
        if (facultyId == null || facultyId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Faculty ID is required."));
        }
        String facultyName = payload.get("facultyName");
        if (facultyName == null || facultyName.trim().isEmpty()) {
            Optional<UserAccount> facultyAcc = userAccountRepository.findByUsername(facultyId.trim());
            facultyName = facultyAcc.map(UserAccount::getFullName).orElse("Prof. " + facultyId.trim());
        }
        try {
            Course updated = courseService.assignFacultyToCourse(courseId, facultyId, facultyName);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Remove faculty assignment from course.
     * DELETE /api/courses/{courseId}/assign-faculty
     * Strictly restricted to ADMIN.
     */
    @DeleteMapping("/{courseId}/assign-faculty")
    public ResponseEntity<?> removeFacultyFromCourse(@PathVariable String courseId, Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: Only administrators can remove faculty assignments."));
        }
        try {
            Course updated = courseService.removeFacultyFromCourse(courseId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get courses assigned to a faculty member.
     * GET /api/courses/faculty/{facultyId}
     */
    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<?> getCoursesForFaculty(@PathVariable String facultyId, Authentication auth) {
        if (isFaculty(auth) && !isAdmin(auth) && !isHod(auth)) {
            if (!facultyId.equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: You cannot view another faculty's assigned courses."));
            }
        }
        List<Course> courses = courseService.getCoursesForFaculty(facultyId);
        return ResponseEntity.ok(courses);
    }

    /**
     * Get courses matching a student's academic structure.
     * GET /api/courses/student/{studentId}
     */
    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getCoursesForStudent(@PathVariable String studentId, Authentication auth) {
        if (isStudent(auth) && !isAdmin(auth) && !isHod(auth)) {
            if (!studentId.equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: You cannot view another student's courses."));
            }
        }
        List<Course> courses = courseService.getCoursesForStudent(studentId);
        return ResponseEntity.ok(courses);
    }

    /**
     * Delete a class/course by database ID.
     * DELETE /api/courses/{id}
     * Strictly restricted to ADMIN.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable Long id, Authentication auth) {
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden: Only administrators can delete courses."));
        }
        try {
            courseService.deleteCourse(id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Course with database ID " + id + " deleted successfully.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }
}
