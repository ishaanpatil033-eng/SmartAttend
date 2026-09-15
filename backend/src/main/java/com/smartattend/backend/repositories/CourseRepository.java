package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByCourseId(String courseId);
    List<Course> findByAssignedFacultyId(String assignedFacultyId);
    List<Course> findByBranch(String branch);
}

