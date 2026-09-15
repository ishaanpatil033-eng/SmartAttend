package com.smartattend.backend.dtos;

public class StudentCourseAttendanceStatDto {

    private String studentId;
    private String studentName;
    private String email;
    private long attendedSessions;
    private long totalSessions;
    private double attendancePercentage;
    private boolean lowAttendance;

    public StudentCourseAttendanceStatDto() {
    }

    public StudentCourseAttendanceStatDto(String studentId, String studentName, String email,
                                          long attendedSessions, long totalSessions,
                                          double attendancePercentage, boolean lowAttendance) {
        this.studentId = studentId;
        this.studentName = studentName;
        this.email = email;
        this.attendedSessions = attendedSessions;
        this.totalSessions = totalSessions;
        this.attendancePercentage = attendancePercentage;
        this.lowAttendance = lowAttendance;
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

    public long getAttendedSessions() {
        return attendedSessions;
    }

    public void setAttendedSessions(long attendedSessions) {
        this.attendedSessions = attendedSessions;
    }

    public long getTotalSessions() {
        return totalSessions;
    }

    public void setTotalSessions(long totalSessions) {
        this.totalSessions = totalSessions;
    }

    public double getAttendancePercentage() {
        return attendancePercentage;
    }

    public void setAttendancePercentage(double attendancePercentage) {
        this.attendancePercentage = attendancePercentage;
    }

    public boolean isLowAttendance() {
        return lowAttendance;
    }

    public void setLowAttendance(boolean lowAttendance) {
        this.lowAttendance = lowAttendance;
    }
}
