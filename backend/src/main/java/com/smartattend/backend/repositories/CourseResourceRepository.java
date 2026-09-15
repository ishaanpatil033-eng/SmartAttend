package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.CourseResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseResourceRepository extends JpaRepository<CourseResource, Long> {
    List<CourseResource> findByCourseIdOrderByCreatedAtDesc(String courseId);
}
