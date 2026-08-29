package io.archly.analytics;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AnalyticsRetentionJob {
    private final UserSessionRepository sessions;
    private final ProductEventRepository events;
    private final int retentionDays;

    public AnalyticsRetentionJob(UserSessionRepository sessions, ProductEventRepository events,
            @Value("${archly.analytics.raw-event-retention-days:90}") int retentionDays) {
        this.sessions = sessions; this.events = events; this.retentionDays = Math.max(30, retentionDays);
    }

    @Scheduled(cron = "${archly.analytics.cleanup-cron:0 15 3 * * *}", zone = "UTC")
    @Transactional
    public void cleanup() {
        Instant now = Instant.now();
        sessions.deleteAllInBatch(sessions.findTop5000ByExpiresAtBeforeOrderByExpiresAtAsc(now));
        events.deleteAllInBatch(events.findTop5000ByOccurredAtBeforeOrderByOccurredAtAsc(now.minus(retentionDays, ChronoUnit.DAYS)));
    }
}
