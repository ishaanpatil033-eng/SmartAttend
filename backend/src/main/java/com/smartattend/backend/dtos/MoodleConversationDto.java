package com.smartattend.backend.dtos;

import java.time.Instant;

public class MoodleConversationDto {

    private Long id;
    private String peerStudentId;
    private String peerStudentName;
    private String lastMessage;
    private Instant lastMessageTime;
    private int unreadCount;

    public MoodleConversationDto() {
    }

    public MoodleConversationDto(Long id, String peerStudentId, String peerStudentName,
                                 String lastMessage, Instant lastMessageTime, int unreadCount) {
        this.id = id;
        this.peerStudentId = peerStudentId;
        this.peerStudentName = peerStudentName;
        this.lastMessage = lastMessage;
        this.lastMessageTime = lastMessageTime;
        this.unreadCount = unreadCount;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPeerStudentId() {
        return peerStudentId;
    }

    public void setPeerStudentId(String peerStudentId) {
        this.peerStudentId = peerStudentId;
    }

    public String getPeerStudentName() {
        return peerStudentName;
    }

    public void setPeerStudentName(String peerStudentName) {
        this.peerStudentName = peerStudentName;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(String lastMessage) {
        this.lastMessage = lastMessage;
    }

    public Instant getLastMessageTime() {
        return lastMessageTime;
    }

    public void setLastMessageTime(Instant lastMessageTime) {
        this.lastMessageTime = lastMessageTime;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(int unreadCount) {
        this.unreadCount = unreadCount;
    }
}
