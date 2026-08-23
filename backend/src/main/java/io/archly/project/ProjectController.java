package io.archly.project;

import io.archly.project.ProjectDtos.CreateProjectRequest;
import io.archly.project.ProjectDtos.ProjectResponse;
import io.archly.project.ProjectDtos.UpdateProjectRequest;
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
public class ProjectController {
    private final ProjectService service;

    public ProjectController(ProjectService service) { this.service = service; }

    @GetMapping
    List<ProjectResponse> list(@AuthenticationPrincipal Jwt jwt) { return service.list(jwt.getClaimAsString("email")); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ProjectResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateProjectRequest request) {
        return service.create(jwt.getClaimAsString("email"), request);
    }

    @GetMapping("/{id}")
    ProjectResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return service.get(jwt.getClaimAsString("email"), id);
    }

    @PutMapping("/{id}")
    ProjectResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody UpdateProjectRequest request) {
        return service.update(jwt.getClaimAsString("email"), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { service.delete(jwt.getClaimAsString("email"), id); }
}
