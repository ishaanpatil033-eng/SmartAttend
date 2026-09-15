package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.CourseAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseAnnouncementRepository extends JpaRepository<CourseAnnouncement, Long> {
    List<CourseAnnouncement> findByCourseIdOrderByCreatedAtDesc(String courseId);
    List<CourseAnnouncement> findAllByOrderByCreatedAtDesc();
}
