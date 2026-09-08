package com.smartattend.backend.dtos;

public class MoodleSyncResponse {

    private boolean success;
    private String message;
    private int recordsSynced;
    private String courseId;

    public MoodleSyncResponse() {
    }

    public MoodleSyncResponse(boolean success, String message, int recordsSynced, String courseId) {
        this.success = success;
        this.message = message;
        this.recordsSynced = recordsSynced;
        this.courseId = courseId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getRecordsSynced() {
        return recordsSynced;
    }

    public void setRecordsSynced(int recordsSynced) {
        this.recordsSynced = recordsSynced;
    }

    public String getCourseId() {
        return courseId;
    }

    public void setCourseId(String courseId) {
        this.courseId = courseId;
    }
}
