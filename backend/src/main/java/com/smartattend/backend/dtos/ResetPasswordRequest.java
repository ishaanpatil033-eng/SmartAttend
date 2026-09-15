package com.smartattend.backend.dtos;

public class ResetPasswordRequest {

    private String username;

    public ResetPasswordRequest() {
    }

    public ResetPasswordRequest(String username) {
        this.username = username;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
