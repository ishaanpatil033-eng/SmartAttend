package com.smartattend.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
    name = "lecture_sessions",
    indexes = {
        @Index(name = "idx_ls_session_code", columnList = "session_code"),
        @Index(name = "idx_ls_course_id", columnList = "course_id"),
        @Index(name = "idx_ls_faculty_id", columnList = "faculty_id")
    }
)
public class LectureSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_code", nullable = false, unique = true, length = 100)
    private String sessionCode;

    @Column(name = "course_id", nullable = false, length = 50)
    private String courseId;

    @Column(name = "course_name", nullable = false, length = 100)
    private String courseName;

    @Column(name = "lecture_type", nullable = false, length = 20)
    private String lectureType = "THEORY"; // "THEORY" or "LAB"

    @Column(name = "academic_year", length = 20)
    private String academicYear = "FE";

    @Column(name = "division", length = 10)
    private String division = "A";

    @Column(name = "batch", length = 20)
    private String batch = "ALL";

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "session_time", nullable = false, length = 50)
    private String sessionTime = "10:00 AM";

    @Column(name = "faculty_id", length = 50)
    private String facultyId;

    @Column(name = "faculty_name", length = 100)
    private String facultyName;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "classroom_latitude")
    private Double classroomLatitude;

    @Column(name = "classroom_longitude")
    private Double classroomLongitude;

    @Column(name = "classroom_accuracy")
    private Double classroomAccuracy;

    @Transient
    private long attendanceCount = 0;

    @Transient
    private long totalStudents = 0;

    public LectureSession() {
    }

    public LectureSession(String sessionCode, String courseId, String courseName, String lectureType,
                          String academicYear, String division, String batch,
                          LocalDate sessionDate, String sessionTime,
                          String facultyId, String facultyName) {
        this.sessionCode = sessionCode;
        this.courseId = courseId;
        this.courseName = courseName;
        this.lectureType = lectureType != null ? lectureType : "THEORY";
        this.academicYear = academicYear != null ? academicYear : "FE";
        this.division = division != null ? division : "A";
        this.batch = batch != null ? batch : "ALL";
        this.sessionDate = sessionDate != null ? sessionDate : LocalDate.now();
        this.sessionTime = sessionTime != null ? sessionTime : "10:00 AM";
        this.facultyId = facultyId;
        this.facultyName = facultyName;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionCode() {
        return sessionCode;
    }

    public void setSessionCode(String sessionCode) {
        this.sessionCode = sessionCode;
    }

    public String getCourseId() {
        return courseId;
    }

    public void setCourseId(String courseId) {
        this.courseId = courseId;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public String getLectureType() {
        return lectureType;
    }

    public void setLectureType(String lectureType) {
        this.lectureType = lectureType;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(String academicYear) {
        this.academicYear = academicYear;
    }

    public String getDivision() {
        return division;
    }

    public void setDivision(String division) {
        this.division = division;
    }

    public String getBatch() {
        return batch;
    }

    public void setBatch(String batch) {
        this.batch = batch;
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public void setSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate;
    }

    public String getSessionTime() {
        return sessionTime;
    }

    public void setSessionTime(String sessionTime) {
        this.sessionTime = sessionTime;
    }

    public String getFacultyId() {
        return facultyId;
    }

    public void setFacultyId(String facultyId) {
        this.facultyId = facultyId;
    }

    public String getFacultyName() {
        return facultyName;
    }

    public void setFacultyName(String facultyName) {
        this.facultyName = facultyName;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public long getAttendanceCount() {
        return attendanceCount;
    }

    public void setAttendanceCount(long attendanceCount) {
        this.attendanceCount = attendanceCount;
    }

    public long getTotalStudents() {
        return totalStudents;
    }

    public void setTotalStudents(long totalStudents) {
        this.totalStudents = totalStudents;
    }

    public Double getClassroomLatitude() {
        return classroomLatitude;
    }

    public void setClassroomLatitude(Double classroomLatitude) {
        this.classroomLatitude = classroomLatitude;
    }

    public Double getClassroomLongitude() {
        return classroomLongitude;
    }

    public void setClassroomLongitude(Double classroomLongitude) {
        this.classroomLongitude = classroomLongitude;
    }

    public Double getClassroomAccuracy() {
        return classroomAccuracy;
    }

    public void setClassroomAccuracy(Double classroomAccuracy) {
        this.classroomAccuracy = classroomAccuracy;
    }
}
