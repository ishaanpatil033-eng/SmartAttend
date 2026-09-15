package com.smartattend.backend.dtos;

import java.time.Instant;

public class MoodleMessageResponse {

    private boolean success;
    private String message;
    private Long messageId;
    private Instant timestamp;
    private String senderStudentId;
    private String recipientStudentId;
    private String text;

    public MoodleMessageResponse() {
    }

    public MoodleMessageResponse(boolean success, String message, Long messageId, Instant timestamp,
                                 String senderStudentId, String recipientStudentId) {
        this(success, message, messageId, timestamp, senderStudentId, recipientStudentId, null);
    }

    public MoodleMessageResponse(boolean success, String message, Long messageId, Instant timestamp,
                                 String senderStudentId, String recipientStudentId, String text) {
        this.success = success;
        this.message = message;
        this.messageId = messageId;
        this.timestamp = timestamp;
        this.senderStudentId = senderStudentId;
        this.recipientStudentId = recipientStudentId;
        this.text = text;
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

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
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

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}
