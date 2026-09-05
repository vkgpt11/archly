package io.archly.admin;

import io.archly.admin.AdminDtos.AdminUserPage;
import io.archly.admin.AdminDtos.AdminUserSummary;
import io.archly.admin.AdminDtos.ConversionMetrics;
import io.archly.admin.AdminDtos.DiagramMetrics;
import io.archly.admin.AdminDtos.MetricBucket;
import io.archly.admin.AdminDtos.MetricsSummary;
import io.archly.admin.AdminDtos.TimeSeries;
import io.archly.admin.AdminDtos.UserMetrics;
import io.archly.analytics.ArchlyUserRepository;
import io.archly.analytics.ProductEvent;
import io.archly.analytics.ProductEventRepository;
import io.archly.project.ProjectRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class AdminMetricsService {
    private final ArchlyUserRepository users;
    private final ProductEventRepository events;
    private final ProjectRepository projects;
    private final Clock clock = Clock.systemUTC();

    public AdminMetricsService(ArchlyUserRepository users, ProductEventRepository events, ProjectRepository projects) {
        this.users = users; this.events = events; this.projects = projects;
    }

    public MetricsSummary summary(String period) {
        Window window = window(period);
        long active = events.countActiveUsers(window.start(), window.end());
        long created = events.countByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(ProductEvent.Type.PROJECT_CREATED, window.start(), window.end())
            + events.countByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(ProductEvent.Type.PROJECT_DUPLICATED, window.start(), window.end());
        long deleted = events.countByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(ProductEvent.Type.PROJECT_DELETED, window.start(), window.end());
        long current = projects.count();
        long archived = projects.countByArchivedTrue();
        double perActive = active == 0 ? 0 : round((double) created / active);
        var newUsers = users.findAllByFirstLoginAtGreaterThanEqualAndFirstLoginAtLessThan(window.start(), window.end());
        long firstDiagram = newUsers.stream().filter(user -> events.existsByUserIdAndEventTypeInAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
            user.getId(), List.of(ProductEvent.Type.PROJECT_CREATED, ProductEvent.Type.PROJECT_DUPLICATED), user.getFirstLoginAt(), user.getFirstLoginAt().plus(Duration.ofDays(1)))).count();
        long firstSave = newUsers.stream().filter(user -> events.existsByUserIdAndEventTypeInAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
            user.getId(), List.of(ProductEvent.Type.PROJECT_CONTENT_SAVED), user.getFirstLoginAt(), user.getFirstLoginAt().plus(Duration.ofDays(1)))).count();
        double denominator = newUsers.size();
        return new MetricsSummary(period, "UTC", window.start(), window.end(),
            new UserMetrics(users.count(), users.countByFirstLoginAtGreaterThanEqualAndFirstLoginAtLessThan(window.start(), window.end()), active),
            new DiagramMetrics(current, archived, created, deleted, perActive),
            new ConversionMetrics(denominator == 0 ? 0 : round(firstDiagram * 100 / denominator), denominator == 0 ? 0 : round(firstSave * 100 / denominator)));
    }

    public TimeSeries timeSeries(String metric, String period) {
        Window window = window(period);
        if (!List.of("new-users", "active-users", "diagrams-created", "diagrams-deleted").contains(metric))
            throw badRequest("Unsupported metric.");
        Map<LocalDate, Long> counts = new LinkedHashMap<>();
        LocalDate first = window.start().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate last = window.end().minusMillis(1).atZone(ZoneOffset.UTC).toLocalDate();
        for (LocalDate date = first; !date.isAfter(last); date = date.plusDays(1)) counts.put(date, 0L);
        for (LocalDate date : new ArrayList<>(counts.keySet())) {
            Instant start = date.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant end = start.plus(Duration.ofDays(1));
            long value = switch (metric) {
                case "new-users" -> users.countByFirstLoginAtGreaterThanEqualAndFirstLoginAtLessThan(start, end);
                case "active-users" -> events.countActiveUsers(start, end);
                case "diagrams-created" -> events.countByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(ProductEvent.Type.PROJECT_CREATED, start, end)
                    + events.countByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(ProductEvent.Type.PROJECT_DUPLICATED, start, end);
                case "diagrams-deleted" -> events.countByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(ProductEvent.Type.PROJECT_DELETED, start, end);
                default -> 0;
            };
            counts.put(date, value);
        }
        return new TimeSeries(metric, "UTC", counts.entrySet().stream().map(entry -> new MetricBucket(entry.getKey(), entry.getValue())).toList());
    }

    public AdminUserPage userPage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw badRequest("Invalid page or size.");
        var result = users.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "lastLoginAt")));
        List<AdminUserSummary> items = result.getContent().stream().map(user -> new AdminUserSummary(
            user.getId().toString(), mask(user.getEmail()), user.getFirstLoginAt(), user.getLastLoginAt(),
            projects.countByOwnerEmailIgnoreCase(user.getEmail()))).toList();
        return new AdminUserPage(items, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    private Window window(String period) {
        Duration duration = switch (period) { case "24h" -> Duration.ofDays(1); case "7d" -> Duration.ofDays(7); case "30d" -> Duration.ofDays(30); case "90d" -> Duration.ofDays(90); default -> throw badRequest("Unsupported period."); };
        Instant end = clock.instant(); return new Window(end.minus(duration), end);
    }
    private static ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static double round(double value) { return Math.round(value * 100.0) / 100.0; }
    private static String mask(String email) { int at = email.indexOf('@'); return at <= 1 ? "***" + email.substring(Math.max(0, at)) : email.charAt(0) + "***" + email.substring(at); }
    private record Window(Instant start, Instant end) {}
}
