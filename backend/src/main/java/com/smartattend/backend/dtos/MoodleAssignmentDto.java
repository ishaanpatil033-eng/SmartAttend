package com.smartattend.backend.dtos;

import java.time.Instant;

public class MoodleAssignmentDto {

    private Long id;
    private String courseId;
    private String courseName;
    private String title;
    private String description;
    private Instant dueDate;
    private Instant cutoffDate;
    private String submissionStatus; // "submitted", "not_submitted", "draft"
    private String gradingStatus;    // "graded", "not_graded"
    private String deadlineStatus;   // "due_today", "due_tomorrow", "due_soon", "upcoming", "overdue", "submitted"
    private String formattedDue;     // e.g. "Due tomorrow at 11:59 PM"
    private int urgencyPriority;     // 1: due_today, 2: due_tomorrow, 3: due_soon, 4: upcoming, 5: overdue, 6: submitted

    public MoodleAssignmentDto() {
    }

    public MoodleAssignmentDto(Long id, String courseId, String courseName, String title, String description,
                               Instant dueDate, Instant cutoffDate, String submissionStatus, String gradingStatus,
                               String deadlineStatus, String formattedDue, int urgencyPriority) {
        this.id = id;
        this.courseId = courseId;
        this.courseName = courseName;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.cutoffDate = cutoffDate;
        this.submissionStatus = submissionStatus;
        this.gradingStatus = gradingStatus;
        this.deadlineStatus = deadlineStatus;
        this.formattedDue = formattedDue;
        this.urgencyPriority = urgencyPriority;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getDueDate() {
        return dueDate;
    }

    public void setDueDate(Instant dueDate) {
        this.dueDate = dueDate;
    }

    public Instant getCutoffDate() {
        return cutoffDate;
    }

    public void setCutoffDate(Instant cutoffDate) {
        this.cutoffDate = cutoffDate;
    }

    public String getSubmissionStatus() {
        return submissionStatus;
    }

    public void setSubmissionStatus(String submissionStatus) {
        this.submissionStatus = submissionStatus;
    }

    public String getGradingStatus() {
        return gradingStatus;
    }

    public void setGradingStatus(String gradingStatus) {
        this.gradingStatus = gradingStatus;
    }

    public String getDeadlineStatus() {
        return deadlineStatus;
    }

    public void setDeadlineStatus(String deadlineStatus) {
        this.deadlineStatus = deadlineStatus;
    }

    public String getFormattedDue() {
        return formattedDue;
    }

    public void setFormattedDue(String formattedDue) {
        this.formattedDue = formattedDue;
    }

    public int getUrgencyPriority() {
        return urgencyPriority;
    }

    public void setUrgencyPriority(int urgencyPriority) {
        this.urgencyPriority = urgencyPriority;
    }
}
