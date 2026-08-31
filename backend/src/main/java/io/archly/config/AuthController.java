package io.archly.config;

import java.util.Map;
import java.time.Duration;
import java.time.Instant;
import io.archly.admin.AdminAuthorizationService;
import io.archly.analytics.UserSessionService;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserSessionService sessions;
    private final AdminAuthorizationService administrators;
    private final boolean secureCookie;

    public AuthController(UserSessionService sessions, AdminAuthorizationService administrators,
            @Value("${archly.auth.cookie-secure:false}") boolean secureCookie) {
        this.sessions = sessions; this.administrators = administrators; this.secureCookie = secureCookie;
    }

    @GetMapping("/session")
    ResponseEntity<Map<String, Object>> session(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "X-Archly-Session", required = false) String sessionId) {
        String email = jwt.getClaimAsString("email");
        sessions.establish(jwt.getSubject(), email, sessionId);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, authenticationCookie(jwt).toString())
            .body(Map.of("email", email, "isAdmin", administrators.isAdmin(email)));
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout() {
        ResponseCookie expired = ResponseCookie.from(CookieBearerTokenResolver.COOKIE_NAME, "")
            .httpOnly(true).secure(secureCookie).sameSite(secureCookie ? "None" : "Lax")
            .path("/").maxAge(Duration.ZERO).build();
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, expired.toString()).build();
    }

    private ResponseCookie authenticationCookie(Jwt jwt) {
        Instant expiresAt = jwt.getExpiresAt();
        Duration lifetime = expiresAt == null ? Duration.ofHours(1) : Duration.between(Instant.now(), expiresAt);
        if (lifetime.isNegative() || lifetime.isZero()) lifetime = Duration.ofSeconds(1);
        return ResponseCookie.from(CookieBearerTokenResolver.COOKIE_NAME, jwt.getTokenValue())
            .httpOnly(true).secure(secureCookie).sameSite(secureCookie ? "None" : "Lax")
            .path("/").maxAge(lifetime).build();
    }
}
