package com.smartattend.backend.dtos;

import com.smartattend.backend.entities.Attendance;

import java.util.ArrayList;
import java.util.List;

public class AdminOverviewDto {

    private long totalStudents;
    private long totalCourses;
    private long totalAttendanceRecords;
    private long totalConductedSessions;
    private double overallAttendancePercentage;
    private long defaultersCount;
    private List<DefaulterStudentDto> defaulters = new ArrayList<>();
    private List<CourseAttendanceStatDto> courseSummaries = new ArrayList<>();
    private List<Attendance> recentAttendanceHistory = new ArrayList<>();

    public AdminOverviewDto() {
    }

    public AdminOverviewDto(long totalStudents, long totalCourses, long totalAttendanceRecords,
                            long totalConductedSessions, double overallAttendancePercentage,
                            long defaultersCount, List<DefaulterStudentDto> defaulters,
                            List<CourseAttendanceStatDto> courseSummaries,
                            List<Attendance> recentAttendanceHistory) {
        this.totalStudents = totalStudents;
        this.totalCourses = totalCourses;
        this.totalAttendanceRecords = totalAttendanceRecords;
        this.totalConductedSessions = totalConductedSessions;
        this.overallAttendancePercentage = overallAttendancePercentage;
        this.defaultersCount = defaultersCount;
        this.defaulters = defaulters;
        this.courseSummaries = courseSummaries;
        this.recentAttendanceHistory = recentAttendanceHistory;
    }

    public long getTotalStudents() {
        return totalStudents;
    }

    public void setTotalStudents(long totalStudents) {
        this.totalStudents = totalStudents;
    }

    public long getTotalCourses() {
        return totalCourses;
    }

    public void setTotalCourses(long totalCourses) {
        this.totalCourses = totalCourses;
    }

    public long getTotalAttendanceRecords() {
        return totalAttendanceRecords;
    }

    public void setTotalAttendanceRecords(long totalAttendanceRecords) {
        this.totalAttendanceRecords = totalAttendanceRecords;
    }

    public long getTotalConductedSessions() {
        return totalConductedSessions;
    }

    public void setTotalConductedSessions(long totalConductedSessions) {
        this.totalConductedSessions = totalConductedSessions;
    }

    public double getOverallAttendancePercentage() {
        return overallAttendancePercentage;
    }

    public void setOverallAttendancePercentage(double overallAttendancePercentage) {
        this.overallAttendancePercentage = overallAttendancePercentage;
    }

    public long getDefaultersCount() {
        return defaultersCount;
    }

    public void setDefaultersCount(long defaultersCount) {
        this.defaultersCount = defaultersCount;
    }

    public List<DefaulterStudentDto> getDefaulters() {
        return defaulters;
    }

    public void setDefaulters(List<DefaulterStudentDto> defaulters) {
        this.defaulters = defaulters;
    }

    public List<CourseAttendanceStatDto> getCourseSummaries() {
        return courseSummaries;
    }

    public void setCourseSummaries(List<CourseAttendanceStatDto> courseSummaries) {
        this.courseSummaries = courseSummaries;
    }

    public List<Attendance> getRecentAttendanceHistory() {
        return recentAttendanceHistory;
    }

    public void setRecentAttendanceHistory(List<Attendance> recentAttendanceHistory) {
        this.recentAttendanceHistory = recentAttendanceHistory;
    }
}
