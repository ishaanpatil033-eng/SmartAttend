package com.smartattend.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
    name = "device_attendance_bindings",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_session_device", columnNames = {"session_code", "device_fingerprint"}),
        @UniqueConstraint(name = "uk_session_student", columnNames = {"session_code", "student_id"})
    },
    indexes = {
        @Index(name = "idx_binding_session", columnList = "session_code"),
        @Index(name = "idx_binding_device", columnList = "device_fingerprint"),
        @Index(name = "idx_binding_student", columnList = "student_id")
    }
)
public class DeviceAttendanceBinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_code", nullable = false, length = 100)
    private String sessionCode;

    @Column(name = "device_fingerprint", nullable = false, length = 128)
    private String deviceFingerprint;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @Column(name = "bound_at", nullable = false)
    private Instant boundAt = Instant.now();

    public DeviceAttendanceBinding() {
    }

    public DeviceAttendanceBinding(String sessionCode, String deviceFingerprint, String studentId) {
        this.sessionCode = sessionCode;
        this.deviceFingerprint = deviceFingerprint;
        this.studentId = studentId;
        this.boundAt = Instant.now();
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

    public String getDeviceFingerprint() {
        return deviceFingerprint;
    }

    public void setDeviceFingerprint(String deviceFingerprint) {
        this.deviceFingerprint = deviceFingerprint;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public Instant getBoundAt() {
        return boundAt;
    }

    public void setBoundAt(Instant boundAt) {
        this.boundAt = boundAt;
    }
}
