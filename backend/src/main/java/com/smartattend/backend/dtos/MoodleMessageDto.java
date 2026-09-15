package com.smartattend.backend.dtos;

public class MoodleMessageDto {

    private String senderStudentId;
    private String recipientStudentId;
    private String messageText;
    private String courseId;

    public MoodleMessageDto() {
    }

    public MoodleMessageDto(String senderStudentId, String recipientStudentId, String messageText, String courseId) {
        this.senderStudentId = senderStudentId;
        this.recipientStudentId = recipientStudentId;
        this.messageText = messageText;
        this.courseId = courseId;
    }

    public String getSenderStudentId() {
        return senderStudentId;
    }

    public void setSenderStudentId(String senderStudentId) {
        this.senderStudentId = senderStudentId;
    }

    public String getRecipientStudentId() {
        return recipientStudentId;
    }

    public void setRecipientStudentId(String recipientStudentId) {
        this.recipientStudentId = recipientStudentId;
    }

    public String getMessageText() {
        return messageText;
    }

    public void setMessageText(String messageText) {
        this.messageText = messageText;
    }

    public String getCourseId() {
        return courseId;
    }

    public void setCourseId(String courseId) {
        this.courseId = courseId;
    }
}
