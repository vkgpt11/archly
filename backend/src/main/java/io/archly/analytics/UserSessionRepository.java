package io.archly.analytics;

import java.util.Optional;
import java.util.UUID;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    Optional<UserSession> findByUserIdAndSessionHash(UUID userId, String sessionHash);
    List<UserSession> findTop5000ByExpiresAtBeforeOrderByExpiresAtAsc(Instant cutoff);
}
