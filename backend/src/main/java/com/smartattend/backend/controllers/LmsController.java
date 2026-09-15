package com.smartattend.backend.controllers;

import com.smartattend.backend.entities.AssignmentSubmission;
import com.smartattend.backend.entities.CourseAnnouncement;
import com.smartattend.backend.entities.CourseAssignment;
import com.smartattend.backend.entities.CourseResource;
import com.smartattend.backend.services.LmsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@RestController
@RequestMapping("/api/lms")
public class LmsController {

    private final LmsService lmsService;
    private final com.smartattend.backend.repositories.AssignmentSubmissionRepository submissionRepository;
    private final com.smartattend.backend.repositories.CourseAssignmentRepository assignmentRepository;
    private final com.smartattend.backend.repositories.CourseRepository courseRepository;

    public LmsController(LmsService lmsService,
                         com.smartattend.backend.repositories.AssignmentSubmissionRepository submissionRepository,
                         com.smartattend.backend.repositories.CourseAssignmentRepository assignmentRepository,
                         com.smartattend.backend.repositories.CourseRepository courseRepository) {
        this.lmsService = lmsService;
        this.submissionRepository = submissionRepository;
        this.assignmentRepository = assignmentRepository;
        this.courseRepository = courseRepository;
    }

    // Resources
    @PostMapping("/resources")
    public ResponseEntity<?> addResource(@RequestBody CourseResource resource, Authentication auth) {
        try {
            boolean isStaffOrAdmin = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                    "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
            String username = auth != null ? auth.getName() : null;
            if (username != null) {
                resource.setUploadedByFacultyId(username);
            }
            CourseResource created = lmsService.addResource(resource, username, isStaffOrAdmin);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    @GetMapping("/resources/course/{courseId}")
    public ResponseEntity<?> getResources(@PathVariable String courseId, Authentication auth) {
        boolean isFaculty = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));

        if (isFaculty && !isAdminOrHod) {
            var course = courseRepository.findByCourseId(courseId.trim()).orElse(null);
            if (course == null || course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: You cannot view materials for unassigned courses."));
            }
        }
        return ResponseEntity.ok(lmsService.getResourcesByCourse(courseId));
    }

    // Assignments
    @PostMapping("/assignments")
    public ResponseEntity<?> createAssignment(@RequestBody CourseAssignment assignment, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        try {
            boolean isStaffOrAdmin = auth.getAuthorities().stream().anyMatch(a ->
                    "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
            assignment.setCreatedByFacultyId(auth.getName());
            CourseAssignment created = lmsService.createAssignment(assignment, auth.getName(), isStaffOrAdmin);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    @GetMapping("/assignments/course/{courseId}")
    public ResponseEntity<?> getAssignments(@PathVariable String courseId, Authentication auth) {
        boolean isFaculty = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));

        if (isFaculty && !isAdminOrHod) {
            var course = courseRepository.findByCourseId(courseId.trim()).orElse(null);
            if (course == null || course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: You cannot view assignments for unassigned courses."));
            }
            return ResponseEntity.ok(lmsService.getAssignmentsByCourseAndFaculty(courseId, auth.getName()));
        }
        return ResponseEntity.ok(lmsService.getAssignmentsByCourse(courseId));
    }

    @GetMapping("/assignments/{id}")
    public ResponseEntity<?> getAssignmentById(@PathVariable Long id, Authentication auth) {
        var opt = lmsService.getAssignmentById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Assignment not found."));
        }
        CourseAssignment assignment = opt.get();
        boolean isFaculty = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        if (isFaculty && !isAdminOrHod) {
            if (assignment.getCreatedByFacultyId() != null && !assignment.getCreatedByFacultyId().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot view assignments created by another faculty."));
            }
        }
        return ResponseEntity.ok(assignment);
    }

