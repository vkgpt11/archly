package io.archly.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_sessions")
public class UserSession {
    @Id private UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private ArchlyUser user;
    @Column(nullable = false, length = 64) private String sessionHash;
    @Column(nullable = false) private Instant establishedAt;
    @Column(nullable = false) private Instant lastSeenAt;
    @Column(nullable = false) private Instant expiresAt;

    protected UserSession() {}

    UserSession(ArchlyUser user, String sessionHash, Instant now, int retentionDays) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.sessionHash = sessionHash;
        this.establishedAt = now;
        this.lastSeenAt = now;
        this.expiresAt = now.plusSeconds((long) retentionDays * 24 * 60 * 60);
    }
}
