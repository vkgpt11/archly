package io.archly.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import java.util.List;

public final class ProjectDtos {
    private ProjectDtos() {}

    public record CreateProjectRequest(@NotBlank @Size(max = 120) String name) {}
    public record UpdateProjectRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 2_000_000) String canvasJson,
        @Size(max = 6_000_000) String markdown,
        long revision
    ) {}
    public record OrganizeProjectRequest(@Size(max = 80) String folder, boolean archived, @jakarta.validation.constraints.NotNull Long revision) {}
    public record ProjectSummaryResponse(UUID id, String name, String folder, boolean archived,
                                         long revision, Instant createdAt, Instant updatedAt) {
        static ProjectSummaryResponse from(Project project) {
            return new ProjectSummaryResponse(project.getId(), project.getName(), project.getFolder(), project.isArchived(),
                project.getRevision(), project.getCreatedAt(), project.getUpdatedAt());
        }
    }
    public record ProjectPageResponse(List<ProjectSummaryResponse> items, int page, int size,
                                      long totalItems, int totalPages) {}
    public record ProjectResponse(
        UUID id,
        String name,
        String canvasJson,
        String markdown,
        String folder,
        boolean archived,
        long revision,
        Instant createdAt,
        Instant updatedAt
    ) {
        static ProjectResponse from(Project project) {
            return new ProjectResponse(project.getId(), project.getName(), project.getCanvasJson(),
                project.getMarkdown(), project.getFolder(), project.isArchived(), project.getRevision(), project.getCreatedAt(), project.getUpdatedAt());
        }
    }
}
