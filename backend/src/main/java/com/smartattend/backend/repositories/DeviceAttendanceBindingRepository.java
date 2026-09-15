package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.DeviceAttendanceBinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeviceAttendanceBindingRepository extends JpaRepository<DeviceAttendanceBinding, Long> {

    Optional<DeviceAttendanceBinding> findBySessionCodeAndDeviceFingerprint(String sessionCode, String deviceFingerprint);

    Optional<DeviceAttendanceBinding> findBySessionCodeAndStudentId(String sessionCode, String studentId);

    boolean existsBySessionCodeAndDeviceFingerprint(String sessionCode, String deviceFingerprint);

    boolean existsBySessionCodeAndStudentId(String sessionCode, String studentId);

    void deleteBySessionCode(String sessionCode);
}
