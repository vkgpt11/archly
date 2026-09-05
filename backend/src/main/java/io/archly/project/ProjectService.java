package io.archly.project;

import io.archly.project.ProjectDtos.CreateProjectRequest;
import io.archly.project.ProjectDtos.ProjectResponse;
import io.archly.project.ProjectDtos.UpdateProjectRequest;
import io.archly.project.ProjectDtos.OrganizeProjectRequest;
import io.archly.analytics.ProductAnalyticsService;
import io.archly.analytics.ProductEvent;
import io.archly.analytics.UserSessionService;
import jakarta.persistence.OptimisticLockException;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProjectService {
    private final ProjectRepository repository;
    private final RichTextSanitizer richTextSanitizer;
    private final CanvasJsonValidator canvasJsonValidator;
    private final ProjectContentValidator projectContentValidator;
    private final ProjectShareRepository shareRepository;
    private final ProductAnalyticsService analytics;
    private final UserSessionService sessions;

    public ProjectService(ProjectRepository repository, RichTextSanitizer richTextSanitizer,
                          CanvasJsonValidator canvasJsonValidator, ProjectContentValidator projectContentValidator,
                          ProjectShareRepository shareRepository, ProductAnalyticsService analytics,
                          UserSessionService sessions) {
        this.repository = repository;
        this.richTextSanitizer = richTextSanitizer;
        this.canvasJsonValidator = canvasJsonValidator;
        this.projectContentValidator = projectContentValidator;
        this.shareRepository = shareRepository;
        this.analytics = analytics;
        this.sessions = sessions;
    }

    @Transactional(readOnly = true)
    public ProjectDtos.ProjectPageResponse list(String email, int page, int size) {
        var result = repository.findAllByOwnerEmail(email,
            PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "updatedAt")));
        return new ProjectDtos.ProjectPageResponse(result.getContent().stream()
            .map(ProjectDtos.ProjectSummaryResponse::from).toList(), result.getNumber(), result.getSize(),
            result.getTotalElements(), result.getTotalPages());
    }

    public ProjectResponse create(String email, CreateProjectRequest request) {
        Project pending = new Project(email, request.name().trim());
        linkOwner(pending, email);
        Project project = repository.save(pending);
        analytics.record(email, project.getId(), ProductEvent.Type.PROJECT_CREATED);
        return response(project);
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(String email, UUID id) {
        return response(findOwned(email, id));
    }

    public ProjectResponse update(String email, UUID id, UpdateProjectRequest request) {
        Project project = findOwned(email, id);
        if (project.getRevision() != request.revision()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project was updated elsewhere. Reload before saving.");
        }
        canvasJsonValidator.validate(request.canvasJson());
        projectContentValidator.validateMarkdown(request.markdown());
        project.update(request.name().trim(), request.canvasJson(), richTextSanitizer.sanitize(request.markdown()));
        try {
            Project saved = repository.saveAndFlush(project);
            analytics.record(email, id, ProductEvent.Type.PROJECT_CONTENT_SAVED);
            return response(saved);
        } catch (OptimisticLockException | OptimisticLockingFailureException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project was updated elsewhere. Reload before saving.");
        }
    }

    public ProjectResponse duplicate(String email, UUID id) {
        Project source = findOwned(email, id);
        Project copy = new Project(email, source.getName() + " — Copy", source.getCanvasJson(),
            richTextSanitizer.sanitize(source.getMarkdown()));
        linkOwner(copy, email);
        copy.organize(source.getFolder(), false);
        Project saved = repository.save(copy);
        analytics.record(email, saved.getId(), ProductEvent.Type.PROJECT_DUPLICATED);
        return response(saved);
    }

    public ProjectResponse organize(String email, UUID id, OrganizeProjectRequest request) {
        Project project = findOwned(email, id);
        boolean wasArchived = project.isArchived();
        if (project.getRevision() != request.revision()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project was updated elsewhere. Reload before organizing.");
        }
        project.organize(request.folder(), request.archived());
        try {
            Project saved = repository.saveAndFlush(project);
            if (wasArchived != saved.isArchived()) analytics.record(email, id,
                saved.isArchived() ? ProductEvent.Type.PROJECT_ARCHIVED : ProductEvent.Type.PROJECT_RESTORED);
            return response(saved);
        } catch (OptimisticLockException | OptimisticLockingFailureException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project was updated elsewhere. Reload before organizing.");
        }
    }

    public void delete(String email, UUID id) {
        Project project = findOwned(email, id);
        analytics.record(email, id, ProductEvent.Type.PROJECT_DELETED);
        shareRepository.deleteAllByProjectId(project.getId());
        shareRepository.flush();
        repository.delete(project);
        repository.flush();
    }

    private Project findOwned(String email, UUID id) {
        return repository.findByIdAndOwnerEmail(id, email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private void linkOwner(Project project, String email) {
        sessions.findByEmail(email).ifPresent(user -> project.linkOwnerUser(user.getId()));
    }

    private ProjectResponse response(Project project) {
        return new ProjectResponse(project.getId(), project.getName(), project.getCanvasJson(),
            richTextSanitizer.sanitize(project.getMarkdown()), project.getFolder(), project.isArchived(), project.getRevision(), project.getCreatedAt(), project.getUpdatedAt());
    }
}
