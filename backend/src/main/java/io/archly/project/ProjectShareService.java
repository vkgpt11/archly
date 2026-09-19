package io.archly.project;

import io.archly.project.ProjectDtos.UpdateProjectRequest;
import io.archly.project.ShareDtos.CreateShareRequest;
import io.archly.project.ShareDtos.ShareLinkResponse;
import io.archly.project.ShareDtos.ShareSummaryResponse;
import io.archly.project.ShareDtos.SharedProjectResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.scheduling.annotation.Scheduled;

@Service
@Transactional
public class ProjectShareService {
    private final ProjectRepository projects;
    private final ProjectShareRepository shares;
    private final ProjectService projectService;
    private final RequestRateLimiter rateLimiter;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper;

    public ProjectShareService(ProjectRepository projects, ProjectShareRepository shares, ProjectService projectService,
                               RequestRateLimiter rateLimiter, com.fasterxml.jackson.databind.ObjectMapper mapper) {
        this.projects = projects; this.shares = shares; this.projectService = projectService; this.rateLimiter = rateLimiter;
        this.mapper = mapper;
    }

    public ShareLinkResponse create(String email, UUID projectId, CreateShareRequest request) {
        Project project = owned(email, projectId);
        rateLimiter.check("share-create:" + email, 20, Duration.ofHours(1));
        if (shares.countByProjectIdAndRevokedFalseAndExpiresAtAfter(projectId, Instant.now()) >= 10) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A project can have at most 10 active share links.");
        }
        String token = UUID.randomUUID() + "." + UUID.randomUUID();
        int days = request.expiresInDays() == null ? 30 : request.expiresInDays();
        ProjectShare share = shares.save(new ProjectShare(project, hash(token), request.permission(), Instant.now().plus(Duration.ofDays(days))));
        if ("EMBED".equals(request.permission())) {
            try {
                var canvas = mapper.readTree(project.getCanvasJson());
                String view = canvas.path("activeView").asText("");
                String variant = canvas.path("activeVariant").asText("");
                if (view.length() > 128 || variant.length() > 128) throw new IllegalArgumentException();
                share.bindEmbed(view, variant);
            } catch (Exception invalid) { throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Save a valid diagram before creating an embed."); }
        }
        return new ShareLinkResponse(share.getId(), token, share.getPermission(), false, share.getCreatedAt(), share.getExpiresAt());
    }

    @Transactional(readOnly = true)
    public List<ShareSummaryResponse> list(String email, UUID projectId) {
        owned(email, projectId);
        return shares.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
            .map(s -> new ShareSummaryResponse(s.getId(), s.getPermission(), s.isRevoked(), s.getCreatedAt(), s.getRevokedAt(), s.getExpiresAt())).toList();
    }

    public void revoke(String email, UUID projectId, UUID shareId) {
        owned(email, projectId);
        ProjectShare share = shares.findByIdAndProjectId(shareId, projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share link not found"));
        share.revoke();
    }

    @Transactional(readOnly = true)
    public SharedProjectResponse getShared(String token) {
        ProjectShare share = active(token);
        if ("EMBED".equals(share.getPermission())) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Share unavailable");
        return new SharedProjectResponse(ProjectDtos.ProjectResponse.from(share.getProject()), share.getPermission());
    }

    @Transactional(readOnly = true)
    public Project embeddedProject(String token) {
        return embeddedTarget(token).project();
    }

    public record EmbedTarget(Project project, String view, String variant) {}
    @Transactional(readOnly = true)
    public EmbedTarget embeddedTarget(String token) {
        ProjectShare share = active(token);
        if (!"EMBED".equals(share.getPermission())) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Embed unavailable");
        Project project = share.getProject();
        project.getCanvasJson();
        return new EmbedTarget(project, share.getEmbedView(), share.getEmbedVariant());
    }

    public SharedProjectResponse updateShared(String token, UpdateProjectRequest request) {
        ProjectShare share = active(token);
        if (!"EDIT".equals(share.getPermission())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This share link is read-only");
        Project project = share.getProject();
        ProjectDtos.ProjectResponse updated = projectService.update(project.getOwnerEmail(), project.getId(), request);
        return new SharedProjectResponse(updated, share.getPermission());
    }

    private ProjectShare active(String token) {
        ProjectShare share = shares.findByTokenHashAndRevokedFalse(hash(token))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share link is invalid or revoked"));
        if (share.isExpired()) throw new ResponseStatusException(HttpStatus.GONE, "Share link has expired");
        return share;
    }

    @Scheduled(cron = "0 30 3 * * *")
    public void cleanupObsoleteLinks() { shares.deleteObsolete(Instant.now().minus(Duration.ofDays(30))); }

    private Project owned(String email, UUID id) {
        return projects.findByIdAndOwnerEmail(id, email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
