package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.LectureSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LectureSessionRepository extends JpaRepository<LectureSession, Long> {
    Optional<LectureSession> findBySessionCode(String sessionCode);
    List<LectureSession> findByFacultyIdOrderBySessionDateDescSessionTimeDesc(String facultyId);
    List<LectureSession> findByCourseIdOrderBySessionDateDescSessionTimeDesc(String courseId);
    List<LectureSession> findByAcademicYearAndDivisionOrderBySessionDateDescSessionTimeDesc(String academicYear, String division);
    List<LectureSession> findAllByOrderBySessionDateDescSessionTimeDesc();
}
