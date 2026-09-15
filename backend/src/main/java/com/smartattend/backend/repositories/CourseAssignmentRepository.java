package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.CourseAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseAssignmentRepository extends JpaRepository<CourseAssignment, Long> {
    List<CourseAssignment> findByCourseIdOrderByCreatedAtDesc(String courseId);
    List<CourseAssignment> findByCourseIdAndCreatedByFacultyIdOrderByCreatedAtDesc(String courseId, String createdByFacultyId);
    List<CourseAssignment> findByCreatedByFacultyIdOrderByCreatedAtDesc(String createdByFacultyId);
    java.util.Optional<CourseAssignment> findByFileName(String fileName);
}
