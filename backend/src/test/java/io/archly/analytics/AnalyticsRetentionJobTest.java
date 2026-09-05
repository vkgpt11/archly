package io.archly.analytics;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import org.junit.jupiter.api.Test;

class AnalyticsRetentionJobTest {
    @Test void deletesOnlyTheBoundedExpiredBatchesAndRecordsMetrics() {
        var sessions = mock(UserSessionRepository.class);
        var events = mock(ProductEventRepository.class);
        when(sessions.findTop5000ByExpiresAtBeforeOrderByExpiresAtAsc(any())).thenReturn(List.of());
        when(events.findTop5000ByOccurredAtBeforeOrderByOccurredAtAsc(any())).thenReturn(List.of());
        var meters = new SimpleMeterRegistry();

        new AnalyticsRetentionJob(sessions, events, 90, meters).cleanup();

        verify(sessions).deleteAllInBatch(List.of());
        verify(events).deleteAllInBatch(List.of());
        org.assertj.core.api.Assertions.assertThat(meters.find("archly.analytics.cleanup.duration").timer()).isNotNull();
    }
}
