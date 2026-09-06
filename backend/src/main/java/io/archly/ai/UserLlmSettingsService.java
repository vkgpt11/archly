package io.archly.ai;

import jakarta.transaction.Transactional;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
class UserLlmSettingsService {
    record View(String provider, String model, boolean hasApiKey, boolean credentialStorageAvailable,
                String apiKeyHint, Instant updatedAt, Instant lastSuccessfulUseAt, String lastErrorCode) {}
    record Configuration(String model, String apiKey) {}

    private final UserLlmSettingsRepository repository;
    private final ApiKeyCipher cipher;

    UserLlmSettingsService(UserLlmSettingsRepository repository, ApiKeyCipher cipher) {
        this.repository = repository;
        this.cipher = cipher;
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
        String encrypted = normalizedKey.isBlank() ? null : cipher.encrypt(normalizedKey);
        String hint = normalizedKey.isBlank() ? null : "••••" + normalizedKey.substring(Math.max(0, normalizedKey.length() - 4));
        if (existing.isEmpty() && encrypted == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter an API key.");
        Instant now = Instant.now();
        UserLlmSettings value = existing.orElseGet(() -> new UserLlmSettings(subject, provider, normalizedModel, encrypted, hint, now));
        if (existing.isPresent()) value.update(provider, normalizedModel, encrypted, hint, now);
        repository.save(value);
        return view(value, cipher.configured());
    }

    @Transactional
    void delete(String subject) { repository.deleteByUserSubject(subject); }

    Configuration requireConfiguration(String subject) {
        UserLlmSettings value = repository.findByUserSubject(subject).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "Configure an AI provider in Profile → Settings first."));
        return new Configuration(value.getModel(), cipher.decrypt(value.getEncryptedApiKey()));
    }

    @Transactional
    void recordSuccess(String subject) { repository.findByUserSubject(subject).ifPresent(value -> value.recordSuccess(Instant.now())); }

    @Transactional
    void recordFailure(String subject, String code) { repository.findByUserSubject(subject).ifPresent(value -> value.recordFailure(code)); }

    private View view(UserLlmSettings value, boolean available) {
        return new View(value.getProvider(), value.getModel(), true, available, value.getApiKeyHint(),
            value.getUpdatedAt(), value.getLastSuccessfulUseAt(), value.getLastErrorCode());
    }
}
