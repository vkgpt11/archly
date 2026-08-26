package io.archly.project;

import io.archly.project.ProjectDtos.UpdateProjectRequest;
import io.archly.project.ShareDtos.CreateShareRequest;
import io.archly.project.ShareDtos.ShareLinkResponse;
import io.archly.project.ShareDtos.ShareSummaryResponse;
import io.archly.project.ShareDtos.SharedProjectResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;

@RestController
public class ProjectShareController {
    private final ProjectShareService service;
    private final RequestRateLimiter rateLimiter;
    public ProjectShareController(ProjectShareService service, RequestRateLimiter rateLimiter) { this.service = service; this.rateLimiter = rateLimiter; }

    @PostMapping("/api/projects/{projectId}/shares")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a project share link")
    ShareLinkResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID projectId, @Valid @RequestBody CreateShareRequest request) {
        return service.create(jwt.getClaimAsString("email"), projectId, request);
    }

    @GetMapping("/api/projects/{projectId}/shares")
    List<ShareSummaryResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID projectId) {
        return service.list(jwt.getClaimAsString("email"), projectId);
    }

    @DeleteMapping("/api/projects/{projectId}/shares/{shareId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID projectId, @PathVariable UUID shareId) {
        service.revoke(jwt.getClaimAsString("email"), projectId, shareId);
    }

    @GetMapping("/api/shares/{token}")
    SharedProjectResponse getShared(@PathVariable String token, HttpServletRequest request) {
        rateLimiter.check("public-share:" + request.getRemoteAddr(), 120, Duration.ofMinutes(1));
        return service.getShared(token);
    }

    @PutMapping("/api/shares/{token}")
    SharedProjectResponse updateShared(@PathVariable String token, @Valid @RequestBody UpdateProjectRequest request, HttpServletRequest servletRequest) {
        rateLimiter.check("public-share:" + servletRequest.getRemoteAddr(), 120, Duration.ofMinutes(1));
        return service.updateShared(token, request);
    }
}
