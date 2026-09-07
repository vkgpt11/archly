package io.archly.ai;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="ai_rate_limit_buckets") class AiRateLimitBucket { @Id String bucketKey; @Column(nullable=false) int requestCount; @Column(nullable=false) Instant windowStartedAt; protected AiRateLimitBucket(){} AiRateLimitBucket(String key){bucketKey=key;windowStartedAt=Instant.now();} int increment(){return ++requestCount;} }
