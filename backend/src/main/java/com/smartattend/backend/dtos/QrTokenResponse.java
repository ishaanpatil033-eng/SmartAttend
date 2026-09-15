package com.smartattend.backend.dtos;

import java.time.Instant;

public class QrTokenResponse {

    private String token;
    private String courseId;
    private String sessionCode;
    private int expiresInSeconds;
    private Instant expiresAt;

    public QrTokenResponse() {
    }

    public QrTokenResponse(String token, String courseId, int expiresInSeconds, Instant expiresAt) {
        this(token, courseId, courseId, expiresInSeconds, expiresAt);
    }

    public QrTokenResponse(String token, String courseId, String sessionCode, int expiresInSeconds, Instant expiresAt) {
        this.token = token;
        this.courseId = courseId;
        this.sessionCode = sessionCode;
        this.expiresInSeconds = expiresInSeconds;
        this.expiresAt = expiresAt;
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

    public int getExpiresInSeconds() {
        return expiresInSeconds;
    }

    public void setExpiresInSeconds(int expiresInSeconds) {
        this.expiresInSeconds = expiresInSeconds;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
