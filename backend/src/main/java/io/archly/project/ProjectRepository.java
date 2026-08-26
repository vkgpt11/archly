package io.archly.project;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    Page<Project> findAllByOwnerEmail(String ownerEmail, Pageable pageable);
    Optional<Project> findByIdAndOwnerEmail(UUID id, String ownerEmail);
}
