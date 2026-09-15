package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.SecurityAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, Long> {

    List<SecurityAuditLog> findTop100ByOrderByTimestampDesc();

    List<SecurityAuditLog> findByUsernameOrderByTimestampDesc(String username);

    List<SecurityAuditLog> findByStudentIdOrderByTimestampDesc(String studentId);
}
