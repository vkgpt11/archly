package io.archly.project;

import io.archly.project.ProjectFolderController.FolderResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProjectFolderService {
    private final ProjectFolderRepository repository;

    public ProjectFolderService(ProjectFolderRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public List<FolderResponse> list(String email) {
        return repository.findAllByOwnerEmailOrderByNameAsc(email).stream()
            .map(folder -> new FolderResponse(folder.getName())).toList();
    }

    public FolderResponse create(String email, String requestedName) {
        String name = requestedName.trim();
        if (repository.findByOwnerEmailAndNameIgnoreCase(email, name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A folder with this name already exists.");
        }
        return new FolderResponse(repository.save(new ProjectFolder(email, name)).getName());
    }
}
