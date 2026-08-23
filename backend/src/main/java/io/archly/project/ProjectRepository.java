package io.archly.project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findAllByOwnerEmailOrderByUpdatedAtDesc(String ownerEmail);
    Optional<Project> findByIdAndOwnerEmail(UUID id, String ownerEmail);
}
