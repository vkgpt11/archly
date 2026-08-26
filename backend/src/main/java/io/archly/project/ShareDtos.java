package io.archly.project;

import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.UUID;

public final class ShareDtos {
    private ShareDtos() {}
    public record CreateShareRequest(@Pattern(regexp = "READ|EDIT") String permission) {}
    public record ShareLinkResponse(UUID id, String token, String permission, boolean revoked, Instant createdAt) {}
    public record ShareSummaryResponse(UUID id, String permission, boolean revoked, Instant createdAt, Instant revokedAt) {}
    public record SharedProjectResponse(ProjectDtos.ProjectResponse project, String permission) {}
}
