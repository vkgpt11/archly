package io.archly.project;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/project-folders")
@Tag(name = "Project folders", description = "Organize architecture projects into persistent folders")
@SecurityRequirement(name = "bearerAuth")
public class ProjectFolderController {
    private final ProjectFolderService service;

    public ProjectFolderController(ProjectFolderService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "List project folders")
    List<FolderResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(jwt.getClaimAsString("email"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a project folder")
    FolderResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateFolderRequest request) {
        return service.create(jwt.getClaimAsString("email"), request.name());
    }

    public record CreateFolderRequest(@NotBlank @Size(max = 80) String name) {}
    public record FolderResponse(String name) {}
}
