package io.archly.analytics;

import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import io.archly.project.ProjectRepository;

@Service
public class ProductAnalyticsService {
    private final ArchlyUserRepository users;
    private final ProductEventRepository events;
    private final Clock clock = Clock.systemUTC();
    private final boolean enabled;
    private final ProjectRepository projects;

    public ProductAnalyticsService(ArchlyUserRepository users, ProductEventRepository events, ProjectRepository projects,
            @Value("${archly.analytics.enabled:true}") boolean enabled) {
        this.users = users; this.events = events; this.projects = projects; this.enabled = enabled;
    }

    public void record(String email, UUID projectId, ProductEvent.Type type) {
        if (!enabled) return;
        users.findByEmailIgnoreCase(email).ifPresent(user -> {
            if (projectId != null) projects.findById(projectId).ifPresent(project -> project.linkOwnerUser(user.getId()));
            events.save(new ProductEvent(user, projectId, type, clock.instant()));
        });
    }
}
