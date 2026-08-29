package io.archly.config;

import java.util.Map;
import io.archly.admin.AdminAuthorizationService;
import io.archly.analytics.UserSessionService;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserSessionService sessions;
    private final AdminAuthorizationService administrators;

    public AuthController(UserSessionService sessions, AdminAuthorizationService administrators) {
        this.sessions = sessions; this.administrators = administrators;
    }

    @GetMapping("/session")
    Map<String, Object> session(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "X-Archly-Session", required = false) String sessionId) {
        String email = jwt.getClaimAsString("email");
        sessions.establish(jwt.getSubject(), email, sessionId);
        return Map.of("email", email, "isAdmin", administrators.isAdmin(email));
    }
}
