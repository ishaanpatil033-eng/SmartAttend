package com.smartattend.backend.repositories;

import com.smartattend.backend.entities.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByUsername(String username);

    Optional<UserAccount> findByStudentId(String studentId);

    boolean existsByUsername(String username);
    java.util.List<UserAccount> findAllByRole(String role);
}
