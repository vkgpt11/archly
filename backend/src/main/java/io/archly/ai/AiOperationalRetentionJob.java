package io.archly.ai;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class AiOperationalRetentionJob {
    private final AiUsageRepository usage;
    private final AiCredentialAuditRepository audit;
    private final AiRateLimitBucketRepository buckets;
    private final int operationalDays;
    private final int auditDays;

    AiOperationalRetentionJob(AiUsageRepository usage, AiCredentialAuditRepository audit,
            AiRateLimitBucketRepository buckets,
            @Value("${archly.ai.operational-retention-days:90}") int operationalDays,
            @Value("${archly.ai.audit-retention-days:365}") int auditDays) {
        this.usage = usage; this.audit = audit; this.buckets = buckets;
        this.operationalDays = Math.max(30, operationalDays); this.auditDays = Math.max(90, auditDays);
    }

    @Transactional
    @Scheduled(cron = "${archly.ai.cleanup-cron:0 45 3 * * *}", zone = "UTC")
    void cleanup() {
        Instant now = Instant.now();
        buckets.deleteByWindowStartedAtBefore(now.minus(2, ChronoUnit.DAYS));
        usage.deleteByOccurredAtBefore(now.minus(operationalDays, ChronoUnit.DAYS));
        audit.deleteByOccurredAtBefore(now.minus(auditDays, ChronoUnit.DAYS));
    }
}
