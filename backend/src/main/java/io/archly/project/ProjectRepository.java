package io.archly.project;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    Page<Project> findAllByOwnerEmail(String ownerEmail, Pageable pageable);
    Optional<Project> findByIdAndOwnerEmail(UUID id, String ownerEmail);
    long countByArchivedTrue();
    long countByOwnerEmailIgnoreCase(String ownerEmail);
    @Modifying
    @Query("update Project p set p.ownerUserId = :userId where p.ownerUserId is null and lower(p.ownerEmail) = lower(:email)")
    int linkOwnerByEmail(@Param("email") String email, @Param("userId") UUID userId);
}
