package io.archly.project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectShareRepository extends JpaRepository<ProjectShare, UUID> {
    Optional<ProjectShare> findByTokenHashAndRevokedFalse(String tokenHash);
    List<ProjectShare> findAllByProjectIdOrderByCreatedAtDesc(UUID projectId);
    Optional<ProjectShare> findByIdAndProjectId(UUID id, UUID projectId);
}
