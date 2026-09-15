package com.smartattend.backend.dtos;

import com.smartattend.backend.entities.Attendance;

import java.util.ArrayList;
import java.util.List;

public class CourseAttendanceSummaryDto {

    private String courseId;
    private String courseName;
    private long totalConductedSessions;
    private long totalStudentsCount;
    private double averageAttendancePercentage;
    private long lowAttendanceStudentsCount;
    private List<StudentCourseAttendanceStatDto> studentStats = new ArrayList<>();
    private List<Attendance> attendanceHistory = new ArrayList<>();

    public CourseAttendanceSummaryDto() {
    }

    public CourseAttendanceSummaryDto(String courseId, String courseName, long totalConductedSessions,
                                      long totalStudentsCount, double averageAttendancePercentage,
                                      long lowAttendanceStudentsCount,
                                      List<StudentCourseAttendanceStatDto> studentStats,
                                      List<Attendance> attendanceHistory) {
        this.courseId = courseId;
        this.courseName = courseName;
        this.totalConductedSessions = totalConductedSessions;
        this.totalStudentsCount = totalStudentsCount;
        this.averageAttendancePercentage = averageAttendancePercentage;
        this.lowAttendanceStudentsCount = lowAttendanceStudentsCount;
        this.studentStats = studentStats;
        this.attendanceHistory = attendanceHistory;
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

    public long getTotalConductedSessions() {
        return totalConductedSessions;
    }

    public void setTotalConductedSessions(long totalConductedSessions) {
        this.totalConductedSessions = totalConductedSessions;
    }

    public long getTotalStudentsCount() {
        return totalStudentsCount;
    }

    public void setTotalStudentsCount(long totalStudentsCount) {
        this.totalStudentsCount = totalStudentsCount;
    }

    public double getAverageAttendancePercentage() {
        return averageAttendancePercentage;
    }

    public void setAverageAttendancePercentage(double averageAttendancePercentage) {
        this.averageAttendancePercentage = averageAttendancePercentage;
    }

    public long getLowAttendanceStudentsCount() {
        return lowAttendanceStudentsCount;
    }

    public void setLowAttendanceStudentsCount(long lowAttendanceStudentsCount) {
        this.lowAttendanceStudentsCount = lowAttendanceStudentsCount;
    }

    public List<StudentCourseAttendanceStatDto> getStudentStats() {
        return studentStats;
    }

    public void setStudentStats(List<StudentCourseAttendanceStatDto> studentStats) {
        this.studentStats = studentStats;
    }

    public List<Attendance> getAttendanceHistory() {
        return attendanceHistory;
    }

    public void setAttendanceHistory(List<Attendance> attendanceHistory) {
        this.attendanceHistory = attendanceHistory;
    }
}
