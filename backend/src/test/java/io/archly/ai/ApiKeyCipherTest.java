package io.archly.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class ApiKeyCipherTest {
    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @Test void bindsCiphertextToUserAndProvider() {
        ApiKeyCipher cipher = new ApiKeyCipher(KEY);
        String encrypted = cipher.encrypt("sk-private", "user-a", "OPENAI");
        assertThat(cipher.decrypt(encrypted, "user-a", "OPENAI", 1)).isEqualTo("sk-private");
        assertThatThrownBy(() -> cipher.decrypt(encrypted, "user-b", "OPENAI", 1)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> cipher.decrypt(encrypted, "user-a", "OTHER", 1)).isInstanceOf(ResponseStatusException.class);
    }

    @Test void decryptsLegacyCiphertextWithoutAdditionalData() {
        ApiKeyCipher cipher = new ApiKeyCipher(KEY);
        String encrypted = cipher.encrypt("legacy", "ignored", "OPENAI", 0);
        assertThat(cipher.decrypt(encrypted, "new-user", "OTHER", 0)).isEqualTo("legacy");
    }
}
