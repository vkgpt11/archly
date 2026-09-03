package io.archly.ai;

import io.archly.ai.DiagramGenerationDtos.GenerateDiagramRequest;
import io.archly.ai.DiagramGenerationDtos.GenerateDiagramResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/api/ai/diagrams")
@Tag(name = "AI diagrams", description = "Generate architecture diagrams from natural-language prompts")
@SecurityRequirement(name = "bearerAuth")
public class DiagramGenerationController {
    private final DiagramGenerationService service;
    private final AiGenerationRateLimiter rateLimiter;

    public DiagramGenerationController(DiagramGenerationService service, AiGenerationRateLimiter rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate an architecture diagram")
    GenerateDiagramResponse generate(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody GenerateDiagramRequest request) {
        rateLimiter.check(jwt.getClaimAsString("email"));
        return service.generate(request.prompt());
    }
}
