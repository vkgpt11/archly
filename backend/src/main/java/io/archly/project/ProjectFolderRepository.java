package io.archly.project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectFolderRepository extends JpaRepository<ProjectFolder, UUID> {
    List<ProjectFolder> findAllByOwnerEmailOrderByNameAsc(String ownerEmail);
    Optional<ProjectFolder> findByOwnerEmailAndNameIgnoreCase(String ownerEmail, String name);
}
