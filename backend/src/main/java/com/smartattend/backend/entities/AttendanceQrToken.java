package com.smartattend.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(
    name = "attendance_qr_tokens",
    indexes = {
        @Index(name = "idx_qr_token", columnList = "token"),
        @Index(name = "idx_qr_course_id", columnList = "course_id"),
        @Index(name = "idx_qr_session_code", columnList = "session_code")
    }
)
public class AttendanceQrToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token", nullable = false, unique = true, length = 100)
    private String token;

    @Column(name = "course_id", nullable = false, length = 50)
    private String courseId;

    @Column(name = "session_code", length = 100)
    private String sessionCode;

    @Column(name = "consumed", nullable = false)
    private boolean consumed = false;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "consumed_by_student_id", length = 50)
    private String consumedByStudentId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public AttendanceQrToken() {
    }

    public AttendanceQrToken(String token, String courseId, Instant createdAt, Instant expiresAt) {
        this.token = token;
        this.courseId = courseId;
        this.sessionCode = courseId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.consumed = false;
    }

    public AttendanceQrToken(String token, String courseId, String sessionCode, Instant createdAt, Instant expiresAt) {
        this.token = token;
        this.courseId = courseId;
        this.sessionCode = sessionCode;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.consumed = false;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getCourseId() {
        return courseId;
    }

    public void setCourseId(String courseId) {
        this.courseId = courseId;
    }

    public String getSessionCode() {
        return sessionCode;
    }

    public void setSessionCode(String sessionCode) {
        this.sessionCode = sessionCode;
    }

    public boolean isConsumed() {
        return consumed;
    }

    public void setConsumed(boolean consumed) {
        this.consumed = consumed;
    }

    public Instant getConsumedAt() {
        return consumedAt;
    }

    public void setConsumedAt(Instant consumedAt) {
        this.consumedAt = consumedAt;
    }

    public String getConsumedByStudentId() {
        return consumedByStudentId;
    }

    public void setConsumedByStudentId(String consumedByStudentId) {
        this.consumedByStudentId = consumedByStudentId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(this.expiresAt);
    }
}
