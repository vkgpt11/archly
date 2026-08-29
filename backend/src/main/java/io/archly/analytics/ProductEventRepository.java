package io.archly.analytics;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductEventRepository extends JpaRepository<ProductEvent, UUID> {
    long countByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(ProductEvent.Type type, Instant start, Instant end);

    @Query("select count(distinct e.user.id) from ProductEvent e where e.occurredAt >= :start and e.occurredAt < :end")
    long countActiveUsers(@Param("start") Instant start, @Param("end") Instant end);

    @Query("select e.eventType, count(e) from ProductEvent e where e.eventType in :types and e.occurredAt >= :start and e.occurredAt < :end group by e.eventType")
    List<Object[]> countByTypes(@Param("types") Collection<ProductEvent.Type> types, @Param("start") Instant start, @Param("end") Instant end);
    boolean existsByUserIdAndEventTypeInAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
        UUID userId, Collection<ProductEvent.Type> types, Instant start, Instant end);
    List<ProductEvent> findTop5000ByOccurredAtBeforeOrderByOccurredAtAsc(Instant cutoff);
}
