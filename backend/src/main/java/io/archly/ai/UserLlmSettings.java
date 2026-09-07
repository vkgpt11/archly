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
    private String apiKeyHint;
    private Instant lastSuccessfulUseAt;
    private String lastErrorCode;
    @Column(nullable = false) private int encryptionKeyVersion;

    protected UserLlmSettings() {}

    UserLlmSettings(String userSubject, String provider, String model, String encryptedApiKey, String apiKeyHint, int encryptionKeyVersion, Instant now) {
        this.id = UUID.randomUUID();
        this.userSubject = userSubject;
        this.provider = provider;
        this.model = model;
        this.encryptedApiKey = encryptedApiKey;
        this.apiKeyHint = apiKeyHint;
        this.encryptionKeyVersion = encryptionKeyVersion;
        this.createdAt = now;
        this.updatedAt = now;
    }

    void update(String provider, String model, String encryptedApiKey, String apiKeyHint, int keyVersion, Instant now) {
        this.provider = provider;
        this.model = model;
        if (encryptedApiKey != null) { this.encryptedApiKey = encryptedApiKey; this.apiKeyHint = apiKeyHint; this.encryptionKeyVersion = keyVersion; }
        this.updatedAt = now;
        this.lastErrorCode = null;
    }

    void recordSuccess(Instant now) { lastSuccessfulUseAt = now; lastErrorCode = null; }
    void recordFailure(String code) { lastErrorCode = code; }

    String getProvider() { return provider; }
    String getUserSubject() { return userSubject; }
    String getModel() { return model; }
    String getEncryptedApiKey() { return encryptedApiKey; }
    String getApiKeyHint() { return apiKeyHint; }
    Instant getUpdatedAt() { return updatedAt; }
    Instant getLastSuccessfulUseAt() { return lastSuccessfulUseAt; }
    String getLastErrorCode() { return lastErrorCode; }
    int getEncryptionKeyVersion() { return encryptionKeyVersion; }
    void rotate(String ciphertext, int version, Instant now) { encryptedApiKey = ciphertext; encryptionKeyVersion = version; updatedAt = now; }
}
