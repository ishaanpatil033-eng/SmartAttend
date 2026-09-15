package com.smartattend.backend.dtos;

public class DefaulterReportDto {

    private String studentId;
    private String studentName;
    private String branch;
    private String division;
    private String batch;
    private String courseId;
    private String courseName;
    private long presentClasses;
    private long totalClasses;
    private long absentClasses;
    private double attendancePercentage;
    private String status; // "Defaulter" | "Eligible"

    public DefaulterReportDto() {
    }

    public DefaulterReportDto(String studentId, String studentName, String branch, String division, String batch,
                              String courseId, String courseName, long presentClasses, long totalClasses,
                              long absentClasses, double attendancePercentage, String status) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.branch = branch;
        this.division = division;
        this.batch = batch;
        this.courseId = courseId;
        this.courseName = courseName;
        this.presentClasses = presentClasses;
        this.totalClasses = totalClasses;
        this.absentClasses = absentClasses;
        this.attendancePercentage = attendancePercentage;
        this.status = status;
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

    public long getPresentClasses() {
        return presentClasses;
    }

    public void setPresentClasses(long presentClasses) {
        this.presentClasses = presentClasses;
    }

    public long getTotalClasses() {
        return totalClasses;
    }

    public void setTotalClasses(long totalClasses) {
        this.totalClasses = totalClasses;
    }

    public long getAbsentClasses() {
        return absentClasses;
    }

    public void setAbsentClasses(long absentClasses) {
        this.absentClasses = absentClasses;
    }

    public double getAttendancePercentage() {
        return attendancePercentage;
    }

    public void setAttendancePercentage(double attendancePercentage) {
        this.attendancePercentage = attendancePercentage;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
