package io.archly.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class GmailIdentityValidatorTest {
    private final GmailIdentityValidator validator = new GmailIdentityValidator();

    @Test
    void acceptsVerifiedPersonalGmailIdentity() {
        assertThat(validator.validate(jwt(claims -> {
            claims.claim("email", "User.Name@gmail.com");
            claims.claim("email_verified", true);
        })).hasErrors()).isFalse();
    }

    @Test
    void rejectsGoogleWorkspaceIdentity() {
        assertRejected(jwt(claims -> {
            claims.claim("email", "user@company.com");
            claims.claim("email_verified", true);
        }));
    }

    @Test
    void rejectsDomainSuffixSpoof() {
        assertRejected(jwt(claims -> {
            claims.claim("email", "user@gmail.com.example.org");
            claims.claim("email_verified", true);
        }));
    }

    @Test
    void rejectsUnverifiedGmailIdentity() {
        assertRejected(jwt(claims -> {
            claims.claim("email", "user@gmail.com");
            claims.claim("email_verified", false);
        }));
    }

    @Test
    void rejectsMissingEmailClaim() {
        assertRejected(jwt(claims -> claims.claim("email_verified", true)));
    }

    @Test
    void rejectsMissingEmailVerifiedClaim() {
        assertRejected(jwt(claims -> claims.claim("email", "user@gmail.com")));
    }

    private void assertRejected(Jwt jwt) {
        var result = validator.validate(jwt);
        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors()).singleElement()
            .extracting(error -> error.getErrorCode())
            .isEqualTo(GmailIdentityValidator.ERROR_CODE);
    }

    private Jwt jwt(Consumer<Jwt.Builder> claims) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
            .header("alg", "none")
            .subject("subject")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(60));
        claims.accept(builder);
        return builder.build();
    }
}
