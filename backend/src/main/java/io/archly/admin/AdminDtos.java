package io.archly.admin;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class AdminDtos {
    private AdminDtos() {}
    public record UserMetrics(long total, long newUsers, long active) {}
    public record DiagramMetrics(long current, long archived, long created, long deleted, double perActiveUser) {}
    public record ConversionMetrics(double firstDiagramPercent, double firstSavePercent) {}
    public record MetricsSummary(String period, String timezone, Instant start, Instant end,
        UserMetrics users, DiagramMetrics diagrams, ConversionMetrics conversion) {}
    public record MetricBucket(LocalDate date, long value) {}
    public record TimeSeries(String metric, String timezone, List<MetricBucket> buckets) {}
    public record AdminUserSummary(String id, String maskedEmail, Instant firstLoginAt, Instant lastLoginAt, long projectCount) {}
    public record AdminUserPage(List<AdminUserSummary> items, int page, int size, long totalItems, int totalPages) {}
}
