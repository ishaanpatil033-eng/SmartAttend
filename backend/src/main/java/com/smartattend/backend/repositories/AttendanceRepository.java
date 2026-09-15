package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Course;
import com.smartattend.backend.entities.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByCourse(Course course);
    List<Attendance> findByCourseOrderByAttendanceDateDescAttendanceTimeDesc(Course course);
    List<Attendance> findByStudent(Student student);
    List<Attendance> findByStudentOrderByAttendanceDateDescAttendanceTimeDesc(Student student);
    List<Attendance> findByCourseAndAttendanceDate(Course course, LocalDate attendanceDate);
    Optional<Attendance> findByStudentAndCourseAndAttendanceDate(Student student, Course course, LocalDate attendanceDate);
    Optional<Attendance> findByStudentAndSessionCode(Student student, String sessionCode);
    boolean existsByStudentAndSessionCode(Student student, String sessionCode);
    long countBySessionCode(String sessionCode);
    List<Attendance> findBySessionCode(String sessionCode);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) > 0 FROM Attendance a WHERE a.student = :student AND a.sessionCode IN :sessionCodes")
    boolean existsByStudentAndSessionCodeIn(@org.springframework.data.repository.query.Param("student") Student student,
                                            @org.springframework.data.repository.query.Param("sessionCodes") java.util.Collection<String> sessionCodes);
}
