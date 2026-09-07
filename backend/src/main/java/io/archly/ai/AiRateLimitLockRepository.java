package io.archly.ai;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface AiRateLimitLockRepository extends JpaRepository<AiRateLimitLock, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from AiRateLimitLock l where l.stripeId=:stripe")
    AiRateLimitLock acquire(@Param("stripe") int stripe);
}
