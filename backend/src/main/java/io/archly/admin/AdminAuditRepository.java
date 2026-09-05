package io.archly.admin;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAuditRepository extends JpaRepository<AdminAuditEvent, UUID> {}
