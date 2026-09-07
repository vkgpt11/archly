package io.archly.config;

import io.archly.ai.AccountDeletedEvent;
import io.archly.analytics.ArchlyUserRepository;
import io.archly.project.ProjectFolderRepository;
import io.archly.project.ProjectRepository;
import java.util.Locale;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AccountDeletionService {
    private final ProjectRepository projects; private final ProjectFolderRepository folders; private final ArchlyUserRepository users; private final ApplicationEventPublisher events;
    AccountDeletionService(ProjectRepository projects, ProjectFolderRepository folders, ArchlyUserRepository users, ApplicationEventPublisher events) { this.projects=projects; this.folders=folders; this.users=users; this.events=events; }
    @Transactional void delete(String subject, String email) {
        events.publishEvent(new AccountDeletedEvent(subject));
        projects.deleteAll(projects.findAllByOwnerEmailIgnoreCase(email));
        folders.deleteAllByOwnerEmail(email.toLowerCase(Locale.ROOT));
        users.findByGoogleSubject(subject).ifPresent(users::delete);
    }
}
