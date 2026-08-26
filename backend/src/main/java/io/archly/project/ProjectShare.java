package io.archly.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_shares")
public class ProjectShare {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id")
    private Project project;
    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(nullable = false, length = 10)
    private String permission;
    @Column(nullable = false)
    private boolean revoked;
    @Column(nullable = false)
    private Instant createdAt;
    private Instant revokedAt;

    protected ProjectShare() {}

    public ProjectShare(Project project, String tokenHash, String permission) {
        this.id = UUID.randomUUID();
        this.project = project;
        this.tokenHash = tokenHash;
        this.permission = permission;
        this.createdAt = Instant.now();
    }

    public void revoke() { this.revoked = true; this.revokedAt = Instant.now(); }
    public UUID getId() { return id; }
    public Project getProject() { return project; }
    public String getTokenHash() { return tokenHash; }
    public String getPermission() { return permission; }
    public boolean isRevoked() { return revoked; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getRevokedAt() { return revokedAt; }
}
