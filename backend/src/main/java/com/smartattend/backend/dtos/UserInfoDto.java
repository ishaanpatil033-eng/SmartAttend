package com.smartattend.backend.dtos;

public class UserInfoDto {

    private Long id;
    private String username;
    private String role;
    private String studentId;
    private String fullName;
    private String email;
    private String department = "Computer Science and Engineering";
    private String division;
    private String batch;
    private String academicYear;
    private Integer semester;

    public UserInfoDto() {
    }

    public UserInfoDto(Long id, String username, String role, String studentId, String fullName, String email) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.studentId = studentId;
        this.fullName = fullName;
        this.email = email;
    }

    public UserInfoDto(Long id, String username, String role, String studentId, String fullName, String email,
                       String department, String division, String batch, String academicYear, Integer semester) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.studentId = studentId;
        this.fullName = fullName;
        this.email = email;
        this.department = department != null ? department : "Computer Science and Engineering";
        this.division = division;
        this.batch = batch;
        this.academicYear = academicYear;
        this.semester = semester;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
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

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getDivision() {
        return division;
    }

    public void setDivision(String division) {
        this.division = division;
    }

    public String getBatch() {
        return batch;
    }

    public void setBatch(String batch) {
        this.batch = batch;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(String academicYear) {
        this.academicYear = academicYear;
    }

    public Integer getSemester() {
        return semester;
    }

    public void setSemester(Integer semester) {
        this.semester = semester;
    }
}
