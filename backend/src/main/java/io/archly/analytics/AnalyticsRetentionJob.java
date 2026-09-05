package io.archly.analytics;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

@Component
public class AnalyticsRetentionJob {
    private final UserSessionRepository sessions;
    private final ProductEventRepository events;
    private final int retentionDays;
    private final MeterRegistry meters;

    public AnalyticsRetentionJob(UserSessionRepository sessions, ProductEventRepository events,
            @Value("${archly.analytics.raw-event-retention-days:90}") int retentionDays,
            MeterRegistry meters) {
        this.sessions = sessions; this.events = events; this.retentionDays = Math.max(30, retentionDays);
        this.meters = meters;
    }

    @Scheduled(cron = "${archly.analytics.cleanup-cron:0 15 3 * * *}", zone = "UTC")
    @Transactional
    public void cleanup() {
        Timer.Sample sample = Timer.start(meters);
        Instant now = Instant.now();
        var expiredSessions = sessions.findTop5000ByExpiresAtBeforeOrderByExpiresAtAsc(now);
        var expiredEvents = events.findTop5000ByOccurredAtBeforeOrderByOccurredAtAsc(now.minus(retentionDays, ChronoUnit.DAYS));
        sessions.deleteAllInBatch(expiredSessions);
        events.deleteAllInBatch(expiredEvents);
        meters.counter("archly.analytics.cleanup.deleted", "type", "sessions").increment(expiredSessions.size());
        meters.counter("archly.analytics.cleanup.deleted", "type", "events").increment(expiredEvents.size());
        sample.stop(meters.timer("archly.analytics.cleanup.duration"));
    }
}
