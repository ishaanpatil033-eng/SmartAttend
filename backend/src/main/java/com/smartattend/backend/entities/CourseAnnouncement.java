package com.smartattend.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_announcements")
public class CourseAnnouncement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false, length = 50)
    private String courseId;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "content", nullable = false, length = 2000)
    private String content;

    @Column(name = "author_name", length = 100)
    private String authorName;

    @Column(name = "author_role", length = 50)
    private String authorRole = "FACULTY";

    @Column(name = "target_division", length = 10)
    private String targetDivision;

    @Column(name = "target_batch", length = 20)
    private String targetBatch;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public CourseAnnouncement() {
    }

    public CourseAnnouncement(String courseId, String title, String content, String authorName, String authorRole) {
        this.courseId = courseId;
        this.title = title;
        this.content = content;
        this.authorName = authorName;
        this.authorRole = authorRole != null ? authorRole : "FACULTY";
        this.createdAt = LocalDateTime.now();
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getAuthorRole() {
        return authorRole;
    }

    public void setAuthorRole(String authorRole) {
        this.authorRole = authorRole;
    }

    public String getTargetDivision() {
        return targetDivision;
    }

    public void setTargetDivision(String targetDivision) {
        this.targetDivision = targetDivision;
    }

    public String getTargetBatch() {
        return targetBatch;
    }

    public void setTargetBatch(String targetBatch) {
        this.targetBatch = targetBatch;
    }

    public String getAttachmentUrl() {
        return attachmentUrl;
    }

    public void setAttachmentUrl(String attachmentUrl) {
        this.attachmentUrl = attachmentUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
