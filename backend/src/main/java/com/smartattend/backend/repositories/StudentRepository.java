package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByStudentId(String studentId);
    Optional<Student> findByEmail(String email);
    List<Student> findByAcademicYear(String academicYear);
    List<Student> findByAcademicYearAndBatch(String academicYear, String batch);
    List<Student> findByAcademicYearAndSemesterAndBatch(String academicYear, Integer semester, String batch);
}
