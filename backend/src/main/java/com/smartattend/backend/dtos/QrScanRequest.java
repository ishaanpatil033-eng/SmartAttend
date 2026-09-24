package com.smartattend.backend.dtos;

public class QrScanRequest {

    private String studentId; // Untrusted client payload, checked for tampering
    private String courseId;
    private String qrToken;
    private String sessionCode;
    private Double latitude;
    private Double longitude;
    private Double accuracy;
    private String deviceFingerprint;

    public QrScanRequest() {
    }

    public QrScanRequest(String studentId, String courseId, String qrToken) {
        this.studentId = studentId;
        this.courseId = courseId;
        this.qrToken = qrToken;
    }

    public QrScanRequest(String studentId, String courseId, String qrToken, String sessionCode, String deviceFingerprint) {
        this.studentId = studentId;
        this.courseId = courseId;
        this.qrToken = qrToken;
        this.sessionCode = sessionCode;
        this.deviceFingerprint = deviceFingerprint;
    }

    public QrScanRequest(String studentId, String courseId, String qrToken, String sessionCode, Double latitude, Double longitude, Double accuracy, String deviceFingerprint) {
        this.studentId = studentId;
        this.courseId = courseId;
        this.qrToken = qrToken;
        this.sessionCode = sessionCode;
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;
        this.deviceFingerprint = deviceFingerprint;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getCourseId() {
        return courseId;
    }

    public void setCourseId(String courseId) {
        this.courseId = courseId;
    }

    public String getQrToken() {
        return qrToken;
    }

    public void setQrToken(String qrToken) {
        this.qrToken = qrToken;
    }

    public String getSessionCode() {
        return sessionCode;
    }

    public void setSessionCode(String sessionCode) {
        this.sessionCode = sessionCode;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getAccuracy() {
        return accuracy;
    }

    public void setAccuracy(Double accuracy) {
        this.accuracy = accuracy;
    }

    public String getDeviceFingerprint() {
        return deviceFingerprint;
    }

    public void setDeviceFingerprint(String deviceFingerprint) {
        this.deviceFingerprint = deviceFingerprint;
    }
}
