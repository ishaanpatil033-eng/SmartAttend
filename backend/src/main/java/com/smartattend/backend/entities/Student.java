package com.smartattend.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false, unique = true, length = 50)
    private String studentId;

    @Column(name = "student_name", nullable = false, length = 100)
    private String studentName;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "academic_year", length = 20)
    private String academicYear = "FE";

    @Column(name = "semester")
    private Integer semester = 1;

    @Column(name = "branch", length = 100)
    private String branch = "Computer Science";

    @Column(name = "division", length = 10)
    private String division = "A";

    @Column(name = "batch", length = 20)
    private String batch = "A1";

    @Column(name = "active")
    private Boolean active = true;

    public Student() {
    }

    public Student(String studentId, String studentName, String email) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.email = email;
        this.branch = "Computer Science";
        this.division = "A";
        this.academicYear = "FE";
        this.semester = 1;
        this.batch = "A1";
        this.active = true;
    }

    public Student(String studentId, String studentName, String email, String academicYear, Integer semester, String batch) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.email = email;
        this.academicYear = academicYear != null ? academicYear : "FE";
        this.semester = semester != null ? semester : 1;
        this.batch = batch != null ? batch : "A1";
        this.branch = "Computer Science";
        this.division = (batch != null && batch.length() > 0) ? batch.substring(0, 1).toUpperCase() : "A";
        this.active = true;
    }

    public Student(String studentId, String studentName, String email, String branch, String division,
                   String academicYear, Integer semester, String batch) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.email = email;
        this.branch = branch != null ? branch : "Computer Science";
        this.division = division != null ? division : "A";
        this.academicYear = academicYear != null ? academicYear : "FE";
        this.semester = semester != null ? semester : 1;
        this.batch = batch != null ? batch : "A1";
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getDivision() {
        return division;
    }

    public void setDivision(String division) {
        this.division = division;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
