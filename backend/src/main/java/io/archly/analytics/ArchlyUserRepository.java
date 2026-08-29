package io.archly.analytics;

import java.time.Instant;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArchlyUserRepository extends JpaRepository<ArchlyUser, UUID> {
    Optional<ArchlyUser> findByGoogleSubject(String googleSubject);
    Optional<ArchlyUser> findByEmailIgnoreCase(String email);
    long countByFirstLoginAtGreaterThanEqualAndFirstLoginAtLessThan(Instant start, Instant end);
    List<ArchlyUser> findAllByFirstLoginAtGreaterThanEqualAndFirstLoginAtLessThan(Instant start, Instant end);
}
