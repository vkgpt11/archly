package io.archly.project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ProjectShareRepository extends JpaRepository<ProjectShare, UUID> {
    Optional<ProjectShare> findByTokenHashAndRevokedFalse(String tokenHash);
    List<ProjectShare> findAllByProjectIdOrderByCreatedAtDesc(UUID projectId);
    Optional<ProjectShare> findByIdAndProjectId(UUID id, UUID projectId);
    void deleteAllByProjectId(UUID projectId);
    long countByProjectIdAndRevokedFalseAndExpiresAtAfter(UUID projectId, Instant now);
    @Modifying
    @Query("delete from ProjectShare s where (s.revoked = true and s.revokedAt < :cutoff) or s.expiresAt < :cutoff")
    int deleteObsolete(Instant cutoff);
}
