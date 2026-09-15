package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.AttendanceQrToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface AttendanceQrTokenRepository extends JpaRepository<AttendanceQrToken, Long> {

    Optional<AttendanceQrToken> findByToken(String token);

    Optional<AttendanceQrToken> findTopByCourseIdOrderByCreatedAtDesc(String courseId);

    void deleteByExpiresAtBefore(Instant expiryTime);

    void deleteByCourseId(String courseId);

    @Modifying
    @Query("UPDATE AttendanceQrToken t SET t.consumed = true, t.consumedAt = :now, t.consumedByStudentId = :studentId WHERE t.token = :token AND t.consumed = false AND t.expiresAt > :now")
    int consumeTokenAtomically(@Param("token") String token,
                               @Param("studentId") String studentId,
                               @Param("now") Instant now);
}
