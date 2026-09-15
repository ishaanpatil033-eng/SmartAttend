package com.smartattend.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(
    name = "attendance",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_student_session", columnNames = {"student_id", "session_code"})
    }
)
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // attendance ID

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course; // class/course

    @Column(name = "session_code", length = 100)
    private String sessionCode;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "attendance_time", nullable = false)
    private LocalTime attendanceTime;

    @Column(name = "attendance_status", nullable = false, length = 20)
    private String attendanceStatus; // e.g., "PRESENT", "ABSENT"

    @Column(name = "moodle_synced", nullable = false)
    private boolean moodleSynced = false;

    public Attendance() {
    }

    public Attendance(Student student, Course course, LocalDate attendanceDate, LocalTime attendanceTime, String attendanceStatus) {
        this(student, course, null, attendanceDate, attendanceTime, attendanceStatus);
    }

    public Attendance(Student student, Course course, String sessionCode, LocalDate attendanceDate, LocalTime attendanceTime, String attendanceStatus) {
        this.student = student;
        this.course = course;
        this.sessionCode = sessionCode;
        this.attendanceDate = attendanceDate;
        this.attendanceTime = attendanceTime != null ? attendanceTime.truncatedTo(ChronoUnit.SECONDS) : LocalTime.now().truncatedTo(ChronoUnit.SECONDS);
        this.attendanceStatus = attendanceStatus;
        this.moodleSynced = false;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public String getSessionCode() {
        return sessionCode;
    }

    public void setSessionCode(String sessionCode) {
        this.sessionCode = sessionCode;
    }

    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }

    public void setAttendanceDate(LocalDate attendanceDate) {
        this.attendanceDate = attendanceDate;
    }

    public LocalTime getAttendanceTime() {
        return attendanceTime;
    }

    public void setAttendanceTime(LocalTime attendanceTime) {
        this.attendanceTime = attendanceTime != null ? attendanceTime.truncatedTo(ChronoUnit.SECONDS) : null;
    }

    public String getAttendanceStatus() {
        return attendanceStatus;
    }

    public void setAttendanceStatus(String attendanceStatus) {
        this.attendanceStatus = attendanceStatus;
    }

    public boolean isMoodleSynced() {
        return moodleSynced;
    }

    public void setMoodleSynced(boolean moodleSynced) {
        this.moodleSynced = moodleSynced;
    }
}
