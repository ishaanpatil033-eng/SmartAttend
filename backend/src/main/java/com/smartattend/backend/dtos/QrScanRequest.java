package com.smartattend.backend.dtos;

public class QrScanRequest {

    private String studentId;
    private String courseId;
    private String qrToken;

    public QrScanRequest() {
    }

    public QrScanRequest(String studentId, String courseId, String qrToken) {
        this.studentId = studentId;
        this.courseId = courseId;
        this.qrToken = qrToken;
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
}
