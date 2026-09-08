package com.smartattend.backend.services;

import com.smartattend.backend.entities.Course;
import com.smartattend.backend.repositories.CourseRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CourseService {

    private final CourseRepository courseRepository;

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public Course createCourse(Course course) {
        if (course.getCourseId() == null || course.getCourseId().trim().isEmpty()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        if (course.getCourseName() == null || course.getCourseName().trim().isEmpty()) {
            throw new IllegalArgumentException("Course Name is required.");
        }

        if (courseRepository.findByCourseId(course.getCourseId().trim()).isPresent()) {
            throw new IllegalArgumentException("Course with ID " + course.getCourseId() + " already exists.");
        }

        course.setCourseId(course.getCourseId().trim());
        course.setCourseName(course.getCourseName().trim());

        return courseRepository.save(course);
    }

    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    public Optional<Course> getCourseById(Long id) {
        return courseRepository.findById(id);
    }

    public Optional<Course> getCourseByCourseId(String courseId) {
        return courseRepository.findByCourseId(courseId);
    }
}
