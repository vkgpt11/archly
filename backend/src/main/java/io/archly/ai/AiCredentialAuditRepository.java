package io.archly.ai;
import java.time.Instant; import java.util.UUID; import org.springframework.data.jpa.repository.JpaRepository;
interface AiCredentialAuditRepository extends JpaRepository<AiCredentialAuditEvent,UUID>{long deleteByOccurredAtBefore(Instant cutoff);}
