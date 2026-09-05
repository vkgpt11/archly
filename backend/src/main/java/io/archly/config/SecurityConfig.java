package io.archly.config;

import java.util.Arrays;
import java.util.List;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {
    private static final String GOOGLE_ISSUER = "https://accounts.google.com";

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/error", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/shares/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth
                .bearerTokenResolver(bearerTokenResolver())
                .jwt(Customizer.withDefaults())
                .authenticationEntryPoint(new GmailAuthenticationEntryPoint()))
            .build();
    }

    @Bean
    BearerTokenResolver bearerTokenResolver() {
        return new CookieBearerTokenResolver();
    }

    @Bean
    JwtDecoder jwtDecoder(
        @Value("${archly.google.client-id}") String clientId,
        @Value("${archly.auth.dev-bypass:false}") boolean devBypass
    ) {
        if (devBypass) {
            return token -> {
                if (!"archly-local-dev".equals(token)) {
                    throw new JwtException("Invalid local development token");
                }
                Instant now = Instant.now();
                return Jwt.withTokenValue(token)
                    .header("alg", "dev")
                    .subject("local-developer")
                    .claim("email", "developer@gmail.com")
                    .claim("email_verified", true)
                    .issuedAt(now)
                    .expiresAt(now.plusSeconds(3600))
                    .build();
            };
        }
        NimbusJwtDecoder decoder = (NimbusJwtDecoder) JwtDecoders.fromIssuerLocation(GOOGLE_ISSUER);
        OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains(clientId)
            ? OAuth2TokenValidatorResult.success()
            : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid Google audience", null));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            new JwtIssuerValidator(GOOGLE_ISSUER), audience, new GmailIdentityValidator()));
        return decoder;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${archly.ui-origins}") String uiOrigins) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(uiOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isBlank())
            .toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "If-Match", "X-Archly-Session", "X-Correlation-ID"));
        configuration.setExposedHeaders(List.of("X-Correlation-ID", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
