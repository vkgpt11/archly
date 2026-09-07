package io.archly.ai;
import jakarta.persistence.LockModeType; import java.time.Instant; import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.query.Param;
interface AiRateLimitBucketRepository extends JpaRepository<AiRateLimitBucket,String>{@Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select b from AiRateLimitBucket b where b.bucketKey=:key") java.util.Optional<AiRateLimitBucket> lock(@Param("key") String key);long deleteByWindowStartedAtBefore(Instant cutoff);}