    // Submissions
    @PostMapping("/assignments/{assignmentId}/submit")
    public ResponseEntity<?> submitAssignment(@PathVariable Long assignmentId,
                                              @RequestBody AssignmentSubmission submission,
                                              Authentication auth) {
        try {
            submission.setAssignmentId(assignmentId);
            if (auth != null) {
                submission.setStudentId(auth.getName());
            }
            AssignmentSubmission result = lmsService.submitAssignment(submission);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    @PostMapping("/submissions")
    public ResponseEntity<?> submitCoursework(@RequestBody Map<String, Object> body, Authentication auth) {
        try {
            Long assignmentId = body.get("assignmentId") != null ? Long.valueOf(body.get("assignmentId").toString()) : null;
            String studentId = (auth != null && auth.isAuthenticated() && auth.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority())))
                    ? auth.getName()
                    : (body.get("studentId") != null ? body.get("studentId").toString() : (auth != null ? auth.getName() : null));
            String submissionContent = body.get("submissionContent") != null ? body.get("submissionContent").toString() : null;
            if (submissionContent == null || submissionContent.trim().isEmpty()) {
                String text = body.get("submissionText") != null ? body.get("submissionText").toString().trim() : "";
                String url = body.get("fileUrl") != null ? body.get("fileUrl").toString().trim() : "";
                submissionContent = (text + " " + url).trim();
            }
            if (submissionContent.isEmpty()) {
                submissionContent = "Online Coursework Submission";
            }

            String courseId = body.get("courseId") != null ? body.get("courseId").toString().trim() : null;
            if (courseId == null || courseId.isEmpty()) {
                Optional<CourseAssignment> assignOpt = lmsService.getAssignmentById(assignmentId);
                if (assignOpt.isPresent()) {
                    courseId = assignOpt.get().getCourseId();
                }
            }
            if (courseId == null || courseId.isEmpty()) {
                throw new IllegalArgumentException("Course ID is required for assignment submission.");
            }

            AssignmentSubmission submission = new AssignmentSubmission();
            submission.setAssignmentId(assignmentId);
            submission.setCourseId(courseId);
            submission.setStudentId(studentId);
            submission.setSubmissionContent(submissionContent);
            if (body.get("studentName") != null) {
                submission.setStudentName(body.get("studentName").toString());
            }
            if (body.get("fileName") != null) {
                submission.setFileName(body.get("fileName").toString());
            }
            if (body.get("fileUrl") != null) {
                submission.setFileUrl(body.get("fileUrl").toString());
            }

            AssignmentSubmission result = lmsService.submitAssignment(submission);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    @DeleteMapping("/assignments/{assignmentId}/submission")
    public ResponseEntity<?> removeStudentSubmission(@PathVariable Long assignmentId, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        String studentId = auth.getName();
        try {
            lmsService.removeStudentSubmission(assignmentId, studentId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Submission removed successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/submissions/student/{studentId}")
    public ResponseEntity<?> getSubmissionsByStudent(@PathVariable String studentId, Authentication auth) {
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()))) {
            if (!auth.getName().equalsIgnoreCase(studentId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Students can only view their own submissions."));
            }
        }
        return ResponseEntity.ok(lmsService.getSubmissionsByStudent(studentId));
    }

    @GetMapping("/submissions/assignment/{assignmentId}")
    public ResponseEntity<?> getSubmissionsByAssignmentId(@PathVariable Long assignmentId, Authentication auth) {
        return getSubmissionsForAssignmentHelper(assignmentId, auth);
    }

    @GetMapping("/assignments/{assignmentId}/submissions")
    public ResponseEntity<?> getSubmissions(@PathVariable Long assignmentId, Authentication auth) {
        return getSubmissionsForAssignmentHelper(assignmentId, auth);
    }

    private ResponseEntity<?> getSubmissionsForAssignmentHelper(Long assignmentId, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()));
        if (isStudent) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Students cannot view the cohort submission list."));
        }
        var opt = lmsService.getAssignmentById(assignmentId);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Assignment not found."));
        }
        CourseAssignment assignment = opt.get();
        boolean isAdminOrHod = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        boolean isFaculty = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        if (isFaculty && !isAdminOrHod) {
            if (assignment.getCreatedByFacultyId() != null && !assignment.getCreatedByFacultyId().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You can only view submissions for assignments you created."));
            }
        }
        return ResponseEntity.ok(lmsService.getSubmissionsByAssignment(assignmentId));
    }

    @GetMapping("/assignments/submissions/student/{studentId}/course/{courseId}")
    public ResponseEntity<?> getStudentSubmissions(@PathVariable String studentId,
                                                   @PathVariable String courseId,
                                                   Authentication auth) {
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()))) {
            if (!auth.getName().equalsIgnoreCase(studentId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Students can only view their own submissions."));
            }
        }
        return ResponseEntity.ok(lmsService.getSubmissionsByCourseAndStudent(courseId, studentId));
    }

    @GetMapping("/submissions/{submissionId}")
    public ResponseEntity<?> getSubmissionById(@PathVariable Long submissionId, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        var opt = submissionRepository.findById(submissionId);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Submission not found."));
        }
        AssignmentSubmission sub = opt.get();
        boolean isAdminOrHod = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        boolean isStudent = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_STUDENT".equals(a.getAuthority()));
        boolean isFaculty = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));

        if (isStudent && !sub.getStudentId().equalsIgnoreCase(auth.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You can only view your own submission."));
        }
        if (isFaculty && !isAdminOrHod) {
            var assignOpt = lmsService.getAssignmentById(sub.getAssignmentId());
            if (assignOpt.isPresent()) {
                CourseAssignment ca = assignOpt.get();
                if (ca.getCreatedByFacultyId() != null && !ca.getCreatedByFacultyId().equalsIgnoreCase(auth.getName())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot view submissions for another faculty's assignment."));
                }
            }
        }
        return ResponseEntity.ok(sub);
    }

    @DeleteMapping("/submissions/{submissionId}")
    public ResponseEntity<?> deleteSubmissionById(@PathVariable Long submissionId, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        var opt = submissionRepository.findById(submissionId);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Submission not found."));
        }
        AssignmentSubmission sub = opt.get();
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()));

        if (isStudent && !sub.getStudentId().equalsIgnoreCase(auth.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You cannot delete another student's submission."));
        }
        if (!isAdmin && !sub.getStudentId().equalsIgnoreCase(auth.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized to delete this submission."));
        }
        submissionRepository.delete(sub);
        return ResponseEntity.ok(Map.of("success", true, "message", "Submission deleted successfully."));
    }

    @DeleteMapping("/resources/{id}")
    public ResponseEntity<?> deleteResource(@PathVariable Long id) {
        lmsService.deleteResource(id);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Resource deleted successfully.");
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/assignments/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        var opt = lmsService.getAssignmentById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Assignment not found."));
        }
        CourseAssignment assignment = opt.get();
        boolean isAdminOrHod = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
        boolean isOwner = assignment.getCreatedByFacultyId() != null && assignment.getCreatedByFacultyId().equalsIgnoreCase(auth.getName());
        if (!isAdminOrHod && !isOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You can only delete your own assignments."));
        }
        lmsService.deleteAssignment(id);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Assignment deleted successfully.");
        return ResponseEntity.ok(res);
    }

    // Announcements
    @PostMapping("/announcements")
    public ResponseEntity<?> postAnnouncement(@RequestBody CourseAnnouncement announcement, Authentication auth) {
        try {
            boolean isStaffOrAdmin = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                    "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
            String username = auth != null ? auth.getName() : null;
            if (auth != null) {
                announcement.setAuthorName(auth.getName());
                if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                    announcement.setAuthorRole("ADMIN");
                } else if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HOD"))) {
                    announcement.setAuthorRole("HOD");
                } else {
                    announcement.setAuthorRole("FACULTY");
                }
            }
            CourseAnnouncement created = lmsService.postAnnouncement(announcement, username, isStaffOrAdmin);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    @GetMapping("/announcements/course/{courseId}")
    public ResponseEntity<?> getAnnouncements(@PathVariable String courseId, Authentication auth) {
        boolean isFaculty = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));
        boolean isAdminOrHod = auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));

        if (isFaculty && !isAdminOrHod) {
            var course = courseRepository.findByCourseId(courseId.trim()).orElse(null);
            if (course == null || course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden: You cannot view announcements for unassigned courses."));
            }
        }
        return ResponseEntity.ok(lmsService.getAnnouncementsByCourse(courseId));
    }

    // ==========================================
    // Academic File Upload & Download Storage
    // ==========================================
    private static final String UPLOAD_DIR = "uploads";
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    private static final java.util.Set<String> ALLOWED_EXTENSIONS = java.util.Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "zip", "png", "jpg", "jpeg"
    );

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot upload empty file."));
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size exceeds 50MB limit."));
        }

        String originalFilename = file.getOriginalFilename();
        String ext = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        }
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return ResponseEntity.badRequest().body(Map.of("error", "File type '." + ext + "' is not supported. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, ZIP, PNG, JPG."));
        }

        try {
            Path uploadPath = Paths.get(UPLOAD_DIR).toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String cleanName = (originalFilename != null) ? originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_") : "file.bin";
            String uniqueName = UUID.randomUUID().toString().substring(0, 8) + "_" + cleanName;

            Path targetLocation = uploadPath.resolve(uniqueName).normalize();
            if (!targetLocation.startsWith(uploadPath)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid file destination."));
            }

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("fileName", uniqueName);
            result.put("originalName", originalFilename);
            result.put("fileUrl", "/api/lms/files/" + uniqueName);
            result.put("size", file.getSize());

            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to store file: " + e.getMessage()));
        }
    }

    @GetMapping("/files/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
                return ResponseEntity.badRequest().build();
            }

            Path uploadPath = Paths.get(UPLOAD_DIR).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(fileName).normalize();
            if (!filePath.startsWith(uploadPath)) {
                return ResponseEntity.badRequest().build();
            }
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            boolean isAdminOrHod = auth.getAuthorities().stream().anyMatch(a ->
                    "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HOD".equals(a.getAuthority()));
            boolean isStudent = auth.getAuthorities().stream().anyMatch(a ->
                    "ROLE_STUDENT".equals(a.getAuthority()));
            boolean isFaculty = auth.getAuthorities().stream().anyMatch(a ->
                    "ROLE_FACULTY".equals(a.getAuthority()) || "ROLE_TEACHER".equals(a.getAuthority()));

            var subOpt = submissionRepository.findByFileName(fileName);
            if (subOpt.isPresent()) {
                AssignmentSubmission sub = subOpt.get();
                if (isStudent && !sub.getStudentId().equalsIgnoreCase(auth.getName())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
                if (isFaculty && !isAdminOrHod) {
                    var assignOpt = lmsService.getAssignmentById(sub.getAssignmentId());
                    if (assignOpt.isPresent()) {
                        CourseAssignment ca = assignOpt.get();
                        if (ca.getCreatedByFacultyId() != null && !ca.getCreatedByFacultyId().equalsIgnoreCase(auth.getName())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                        }
                    }
                }
            }

            var assignOpt = assignmentRepository.findByFileName(fileName);
            if (assignOpt.isPresent()) {
                CourseAssignment ca = assignOpt.get();
                if (isFaculty && !isAdminOrHod) {
                    if (ca.getCreatedByFacultyId() != null && !ca.getCreatedByFacultyId().equalsIgnoreCase(auth.getName())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                }
            }

            String contentType = null;
            try {
                contentType = Files.probeContentType(filePath);
            } catch (IOException ignored) {}

            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            long contentLength = -1;
            try {
                contentLength = resource.contentLength();
            } catch (IOException ignored) {}

            String safeDownloadName = resource.getFilename();
            if (safeDownloadName != null && safeDownloadName.matches("^[a-f0-9\\-]{8,36}_.+")) {
                safeDownloadName = safeDownloadName.substring(safeDownloadName.indexOf('_') + 1);
            }

            var builder = ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeDownloadName + "\"");
            if (contentLength > 0) {
                builder.contentLength(contentLength);
            }
            return builder.body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ==========================================
    // Announcements (All Roles)
    // ==========================================
    @GetMapping("/announcements")
    public ResponseEntity<List<CourseAnnouncement>> getAllAnnouncements(@RequestParam(required = false) String courseId) {
        if (courseId != null && !courseId.trim().isEmpty()) {
            return ResponseEntity.ok(lmsService.getAnnouncementsByCourse(courseId.trim()));
        }
        return ResponseEntity.ok(lmsService.getAllAnnouncements());
    }

    @DeleteMapping("/announcements/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        var opt = lmsService.getAnnouncementById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Announcement not found."));
        }

        CourseAnnouncement announcement = opt.get();
        boolean isAdminOrHod = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_HOD"));
        boolean isOwner = announcement.getAuthorName() != null && announcement.getAuthorName().equalsIgnoreCase(auth.getName());

        if (!isAdminOrHod && !isOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You can only delete your own announcements."));
        }

        lmsService.deleteAnnouncement(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Announcement deleted successfully."));
    }
}
