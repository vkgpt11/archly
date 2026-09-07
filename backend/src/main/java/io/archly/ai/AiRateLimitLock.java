package io.archly.ai;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ai_rate_limit_locks")
class AiRateLimitLock {
    @Id int stripeId;
    protected AiRateLimitLock() {}
}
