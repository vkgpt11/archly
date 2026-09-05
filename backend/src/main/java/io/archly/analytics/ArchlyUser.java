package io.archly.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "archly_users")
public class ArchlyUser {
    @Id private UUID id;
    @Column(nullable = false, unique = true) private String googleSubject;
    @Column(nullable = false) private String email;
    @Column(nullable = false) private Instant firstLoginAt;
    @Column(nullable = false) private Instant lastLoginAt;
    @Column(nullable = false) private long loginCount;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    protected ArchlyUser() {}

    ArchlyUser(String googleSubject, String email, Instant now) {
        this.id = UUID.randomUUID();
        this.googleSubject = googleSubject;
        this.email = email;
        this.firstLoginAt = now;
        this.lastLoginAt = now;
        this.createdAt = now;
        this.updatedAt = now;
    }

    void establishNewSession(String verifiedEmail, Instant now) {
        email = verifiedEmail;
        lastLoginAt = now;
        updatedAt = now;
        loginCount++;
    }

    public UUID getId() { return id; }
    public String getGoogleSubject() { return googleSubject; }
    public String getEmail() { return email; }
    public Instant getFirstLoginAt() { return firstLoginAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public long getLoginCount() { return loginCount; }
}
