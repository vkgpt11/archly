package io.archly.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_events")
public class ProductEvent {
    public enum Type { SESSION_ESTABLISHED, PROJECT_CREATED, PROJECT_DUPLICATED, PROJECT_CONTENT_SAVED, PROJECT_ARCHIVED, PROJECT_RESTORED, PROJECT_DELETED }

    @Id private UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private ArchlyUser user;
    private UUID projectId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40) private Type eventType;
    @Column(nullable = false) private Instant occurredAt;

    protected ProductEvent() {}
    ProductEvent(ArchlyUser user, UUID projectId, Type eventType, Instant occurredAt) {
        this.id = UUID.randomUUID(); this.user = user; this.projectId = projectId;
        this.eventType = eventType; this.occurredAt = occurredAt;
    }
}
