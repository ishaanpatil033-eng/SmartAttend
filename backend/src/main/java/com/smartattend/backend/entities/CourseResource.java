package com.smartattend.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_resources")
public class CourseResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false, length = 50)
    private String courseId;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "resource_type", nullable = false, length = 50)
    private String resourceType = "DOCUMENT"; // NOTES, DOCUMENT, VIDEO, PRACTICAL_EXPERIMENT

    @Column(name = "content_or_url", nullable = true, length = 1000)
    private String contentOrUrl;

    @Column(name = "uploaded_by_faculty_id", length = 50)
    private String uploadedByFacultyId;

    @Column(name = "experiment_number", length = 50)
    private String experimentNumber;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public CourseResource() {
    }

    public CourseResource(String courseId, String title, String description, String resourceType, String contentOrUrl, String uploadedByFacultyId) {
        this.courseId = courseId;
        this.title = title;
        this.description = description;
        this.resourceType = resourceType != null ? resourceType : "DOCUMENT";
        this.contentOrUrl = contentOrUrl;
        this.uploadedByFacultyId = uploadedByFacultyId;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getResourceType() {
        return resourceType;
    }

    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
    }

    public String getContentOrUrl() {
        return contentOrUrl;
    }

    public void setContentOrUrl(String contentOrUrl) {
        this.contentOrUrl = contentOrUrl;
    }

    public String getFileUrl() {
        return contentOrUrl;
    }

    public void setFileUrl(String fileUrl) {
        if (fileUrl != null && !fileUrl.trim().isEmpty()) {
            this.contentOrUrl = fileUrl;
        }
    }

    public String getUploadedByFacultyId() {
        return uploadedByFacultyId;
    }

    public void setUploadedByFacultyId(String uploadedByFacultyId) {
        this.uploadedByFacultyId = uploadedByFacultyId;
    }

    public String getExperimentNumber() {
        return experimentNumber;
    }

    public void setExperimentNumber(String experimentNumber) {
        this.experimentNumber = experimentNumber;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
