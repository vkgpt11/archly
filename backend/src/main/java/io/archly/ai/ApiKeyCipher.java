package io.archly.ai;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class ApiKeyCipher {
    private static final int IV_BYTES = 12;
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();

    ApiKeyCipher(@Value("${archly.ai.encryption-key:}") String encodedKey) {
        byte[] decoded;
        try { decoded = encodedKey.isBlank() ? new byte[0] : Base64.getDecoder().decode(encodedKey); }
        catch (IllegalArgumentException exception) { decoded = new byte[0]; }
        this.key = decoded;
    }

    boolean configured() { return key.length == 32; }

    String encrypt(String plaintext) {
        requireConfigured();
        byte[] iv = new byte[IV_BYTES];
        random.nextBytes(iv);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Could not encrypt API key", exception);
        }
    }

    String decrypt(String encoded) {
        requireConfigured();
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
            if (combined.length <= IV_BYTES) throw new GeneralSecurityException("Invalid encrypted value");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, combined, 0, IV_BYTES));
            return new String(cipher.doFinal(combined, IV_BYTES, combined.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The saved AI credential could not be read.");
        }
    }

    private void requireConfigured() {
        if (!configured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Personal AI credentials are unavailable until ARCHLY_AI_ENCRYPTION_KEY is configured.");
    }
}
