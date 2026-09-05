package io.archly.ai;

import jakarta.transaction.Transactional;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
class UserLlmSettingsService {
    record View(String provider, String model, boolean hasApiKey, boolean credentialStorageAvailable) {}
    record Configuration(String model, String apiKey) {}

    private final UserLlmSettingsRepository repository;
    private final ApiKeyCipher cipher;

    UserLlmSettingsService(UserLlmSettingsRepository repository, ApiKeyCipher cipher) {
        this.repository = repository;
        this.cipher = cipher;
    }

    View get(String subject) {
        return repository.findByUserSubject(subject)
            .map(value -> new View(value.getProvider(), value.getModel(), true, cipher.configured()))
            .orElseGet(() -> new View("OPENAI", "gpt-4.1-mini", false, cipher.configured()));
    }

    @Transactional
    View save(String subject, String provider, String model, String apiKey) {
        if (!"OPENAI".equals(provider)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported AI provider.");
        String normalizedModel = model.trim();
        if (!normalizedModel.matches("[A-Za-z0-9._:-]{1,120}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid model name.");
        var existing = repository.findByUserSubject(subject);
        String encrypted = apiKey == null || apiKey.isBlank() ? null : cipher.encrypt(apiKey.trim());
        if (existing.isEmpty() && encrypted == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter an API key.");
        Instant now = Instant.now();
        UserLlmSettings value = existing.orElseGet(() -> new UserLlmSettings(subject, provider, normalizedModel, encrypted, now));
        if (existing.isPresent()) value.update(provider, normalizedModel, encrypted, now);
        repository.save(value);
        return new View(provider, normalizedModel, true, cipher.configured());
    }

    @Transactional
    void delete(String subject) { repository.deleteByUserSubject(subject); }

    Configuration requireConfiguration(String subject) {
        UserLlmSettings value = repository.findByUserSubject(subject).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "Configure an AI provider in Profile → Settings first."));
        return new Configuration(value.getModel(), cipher.decrypt(value.getEncryptedApiKey()));
    }
}
