package io.archly.admin;

import io.archly.analytics.ArchlyUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_audit_events")
public class AdminAuditEvent {
    @Id private UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "administrator_user_id") private ArchlyUser administrator;
    @Column(nullable = false, length = 80) private String action;
    @Column(nullable = false, length = 100) private String correlationId;
    @Column(nullable = false) private Instant occurredAt;
    protected AdminAuditEvent() {}
    AdminAuditEvent(ArchlyUser administrator, String action, String correlationId) {
        this.id = UUID.randomUUID(); this.administrator = administrator; this.action = action;
        this.correlationId = correlationId; this.occurredAt = Instant.now();
    }
}
