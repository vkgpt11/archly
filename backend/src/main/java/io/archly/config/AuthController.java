package io.archly.config;

import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @GetMapping("/session")
    Map<String, String> session(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("email", jwt.getClaimAsString("email"));
    }
}
