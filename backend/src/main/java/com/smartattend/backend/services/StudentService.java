package com.smartattend.backend.services;

import com.smartattend.backend.entities.Student;
import com.smartattend.backend.repositories.StudentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class StudentService {

    private final StudentRepository studentRepository;

    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    public Student createStudent(Student student) {
        if (student.getStudentId() == null || student.getStudentId().trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID is required.");
        }
        if (student.getStudentName() == null || student.getStudentName().trim().isEmpty()) {
            throw new IllegalArgumentException("Student Name is required.");
        }
        if (student.getEmail() == null || student.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Student Email is required.");
        }

        if (studentRepository.findByStudentId(student.getStudentId().trim()).isPresent()) {
            throw new IllegalArgumentException("Student with ID " + student.getStudentId() + " already exists.");
        }
        if (studentRepository.findByEmail(student.getEmail().trim()).isPresent()) {
            throw new IllegalArgumentException("Student with email " + student.getEmail() + " already exists.");
        }

        student.setStudentId(student.getStudentId().trim());
        student.setStudentName(student.getStudentName().trim());
        student.setEmail(student.getEmail().trim());

        return studentRepository.save(student);
    }

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public Optional<Student> getStudentById(Long id) {
        return studentRepository.findById(id);
    }

    public Optional<Student> getStudentByStudentId(String studentId) {
        return studentRepository.findByStudentId(studentId);
    }
}
