package io.archly.ai;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserLlmSettingsRepository extends JpaRepository<UserLlmSettings, UUID> {
    Optional<UserLlmSettings> findByUserSubject(String userSubject);
    void deleteByUserSubject(String userSubject);
    java.util.List<UserLlmSettings> findTop1000ByEncryptionKeyVersionNot(int version);
    long countByEncryptionKeyVersionNot(int version);
}
