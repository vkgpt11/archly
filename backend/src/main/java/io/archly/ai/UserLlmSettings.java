package io.archly.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_llm_settings")
class UserLlmSettings {
    @Id private UUID id;
    @Column(nullable = false, unique = true) private String userSubject;
    @Column(nullable = false) private String provider;
    @Column(nullable = false) private String model;
    @Column(nullable = false, length = 2048) private String encryptedApiKey;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    protected UserLlmSettings() {}

    UserLlmSettings(String userSubject, String provider, String model, String encryptedApiKey, Instant now) {
        this.id = UUID.randomUUID();
        this.userSubject = userSubject;
        this.provider = provider;
        this.model = model;
        this.encryptedApiKey = encryptedApiKey;
        this.createdAt = now;
        this.updatedAt = now;
    }

    void update(String provider, String model, String encryptedApiKey, Instant now) {
        this.provider = provider;
        this.model = model;
        if (encryptedApiKey != null) this.encryptedApiKey = encryptedApiKey;
        this.updatedAt = now;
    }

    String getProvider() { return provider; }
    String getModel() { return model; }
    String getEncryptedApiKey() { return encryptedApiKey; }
}
