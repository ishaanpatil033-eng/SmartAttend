package com.smartattend.backend.dtos;

public class CourseAttendanceStatDto {

    private String courseId;
    private String courseName;
    private long attendedSessions;
    private long totalSessions;
    private double attendancePercentage;
    private boolean lowAttendance;
    private String assignedFacultyId;
    private String assignedFacultyName;

    public CourseAttendanceStatDto() {
    }

    public CourseAttendanceStatDto(String courseId, String courseName, long attendedSessions,
                                   long totalSessions, double attendancePercentage, boolean lowAttendance) {
        this.courseId = courseId;
        this.courseName = courseName;
        this.attendedSessions = attendedSessions;
        this.totalSessions = totalSessions;
        this.attendancePercentage = attendancePercentage;
        this.lowAttendance = lowAttendance;
    }

    public CourseAttendanceStatDto(String courseId, String courseName, long attendedSessions,
                                   long totalSessions, double attendancePercentage, boolean lowAttendance,
                                   String assignedFacultyId, String assignedFacultyName) {
        this.courseId = courseId;
        this.courseName = courseName;
        this.attendedSessions = attendedSessions;
        this.totalSessions = totalSessions;
        this.attendancePercentage = attendancePercentage;
        this.lowAttendance = lowAttendance;
        this.assignedFacultyId = assignedFacultyId;
        this.assignedFacultyName = assignedFacultyName;
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
