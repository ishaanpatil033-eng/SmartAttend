package com.smartattend.backend.services;

import com.smartattend.backend.entities.SecurityAuditLog;
import com.smartattend.backend.repositories.SecurityAuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SecurityAuditService {

    private final SecurityAuditLogRepository auditLogRepository;

    public SecurityAuditService(SecurityAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(String eventType, String username, String studentId, String clientIp, String userAgent, String courseId, String sessionCode, String details) {
        try {
            SecurityAuditLog log = new SecurityAuditLog(
                    eventType,
                    username,
                    studentId,
                    clientIp,
                    userAgent != null && userAgent.length() > 250 ? userAgent.substring(0, 250) : userAgent,
                    courseId,
                    sessionCode,
                    details != null && details.length() > 490 ? details.substring(0, 490) : details
            );
            auditLogRepository.save(log);
        } catch (Exception e) {
            // Fail-safe: Audit logging failures must not crash critical business operations
            System.err.println("Failed to write security audit log: " + e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(String eventType, String username, String clientIp, String details) {
        logEvent(eventType, username, null, clientIp, null, null, null, details);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(String eventType, String username, String details) {
        logEvent(eventType, username, null, null, null, null, null, details);
    }

    public List<SecurityAuditLog> getRecentLogs() {
        return auditLogRepository.findTop100ByOrderByTimestampDesc();
    }
}
