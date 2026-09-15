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
    name = "security_audit_logs",
    indexes = {
        @Index(name = "idx_audit_event_type", columnList = "event_type"),
        @Index(name = "idx_audit_username", columnList = "username"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp")
    }
)
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType; // LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, PASSWORD_CHANGE, ATTENDANCE_SUCCESS, ATTENDANCE_REJECTED, EXPIRED_QR, INVALID_QR, GEOFENCE_REJECTION, DEVICE_BINDING_REJECTION, UNAUTHORIZED_ACCESS

    @Column(name = "username", length = 50)
    private String username;

    @Column(name = "student_id", length = 50)
    private String studentId;

    @Column(name = "client_ip", length = 50)
    private String clientIp;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "course_id", length = 50)
    private String courseId;

    @Column(name = "session_code", length = 100)
    private String sessionCode;

    @Column(name = "details", length = 500)
    private String details;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp = Instant.now();

    public SecurityAuditLog() {
    }

    public SecurityAuditLog(String eventType, String username, String studentId, String clientIp, String userAgent, String courseId, String sessionCode, String details) {
        this.eventType = eventType;
        this.username = username;
        this.studentId = studentId;
        this.clientIp = clientIp;
        this.userAgent = userAgent;
        this.courseId = courseId;
        this.sessionCode = sessionCode;
        this.details = details;
        this.timestamp = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getClientIp() {
        return clientIp;
    }

    public void setClientIp(String clientIp) {
        this.clientIp = clientIp;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
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

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
