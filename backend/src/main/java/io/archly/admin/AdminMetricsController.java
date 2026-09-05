package io.archly.admin;

import io.archly.analytics.UserSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@Validated
public class AdminMetricsController {
    private final AdminAuthorizationService authorization;
    private final AdminMetricsService metrics;
    private final UserSessionService sessions;
    private final AdminAuditRepository audits;
    private final AdminRateLimiter rateLimiter;

    public AdminMetricsController(AdminAuthorizationService authorization, AdminMetricsService metrics,
            UserSessionService sessions, AdminAuditRepository audits, AdminRateLimiter rateLimiter) {
        this.authorization = authorization; this.metrics = metrics; this.sessions = sessions; this.audits = audits; this.rateLimiter = rateLimiter;
    }

    @GetMapping("/metrics/summary")
    ResponseEntity<AdminDtos.MetricsSummary> summary(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "30d") String period, HttpServletRequest request) {
        authorizeAndAudit(jwt, "METRICS_SUMMARY", request); return noStore(metrics.summary(period));
    }

    @GetMapping("/metrics/timeseries")
    ResponseEntity<AdminDtos.TimeSeries> timeSeries(@AuthenticationPrincipal Jwt jwt,
            @RequestParam String metric, @RequestParam(defaultValue = "30d") String period, HttpServletRequest request) {
        authorizeAndAudit(jwt, "METRICS_TIMESERIES", request); return noStore(metrics.timeSeries(metric, period));
    }

    @GetMapping("/users")
    ResponseEntity<AdminDtos.AdminUserPage> users(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size, HttpServletRequest request) {
        authorizeAndAudit(jwt, "USER_SUMMARIES", request); return noStore(metrics.userPage(page, size));
    }

    @GetMapping(value = "/metrics/export", produces = "text/csv")
    ResponseEntity<String> export(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "30d") String period, HttpServletRequest request) {
        authorizeAndAudit(jwt, "METRICS_EXPORT", request);
        var value = metrics.summary(period);
        String csv = "metric,value\n"
            + "total_users," + value.users().total() + "\n"
            + "new_users," + value.users().newUsers() + "\n"
            + "active_users," + value.users().active() + "\n"
            + "current_diagrams," + value.diagrams().current() + "\n"
            + "archived_diagrams," + value.diagrams().archived() + "\n"
            + "created_diagrams," + value.diagrams().created() + "\n"
            + "deleted_diagrams," + value.diagrams().deleted() + "\n";
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .contentType(MediaType.parseMediaType("text/csv"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=archly-metrics-" + period + ".csv")
            .body(csv);
    }

    private void authorizeAndAudit(Jwt jwt, String action, HttpServletRequest request) {
        String email = jwt.getClaimAsString("email"); authorization.requireAdmin(email);
        rateLimiter.check(email);
        sessions.findByEmail(email).ifPresent(user -> audits.save(new AdminAuditEvent(user, action,
            request.getHeader("X-Correlation-ID") == null ? UUID.randomUUID().toString() : request.getHeader("X-Correlation-ID"))));
    }
    private static <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
