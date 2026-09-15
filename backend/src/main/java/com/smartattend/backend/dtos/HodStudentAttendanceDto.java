package com.smartattend.backend.dtos;

import java.util.ArrayList;
import java.util.List;

public class HodStudentAttendanceDto {

    private String studentId;
    private String studentName;
    private String email;
    private long totalAttended;
    private long totalConducted;
    private double overallPercentage;
    private boolean lowAttendance;
    private List<String> lowAttendanceCourses = new ArrayList<>();

    public HodStudentAttendanceDto() {
    }

    public HodStudentAttendanceDto(String studentId, String studentName, String email,
                                   long totalAttended, long totalConducted, double overallPercentage,
                                   boolean lowAttendance, List<String> lowAttendanceCourses) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.email = email;
        this.totalAttended = totalAttended;
        this.totalConducted = totalConducted;
        this.overallPercentage = overallPercentage;
        this.lowAttendance = lowAttendance;
        this.lowAttendanceCourses = lowAttendanceCourses;
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

    public long getTotalAttended() {
        return totalAttended;
    }

    public void setTotalAttended(long totalAttended) {
        this.totalAttended = totalAttended;
    }

    public long getTotalConducted() {
        return totalConducted;
    }

    public void setTotalConducted(long totalConducted) {
        this.totalConducted = totalConducted;
    }

    public double getOverallPercentage() {
        return overallPercentage;
    }

    public void setOverallPercentage(double overallPercentage) {
        this.overallPercentage = overallPercentage;
    }

    public boolean isLowAttendance() {
        return lowAttendance;
    }

    public void setLowAttendance(boolean lowAttendance) {
        this.lowAttendance = lowAttendance;
    }

    public List<String> getLowAttendanceCourses() {
        return lowAttendanceCourses;
    }

    public void setLowAttendanceCourses(List<String> lowAttendanceCourses) {
        this.lowAttendanceCourses = lowAttendanceCourses;
    }
}
