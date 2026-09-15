package com.smartattend.backend.dtos;

import java.util.ArrayList;
import java.util.List;

public class ClassmateDto {

    private String studentId;
    private String studentName;
    private String email;
    private String academicYear;
    private Integer semester;
    private String batch;
    private List<String> enrolledCourses = new ArrayList<>();

    public ClassmateDto() {
    }

    public ClassmateDto(String studentId, String studentName, String email, String academicYear,
                        Integer semester, String batch, List<String> enrolledCourses) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.email = email;
        this.academicYear = academicYear;
        this.semester = semester;
        this.batch = batch;
        this.enrolledCourses = enrolledCourses != null ? enrolledCourses : new ArrayList<>();
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public String getBatch() {
        return batch;
    }

    public void setBatch(String batch) {
        this.batch = batch;
    }

    public List<String> getEnrolledCourses() {
        return enrolledCourses;
    }

    public void setEnrolledCourses(List<String> enrolledCourses) {
        this.enrolledCourses = enrolledCourses;
    }
}
