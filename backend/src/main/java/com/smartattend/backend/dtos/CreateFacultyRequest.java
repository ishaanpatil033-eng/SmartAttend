package com.smartattend.backend.dtos;

public class CreateFacultyRequest {

    private String facultyId;
    private String fullName;
    private String email;

    public CreateFacultyRequest() {
    }

    public CreateFacultyRequest(String facultyId, String fullName, String email) {
        this.facultyId = facultyId;
        this.fullName = fullName;
        this.email = email;
    }

    public String getFacultyId() {
        return facultyId;
    }

    public void setFacultyId(String facultyId) {
        this.facultyId = facultyId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
