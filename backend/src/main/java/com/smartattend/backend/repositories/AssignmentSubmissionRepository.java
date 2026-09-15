package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {
    List<AssignmentSubmission> findByAssignmentIdOrderBySubmittedAtDesc(Long assignmentId);
    List<AssignmentSubmission> findByCourseIdAndStudentId(String courseId, String studentId);
    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(Long assignmentId, String studentId);
    List<AssignmentSubmission> findByStudentIdOrderBySubmittedAtDesc(String studentId);
    Optional<AssignmentSubmission> findByFileName(String fileName);
}
