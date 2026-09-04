package io.archly.ai;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserLlmSettingsRepository extends JpaRepository<UserLlmSettings, UUID> {
    Optional<UserLlmSettings> findByUserSubject(String userSubject);
    void deleteByUserSubject(String userSubject);
}
