package com.smartattend.backend.services;

import com.smartattend.backend.entities.AssignmentSubmission;
import com.smartattend.backend.entities.CourseAnnouncement;
import com.smartattend.backend.entities.CourseAssignment;
import com.smartattend.backend.entities.CourseResource;
import com.smartattend.backend.repositories.AssignmentSubmissionRepository;
import com.smartattend.backend.repositories.CourseAnnouncementRepository;
import com.smartattend.backend.repositories.CourseAssignmentRepository;
import com.smartattend.backend.repositories.CourseResourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class LmsService {

    private final CourseResourceRepository resourceRepository;
    private final CourseAssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final CourseAnnouncementRepository announcementRepository;
    private final com.smartattend.backend.repositories.CourseRepository courseRepository;

    public LmsService(CourseResourceRepository resourceRepository,
                      CourseAssignmentRepository assignmentRepository,
                      AssignmentSubmissionRepository submissionRepository,
                      CourseAnnouncementRepository announcementRepository,
                      com.smartattend.backend.repositories.CourseRepository courseRepository) {
        this.resourceRepository = resourceRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.announcementRepository = announcementRepository;
        this.courseRepository = courseRepository;
    }

    // Learning Resources
    public CourseResource addResource(CourseResource resource, String requestingFacultyId, boolean isStaffOrAdmin) {
        if (resource.getCourseId() == null || resource.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        if (resource.getTitle() == null || resource.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Resource title is required.");
        }
        if (!isStaffOrAdmin && requestingFacultyId != null) {
            com.smartattend.backend.entities.Course course = courseRepository.findByCourseId(resource.getCourseId().trim()).orElse(null);
            if (course == null || course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(requestingFacultyId)) {
                throw new org.springframework.security.access.AccessDeniedException("Faculty can only upload materials for courses assigned to them.");
            }
            resource.setUploadedByFacultyId(requestingFacultyId);
        }
        boolean hasContentOrUrl = resource.getContentOrUrl() != null && !resource.getContentOrUrl().trim().isEmpty();
        boolean hasFile = (resource.getFileName() != null && !resource.getFileName().trim().isEmpty())
                || (resource.getFileUrl() != null && !resource.getFileUrl().trim().isEmpty());

        if (!hasContentOrUrl && !hasFile) {
            throw new IllegalArgumentException("Please upload a file or enter content/URL.");
        }
        if (!hasContentOrUrl && hasFile) {
            String fileLink = (resource.getFileUrl() != null && !resource.getFileUrl().trim().isEmpty())
                    ? resource.getFileUrl().trim()
                    : "/api/lms/files/" + resource.getFileName().trim();
            resource.setContentOrUrl(fileLink);
        }
        return resourceRepository.save(resource);
    }

    public CourseResource addResource(CourseResource resource) {
        return addResource(resource, resource.getUploadedByFacultyId(), false);
    }

    public List<CourseResource> getResourcesByCourse(String courseId) {
        return resourceRepository.findByCourseIdOrderByCreatedAtDesc(courseId.trim());
    }

    // Assignments
    public CourseAssignment createAssignment(CourseAssignment assignment, String requestingFacultyId, boolean isStaffOrAdmin) {
        if (assignment.getCourseId() == null || assignment.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        if (assignment.getTitle() == null || assignment.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Assignment title is required.");
        }
        if (!isStaffOrAdmin && requestingFacultyId != null) {
            com.smartattend.backend.entities.Course course = courseRepository.findByCourseId(assignment.getCourseId().trim()).orElse(null);
            if (course == null || course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(requestingFacultyId)) {
                throw new org.springframework.security.access.AccessDeniedException("Faculty can only create assignments for courses assigned to them.");
            }
            assignment.setCreatedByFacultyId(requestingFacultyId);
        }
        return assignmentRepository.save(assignment);
    }

    public CourseAssignment createAssignment(CourseAssignment assignment) {
        return createAssignment(assignment, assignment.getCreatedByFacultyId(), false);
    }

    public List<CourseAssignment> getAssignmentsByCourse(String courseId) {
        return assignmentRepository.findByCourseIdOrderByCreatedAtDesc(courseId.trim());
    }

    public List<CourseAssignment> getAssignmentsByCourseAndFaculty(String courseId, String facultyId) {
        if (facultyId == null || facultyId.trim().isEmpty()) {
            return getAssignmentsByCourse(courseId);
        }
        return assignmentRepository.findByCourseIdAndCreatedByFacultyIdOrderByCreatedAtDesc(courseId.trim(), facultyId.trim());
    }

    public Optional<CourseAssignment> getAssignmentById(Long id) {
        return assignmentRepository.findById(id);
    }

    // Submissions
    @Transactional
    public AssignmentSubmission submitAssignment(AssignmentSubmission submission) {
        if (submission.getAssignmentId() == null) {
            throw new IllegalArgumentException("Assignment ID is required.");
        }
        if (submission.getStudentId() == null || submission.getStudentId().trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID is required.");
        }
        if (submission.getSubmissionContent() == null || submission.getSubmissionContent().trim().isEmpty()) {
            throw new IllegalArgumentException("Submission content is required.");
        }

        if (submission.getCourseId() == null || submission.getCourseId().trim().isEmpty()) {
            submission.setCourseId(getAssignmentById(submission.getAssignmentId())
                    .map(CourseAssignment::getCourseId).orElse(null));
        }

        // Upsert if previously submitted
        Optional<AssignmentSubmission> existing = submissionRepository.findByAssignmentIdAndStudentId(
                submission.getAssignmentId(), submission.getStudentId().trim());
        if (existing.isPresent()) {
            AssignmentSubmission sub = existing.get();
            sub.setSubmissionContent(submission.getSubmissionContent());
            if (submission.getFileName() != null) {
                sub.setFileName(submission.getFileName());
            }
            if (submission.getFileUrl() != null) {
                sub.setFileUrl(submission.getFileUrl());
            }
            sub.setSubmittedAt(java.time.LocalDateTime.now());
            sub.setStatus("RESUBMITTED");
            return submissionRepository.save(sub);
        }

        return submissionRepository.save(submission);
    }

    public List<AssignmentSubmission> getSubmissionsByAssignment(Long assignmentId) {
        return submissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId);
    }

    public List<AssignmentSubmission> getSubmissionsByCourseAndStudent(String courseId, String studentId) {
        return submissionRepository.findByCourseIdAndStudentId(courseId.trim(), studentId.trim());
    }

    public List<AssignmentSubmission> getSubmissionsByStudent(String studentId) {
        return submissionRepository.findByStudentIdOrderBySubmittedAtDesc(studentId.trim());
    }

    @Transactional
    public void removeStudentSubmission(Long assignmentId, String studentId) {
        if (assignmentId == null || studentId == null || studentId.trim().isEmpty()) {
            throw new IllegalArgumentException("Assignment ID and Student ID are required.");
        }
        AssignmentSubmission submission = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, studentId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Submission not found for this assignment and student."));
        submissionRepository.delete(submission);
    }

    public void deleteResource(Long id) {
        resourceRepository.deleteById(id);
    }

    @Transactional
    public void deleteAssignment(Long id) {
        List<AssignmentSubmission> subs = submissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(id);
        if (!subs.isEmpty()) {
            submissionRepository.deleteAll(subs);
        }
        assignmentRepository.deleteById(id);
    }

    // Announcements
    public CourseAnnouncement postAnnouncement(CourseAnnouncement announcement, String requestingFacultyId, boolean isStaffOrAdmin) {
        if (announcement.getCourseId() == null || announcement.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        if (announcement.getTitle() == null || announcement.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Announcement title is required.");
        }
        if (announcement.getContent() == null || announcement.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("Announcement content is required.");
        }
        if (!isStaffOrAdmin && requestingFacultyId != null) {
            com.smartattend.backend.entities.Course course = courseRepository.findByCourseId(announcement.getCourseId().trim()).orElse(null);
            if (course == null || course.getAssignedFacultyId() == null || !course.getAssignedFacultyId().equalsIgnoreCase(requestingFacultyId)) {
                throw new org.springframework.security.access.AccessDeniedException("Faculty can only post announcements for courses assigned to them.");
            }
            announcement.setAuthorName(requestingFacultyId);
        }
        return announcementRepository.save(announcement);
    }

    public CourseAnnouncement postAnnouncement(CourseAnnouncement announcement) {
        return postAnnouncement(announcement, announcement.getAuthorName(), false);
    }

    public List<CourseAnnouncement> getAnnouncementsByCourse(String courseId) {
        return announcementRepository.findByCourseIdOrderByCreatedAtDesc(courseId.trim());
    }

    public List<CourseAnnouncement> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<CourseAnnouncement> getAnnouncementById(Long id) {
        return announcementRepository.findById(id);
    }

    public void deleteAnnouncement(Long id) {
        announcementRepository.deleteById(id);
    }
}
