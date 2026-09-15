package com.smartattend.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false, unique = true, length = 50)
    private String courseId;

    @Column(name = "course_name", nullable = false, length = 100)
    private String courseName;

    @Column(name = "branch", length = 100)
    private String branch = "Computer Science";

    @Column(name = "division", length = 10)
    private String division = "A";

    @Column(name = "batch", length = 20)
    private String batch = "A1";

    @Column(name = "academic_year", length = 20)
    private String academicYear = "FE";

    @Column(name = "semester")
    private Integer semester = 1;

    @Column(name = "course_type", length = 20)
    private String courseType = "THEORY";

    @Column(name = "assigned_faculty_id", length = 50)
    private String assignedFacultyId;

    @Column(name = "assigned_faculty_name", length = 100)
    private String assignedFacultyName;

    public Course() {
    }

    public Course(String courseId, String courseName) {
        this.courseId = courseId;
        this.courseName = courseName;
        this.branch = "Computer Science";
        this.division = "A";
        this.batch = "A1";
        this.academicYear = "FE";
        this.semester = 1;
        this.courseType = "THEORY";
    }

    public Course(String courseId, String courseName, String branch, String division, String batch,
                  String academicYear, Integer semester, String courseType, String assignedFacultyId, String assignedFacultyName) {
        this.courseId = courseId;
        this.courseName = courseName;
        this.branch = branch != null ? branch : "Computer Science";
        this.division = division != null ? division : "A";
        this.batch = batch != null ? batch : "A1";
        this.academicYear = academicYear != null ? academicYear : "FE";
        this.semester = semester != null ? semester : 1;
        this.courseType = courseType != null ? courseType : "THEORY";
        this.assignedFacultyId = assignedFacultyId;
        this.assignedFacultyName = assignedFacultyName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCourseId() {
        return courseId;
    }

    public void setCourseId(String courseId) {
        this.courseId = courseId;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
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

    public String getCourseType() {
        return courseType;
    }

    public void setCourseType(String courseType) {
        this.courseType = courseType;
    }

    public String getAssignedFacultyId() {
        return assignedFacultyId;
    }

    public void setAssignedFacultyId(String assignedFacultyId) {
        this.assignedFacultyId = assignedFacultyId;
    }

    public String getAssignedFacultyName() {
        return assignedFacultyName;
    }

    public void setAssignedFacultyName(String assignedFacultyName) {
        this.assignedFacultyName = assignedFacultyName;
    }
}
