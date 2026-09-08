package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.AttendanceQrToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface AttendanceQrTokenRepository extends JpaRepository<AttendanceQrToken, Long> {
    Optional<AttendanceQrToken> findByToken(String token);
    Optional<AttendanceQrToken> findTopByCourseIdOrderByCreatedAtDesc(String courseId);
    void deleteByExpiresAtBefore(Instant expiryTime);
}
