package io.archly.project;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.UUID;

public final class ShareDtos {
    private ShareDtos() {}
    public record CreateShareRequest(@NotNull @Pattern(regexp = "READ|EDIT") String permission,
                                     @Min(1) @Max(90) Integer expiresInDays) {}
    public record ShareLinkResponse(UUID id, String token, String permission, boolean revoked, Instant createdAt, Instant expiresAt) {}
    public record ShareSummaryResponse(UUID id, String permission, boolean revoked, Instant createdAt, Instant revokedAt, Instant expiresAt) {}
    public record SharedProjectResponse(ProjectDtos.ProjectResponse project, String permission) {}
}
