package io.archly.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class ProjectDtos {
    private ProjectDtos() {}

    public record CreateProjectRequest(@NotBlank @Size(max = 120) String name) {}
    public record UpdateProjectRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank String canvasJson,
        String markdown,
        long revision
    ) {}
    public record ProjectResponse(
        UUID id,
        String name,
        String canvasJson,
        String markdown,
        long revision,
        Instant createdAt,
        Instant updatedAt
    ) {
        static ProjectResponse from(Project project) {
            return new ProjectResponse(project.getId(), project.getName(), project.getCanvasJson(),
                project.getMarkdown(), project.getRevision(), project.getCreatedAt(), project.getUpdatedAt());
        }
    }
}
