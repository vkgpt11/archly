package io.archly.config;

import java.util.Locale;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public final class GmailIdentityValidator implements OAuth2TokenValidator<Jwt> {
    public static final String ERROR_CODE = "gmail_account_required";
    public static final String MESSAGE = "Archly supports only verified personal @gmail.com accounts.";

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        Boolean verified = jwt.getClaim("email_verified");
        return Boolean.TRUE.equals(verified) && isPersonalGmail(email)
            ? OAuth2TokenValidatorResult.success()
            : OAuth2TokenValidatorResult.failure(new OAuth2Error(ERROR_CODE, MESSAGE, null));
    }

    static boolean isPersonalGmail(String email) {
        if (email == null || !email.equals(email.trim())) return false;
        String normalized = email.toLowerCase(Locale.ROOT);
        int separator = normalized.indexOf('@');
        return separator > 0
            && separator == normalized.lastIndexOf('@')
            && normalized.substring(separator).equals("@gmail.com");
    }
}
