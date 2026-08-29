package io.archly.admin;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminAuthorizationService {
    private final Set<String> administrators;

    public AdminAuthorizationService(@Value("${archly.admin.emails:}") String configuredEmails) {
        administrators = Arrays.stream(configuredEmails.split(","))
            .map(value -> value.trim().toLowerCase(Locale.ROOT)).filter(value -> !value.isBlank())
            .collect(Collectors.toUnmodifiableSet());
    }

    public boolean isAdmin(String email) {
        return email != null && administrators.contains(email.trim().toLowerCase(Locale.ROOT));
    }

    public void requireAdmin(String email) {
        if (!isAdmin(email)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
    }
}
