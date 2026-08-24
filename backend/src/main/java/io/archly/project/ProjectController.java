package io.archly.project;

import io.archly.project.ProjectDtos.CreateProjectRequest;
import io.archly.project.ProjectDtos.ProjectResponse;
import io.archly.project.ProjectDtos.UpdateProjectRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
@Tag(name = "Projects", description = "Create and maintain architecture projects")
@SecurityRequirement(name = "bearerAuth")
public class ProjectController {
    private final ProjectService service;

    public ProjectController(ProjectService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "List projects", description = "Returns projects owned by the authenticated Gmail account.")
    List<ProjectResponse> list(@AuthenticationPrincipal Jwt jwt) { return service.list(jwt.getClaimAsString("email")); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a project")
    ProjectResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateProjectRequest request) {
        return service.create(jwt.getClaimAsString("email"), request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a project")
    ProjectResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return service.get(jwt.getClaimAsString("email"), id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a project", description = "Updates project content using optimistic revision control.")
    ProjectResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody UpdateProjectRequest request) {
        return service.update(jwt.getClaimAsString("email"), id, request);
    }

    @PostMapping("/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Duplicate a project", description = "Creates an independent copy with a new ID and revision.")
    ProjectResponse duplicate(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return service.duplicate(jwt.getClaimAsString("email"), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a project")
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { service.delete(jwt.getClaimAsString("email"), id); }
}
