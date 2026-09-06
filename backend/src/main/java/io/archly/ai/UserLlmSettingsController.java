package io.archly.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;

@RestController
@RequestMapping("/api/profile/llm")
class UserLlmSettingsController {
    record UpdateRequest(@NotBlank String provider, @NotBlank @Size(max = 120) String model, @Size(max = 512) String apiKey) {}
    record TestRequest(@NotBlank @Size(max = 120) String model, @Size(max = 512) String apiKey) {}
    record TestResponse(boolean ok) {}
    private final UserLlmSettingsService service;
    private final DiagramGenerationService generationService;
    UserLlmSettingsController(UserLlmSettingsService service, DiagramGenerationService generationService) {
        this.service = service; this.generationService = generationService;
    }

    @GetMapping UserLlmSettingsService.View get(@AuthenticationPrincipal Jwt jwt) { return service.get(jwt.getSubject()); }
    @PutMapping UserLlmSettingsService.View update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateRequest request) {
        return service.save(jwt.getSubject(), request.provider(), request.model(), request.apiKey());
    }
    @DeleteMapping @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@AuthenticationPrincipal Jwt jwt) { service.delete(jwt.getSubject()); }
    @PostMapping("/test") TestResponse test(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TestRequest request) {
        generationService.testConnection(jwt.getSubject(), request.model(), request.apiKey());
        return new TestResponse(true);
    }
}
