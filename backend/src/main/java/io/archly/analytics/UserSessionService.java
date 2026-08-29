package io.archly.analytics;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import io.archly.project.ProjectRepository;

@Service
public class UserSessionService {
    private final ArchlyUserRepository users;
    private final UserSessionRepository sessions;
    private final ProductEventRepository events;
    private final Clock clock;
    private final ProjectRepository projects;

    @Autowired
    public UserSessionService(ArchlyUserRepository users, UserSessionRepository sessions,
            ProductEventRepository events, ProjectRepository projects) {
        this(users, sessions, events, projects, Clock.systemUTC());
    }

    UserSessionService(ArchlyUserRepository users, UserSessionRepository sessions,
            ProductEventRepository events, ProjectRepository projects, Clock clock) {
        this.users = users; this.sessions = sessions; this.events = events; this.projects = projects; this.clock = clock;
    }

    @Transactional
    public ArchlyUser establish(String subject, String email, String sessionId) {
        Instant now = clock.instant();
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        ArchlyUser user = users.findByGoogleSubject(subject)
            .or(() -> users.findByEmailIgnoreCase(normalizedEmail))
            .orElseGet(() -> users.save(new ArchlyUser(subject, normalizedEmail, now)));
        String hash = sha256(sessionId == null || sessionId.isBlank() ? "legacy:" + subject : sessionId);
        if (sessions.findByUserIdAndSessionHash(user.getId(), hash).isEmpty()) {
            sessions.save(new UserSession(user, hash, now));
            user.establishNewSession(normalizedEmail, now);
            users.save(user);
            events.save(new ProductEvent(user, null, ProductEvent.Type.SESSION_ESTABLISHED, now));
        }
        projects.linkOwnerByEmail(normalizedEmail, user.getId());
        return user;
    }

    @Transactional(readOnly = true)
    public java.util.Optional<ArchlyUser> findByEmail(String email) { return users.findByEmailIgnoreCase(email); }

    private static String sha256(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
