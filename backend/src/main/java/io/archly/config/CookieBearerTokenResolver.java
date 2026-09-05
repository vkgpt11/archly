package io.archly.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

final class CookieBearerTokenResolver implements BearerTokenResolver {
    static final String COOKIE_NAME = "ARCHLY_AUTH";
    private final DefaultBearerTokenResolver authorizationHeader = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        String headerToken = authorizationHeader.resolve(request);
        if (headerToken != null) return headerToken;
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE_NAME.equals(cookie.getName()) && !cookie.getValue().isBlank()) return cookie.getValue();
        }
        return null;
    }
}
