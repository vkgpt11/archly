package io.archly.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = {
    "archly.auth.dev-bypass=true",
    "archly.ai.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
})
@Testcontainers(disabledWithoutDocker = true)
class PostgresAiOperationsTest {
    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired DataSource dataSource;
    @Autowired AiGenerationRateLimiter limiter;

    @Test void appliesEveryMigrationAndEnforcesCredentialConstraints() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        assertThat(jdbc.queryForObject("select max(version) from flyway_schema_history where success", String.class)).isEqualTo("10");
        assertThat(jdbc.queryForObject("select count(*) from ai_rate_limit_locks", Integer.class)).isEqualTo(64);
        assertThat(jdbc.queryForObject("select count(*) from pg_constraint where conname='ck_llm_provider'", Integer.class)).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("insert into user_llm_settings (id,user_subject,provider,model,encrypted_api_key,api_key_hint,encryption_key_version,created_at,updated_at) values (gen_random_uuid(),'owner','OTHER','model','12345678901234567890123456789012','hint',1,now(),now())"))
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test void serializesConcurrentIdempotencyReservationsAcrossDatabaseTransactions() throws Exception {
        int callers = 12;
        AtomicInteger accepted = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        CountDownLatch ready = new CountDownLatch(callers);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(callers);
        try {
            List<Future<?>> work = new ArrayList<>();
            for (int index = 0; index < callers; index++) work.add(pool.submit(() -> {
                ready.countDown(); start.await();
                try { limiter.reserve("postgres-user", "same-request-id"); accepted.incrementAndGet(); }
                catch (ResponseStatusException exception) { if (exception.getStatusCode().value() == 409) rejected.incrementAndGet(); else throw exception; }
                return null;
            }));
            ready.await(); start.countDown();
            for (Future<?> future : work) future.get();
        } finally { pool.shutdownNow(); }
        assertThat(accepted).hasValue(1);
        assertThat(rejected).hasValue(callers - 1);
    }
}
