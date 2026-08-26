package io.archly.project;

import io.archly.project.ProjectDtos.CreateProjectRequest;
import io.archly.project.ProjectDtos.ProjectResponse;
import io.archly.project.ProjectDtos.UpdateProjectRequest;
import io.archly.project.ProjectDtos.OrganizeProjectRequest;
import jakarta.persistence.OptimisticLockException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProjectService {
    private final ProjectRepository repository;
    private final RichTextSanitizer richTextSanitizer;

    public ProjectService(ProjectRepository repository, RichTextSanitizer richTextSanitizer) {
        this.repository = repository;
        this.richTextSanitizer = richTextSanitizer;
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(String email) {
        return repository.findAllByOwnerEmailOrderByUpdatedAtDesc(email).stream().map(this::response).toList();
    }

    public ProjectResponse create(String email, CreateProjectRequest request) {
        return response(repository.save(new Project(email, request.name().trim())));
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
        project.update(request.name().trim(), request.canvasJson(), richTextSanitizer.sanitize(request.markdown()));
        try {
            return response(repository.saveAndFlush(project));
        } catch (OptimisticLockException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project was updated elsewhere. Reload before saving.");
        }
    }

    public ProjectResponse duplicate(String email, UUID id) {
        Project source = findOwned(email, id);
        Project copy = new Project(email, source.getName() + " — Copy", source.getCanvasJson(),
            richTextSanitizer.sanitize(source.getMarkdown()));
        copy.organize(source.getFolder(), false);
        return response(repository.save(copy));
    }

    public ProjectResponse organize(String email, UUID id, OrganizeProjectRequest request) {
        Project project = findOwned(email, id);
        project.organize(request.folder(), request.archived());
        return response(repository.save(project));
    }

    public void delete(String email, UUID id) {
        repository.delete(findOwned(email, id));
    }

    private Project findOwned(String email, UUID id) {
        return repository.findByIdAndOwnerEmail(id, email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private ProjectResponse response(Project project) {
        return new ProjectResponse(project.getId(), project.getName(), project.getCanvasJson(),
            richTextSanitizer.sanitize(project.getMarkdown()), project.getFolder(), project.isArchived(), project.getRevision(), project.getCreatedAt(), project.getUpdatedAt());
    }
}
