package io.archly.ai;

import jakarta.transaction.Transactional;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.context.event.EventListener;

@Service
public class UserLlmSettingsService {
    record View(String provider, String model, boolean hasApiKey, boolean credentialStorageAvailable,
                String apiKeyHint, Instant updatedAt, Instant lastSuccessfulUseAt, String lastErrorCode) {}
    record Configuration(String model, String apiKey) {}

    private final UserLlmSettingsRepository repository;
    private final ApiKeyCipher cipher;
    private final AiCredentialAuditRepository audits;

    UserLlmSettingsService(UserLlmSettingsRepository repository, ApiKeyCipher cipher, AiCredentialAuditRepository audits) {
        this.repository = repository;
        this.cipher = cipher;
        this.audits = audits;
    }

    View get(String subject) {
        return repository.findByUserSubject(subject)
            .map(value -> view(value, cipher.configured()))
            .orElseGet(() -> new View("OPENAI", "gpt-4.1-mini", false, cipher.configured(), null, null, null, null));
    }

    @Transactional
    View save(String subject, String provider, String model, String apiKey) {
        if (!"OPENAI".equals(provider)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported AI provider.");
        String normalizedModel = model.trim();
        if (!normalizedModel.matches("[A-Za-z0-9._:-]{1,120}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid model name.");
        var existing = repository.findByUserSubject(subject);
        String normalizedKey = apiKey == null ? "" : apiKey.trim();
        String encrypted = normalizedKey.isBlank() ? null : cipher.encrypt(normalizedKey, subject, provider);
        String hint = normalizedKey.isBlank() ? null : "••••" + normalizedKey.substring(Math.max(0, normalizedKey.length() - 4));
        if (existing.isEmpty() && encrypted == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter an API key.");
        Instant now = Instant.now();
        UserLlmSettings value = existing.orElseGet(() -> new UserLlmSettings(subject, provider, normalizedModel, encrypted, hint, cipher.currentVersion(), now));
        if (existing.isPresent()) value.update(provider, normalizedModel, encrypted, hint, cipher.currentVersion(), now);
        repository.save(value);
        audits.save(new AiCredentialAuditEvent(subject, existing.isPresent() ? "UPDATED" : "CREATED", provider, cipher.currentVersion(), "SUCCESS"));
        return view(value, cipher.configured());
    }

    @Transactional
    void delete(String subject) { repository.findByUserSubject(subject).ifPresent(value -> audits.save(new AiCredentialAuditEvent(subject, "DELETED", value.getProvider(), value.getEncryptionKeyVersion(), "SUCCESS"))); repository.deleteByUserSubject(subject); }

    @EventListener void accountDeleted(AccountDeletedEvent event) { delete(event.userSubject()); }

    Configuration requireConfiguration(String subject) {
        UserLlmSettings value = repository.findByUserSubject(subject).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "Configure an AI provider in Profile → Settings first."));
        String plaintext;
        try { plaintext = cipher.decrypt(value.getEncryptedApiKey(), subject, value.getProvider(), value.getEncryptionKeyVersion()); }
        catch (ResponseStatusException failure) { audits.save(new AiCredentialAuditEvent(subject, "DECRYPT_FAILED", value.getProvider(), value.getEncryptionKeyVersion(), "FAILURE")); throw failure; }
        if (value.getEncryptionKeyVersion() != cipher.currentVersion()) {
            value.rotate(cipher.encrypt(plaintext, subject, value.getProvider()), cipher.currentVersion(), Instant.now());
            audits.save(new AiCredentialAuditEvent(subject, "ROTATED", value.getProvider(), cipher.currentVersion(), "SUCCESS"));
        }
        return new Configuration(value.getModel(), plaintext);
    }

    @Transactional
    void recordSuccess(String subject) { repository.findByUserSubject(subject).ifPresent(value -> { value.recordSuccess(Instant.now()); audits.save(new AiCredentialAuditEvent(subject, "USED", value.getProvider(), value.getEncryptionKeyVersion(), "SUCCESS")); }); }

    @Transactional
    void recordFailure(String subject, String code) { repository.findByUserSubject(subject).ifPresent(value -> { value.recordFailure(code); audits.save(new AiCredentialAuditEvent(subject, "USED", value.getProvider(), value.getEncryptionKeyVersion(), "FAILURE")); }); }

    @Transactional
    void recordTest(String subject, boolean success) { repository.findByUserSubject(subject).ifPresent(value -> audits.save(new AiCredentialAuditEvent(subject, "TESTED", value.getProvider(), value.getEncryptionKeyVersion(), success ? "SUCCESS" : "FAILURE"))); }

    @Transactional public long rotateBatch() { for (UserLlmSettings value : repository.findTop1000ByEncryptionKeyVersionNot(cipher.currentVersion())) { String plaintext = cipher.decrypt(value.getEncryptedApiKey(), value.getUserSubject(), value.getProvider(), value.getEncryptionKeyVersion()); value.rotate(cipher.encrypt(plaintext, value.getUserSubject(), value.getProvider()), cipher.currentVersion(), Instant.now()); audits.save(new AiCredentialAuditEvent(value.getUserSubject(), "ROTATED", value.getProvider(), cipher.currentVersion(), "SUCCESS")); } return repository.countByEncryptionKeyVersionNot(cipher.currentVersion()); }
    public long pendingRotationCount() { return repository.countByEncryptionKeyVersionNot(cipher.currentVersion()); }

    private View view(UserLlmSettings value, boolean available) {
        return new View(value.getProvider(), value.getModel(), true, available, value.getApiKeyHint(),
            value.getUpdatedAt(), value.getLastSuccessfulUseAt(), value.getLastErrorCode());
    }
}
