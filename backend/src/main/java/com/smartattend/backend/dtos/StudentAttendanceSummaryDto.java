package com.smartattend.backend.dtos;

import com.smartattend.backend.entities.Attendance;
import com.smartattend.backend.entities.Student;

import java.util.ArrayList;
import java.util.List;

public class StudentAttendanceSummaryDto {

    private Student student;
    private double overallAttendancePercentage;
    private long totalAttendedSessions;
    private long totalConductedSessions;
    private long lowAttendanceCoursesCount;
    private List<CourseAttendanceStatDto> courseSummaries = new ArrayList<>();
    private List<Attendance> attendanceHistory = new ArrayList<>();

    public StudentAttendanceSummaryDto() {
    }

    public StudentAttendanceSummaryDto(Student student, double overallAttendancePercentage,
                                      long totalAttendedSessions, long totalConductedSessions,
                                      long lowAttendanceCoursesCount,
                                      List<CourseAttendanceStatDto> courseSummaries,
                                      List<Attendance> attendanceHistory) {
        this.student = student;
        this.overallAttendancePercentage = overallAttendancePercentage;
        this.totalAttendedSessions = totalAttendedSessions;
        this.totalConductedSessions = totalConductedSessions;
        this.lowAttendanceCoursesCount = lowAttendanceCoursesCount;
        this.courseSummaries = courseSummaries;
        this.attendanceHistory = attendanceHistory;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public double getOverallAttendancePercentage() {
        return overallAttendancePercentage;
    }

    public void setOverallAttendancePercentage(double overallAttendancePercentage) {
        this.overallAttendancePercentage = overallAttendancePercentage;
    }

    public long getTotalAttendedSessions() {
        return totalAttendedSessions;
    }

    public void setTotalAttendedSessions(long totalAttendedSessions) {
        this.totalAttendedSessions = totalAttendedSessions;
    }

    public long getTotalConductedSessions() {
        return totalConductedSessions;
    }

    public void setTotalConductedSessions(long totalConductedSessions) {
        this.totalConductedSessions = totalConductedSessions;
    }

    public long getLowAttendanceCoursesCount() {
        return lowAttendanceCoursesCount;
    }

    public void setLowAttendanceCoursesCount(long lowAttendanceCoursesCount) {
        this.lowAttendanceCoursesCount = lowAttendanceCoursesCount;
    }

    public List<CourseAttendanceStatDto> getCourseSummaries() {
        return courseSummaries;
    }

    public void setCourseSummaries(List<CourseAttendanceStatDto> courseSummaries) {
        this.courseSummaries = courseSummaries;
    }

    public List<Attendance> getAttendanceHistory() {
        return attendanceHistory;
    }

    public void setAttendanceHistory(List<Attendance> attendanceHistory) {
        this.attendanceHistory = attendanceHistory;
    }
}
