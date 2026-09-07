package io.archly.ai;

import com.google.cloud.secretmanager.v1.AccessSecretVersionRequest;
import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

@Component
class ApiKeyCipher {
    private static final int IV_BYTES = 12;
    private final Map<Integer, byte[]> keys = new HashMap<>();
    private final int currentVersion;
    private final boolean production;
    private final boolean secretManagerConfigured;
    private final SecureRandom random = new SecureRandom();

    @Autowired ApiKeyCipher(@Value("${archly.ai.encryption-keys:}") String keyRing,
                 @Value("${archly.ai.encryption-key:}") String legacyKey,
                 @Value("${archly.ai.encryption-key-secret:}") String secretResource,
                 @Value("${archly.ai.encryption-key-version:1}") int currentVersion,
                 Environment environment) {
        this.currentVersion = currentVersion;
        this.production = environment.matchesProfiles("prod", "production");
        this.secretManagerConfigured = !secretResource.isBlank();
        String material = !secretResource.isBlank() ? readSecret(secretResource) : keyRing;
        if (material.isBlank() && !legacyKey.isBlank()) material = "1:" + legacyKey;
        for (String entry : material.split(",")) {
            String[] parts = entry.trim().split(":", 2);
            if (parts.length != 2) continue;
            try { byte[] key = Base64.getDecoder().decode(parts[1]); if (key.length == 32) keys.put(Integer.parseInt(parts[0]), key); }
            catch (IllegalArgumentException ignored) { }
        }
    }
    ApiKeyCipher(String legacyKey) {
        this.currentVersion = 1; this.production = false; this.secretManagerConfigured = false;
        try { byte[] key = Base64.getDecoder().decode(legacyKey); if (key.length == 32) keys.put(1, key); } catch (IllegalArgumentException ignored) { }
    }

    @PostConstruct void validateProduction() {
        if (production && (!secretManagerConfigured || !configured())) throw new IllegalStateException("Production requires a valid current 256-bit AI encryption key ring from Google Secret Manager.");
    }
    boolean configured() { return keys.containsKey(currentVersion); }
    int currentVersion() { return currentVersion; }

    String encrypt(String plaintext, String userSubject, String provider) { return encrypt(plaintext, userSubject, provider, currentVersion); }
    String encrypt(String plaintext, String userSubject, String provider, int version) {
        byte[] key = keys.get(version == 0 ? 1 : version); requireConfigured(key);
        byte[] iv = new byte[IV_BYTES]; random.nextBytes(iv);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            if (version > 0) cipher.updateAAD(aad(userSubject, provider, version));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + encrypted.length]; System.arraycopy(iv, 0, combined, 0, iv.length); System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException exception) { throw new IllegalStateException("Could not encrypt API key", exception); }
    }

    String decrypt(String encoded, String userSubject, String provider, int version) {
        byte[] key = keys.get(version == 0 ? 1 : version); requireConfigured(key);
        try {
            byte[] combined = Base64.getDecoder().decode(encoded); if (combined.length <= IV_BYTES) throw new GeneralSecurityException("Invalid encrypted value");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, combined, 0, IV_BYTES));
            if (version > 0) cipher.updateAAD(aad(userSubject, provider, version));
            return new String(cipher.doFinal(combined, IV_BYTES, combined.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The saved AI credential could not be read."); }
    }
    private byte[] aad(String user, String provider, int version) { return ("archly-ai-key|" + version + "|" + user + "|" + provider).getBytes(StandardCharsets.UTF_8); }
    private void requireConfigured(byte[] key) { if (key == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Personal AI credentials are unavailable because the required encryption key version is not configured."); }
    private String readSecret(String resource) {
        try (SecretManagerServiceClient client = SecretManagerServiceClient.create()) {
            return client.accessSecretVersion(AccessSecretVersionRequest.newBuilder().setName(resource).build()).getPayload().getData().toStringUtf8().trim();
        } catch (Exception exception) { if (production) throw new IllegalStateException("Could not load the AI encryption key ring from Google Secret Manager", exception); return ""; }
    }
}
