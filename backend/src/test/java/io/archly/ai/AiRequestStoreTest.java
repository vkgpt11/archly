package io.archly.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.ArrayList;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties="archly.ai.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
class AiRequestStoreTest {
    @Autowired AiRequestStore store;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired AiUsageService usage;
    @Test void serializesConcurrentClaimsAndReplaysEncryptedResultsWithIdentityIsolation() throws Exception {
        String user=UUID.randomUUID().toString();
        var pool=Executors.newFixedThreadPool(6); var start=new CountDownLatch(1); var winners=new AtomicInteger();
        try {
            var work=new ArrayList<Future<?>>();
            for(int i=0;i<6;i++) work.add(pool.submit(() -> { start.await(); if(store.begin(user,"same-key","fingerprint",Duration.ofSeconds(1)).owned()) winners.incrementAndGet(); return null; }));
            start.countDown(); for(var future:work) future.get();
            assertThat(winners).hasValue(1);
            String id=AiRequestStore.hash(user+"\0same-key");
            var result=new DiagramGenerationDtos.GenerateDiagramResponse(mapper.readTree("{\"nodes\":[],\"edges\":[]}"),"private architecture summary");
            store.complete(user,id,result);
            assertThat(store.begin(user,"same-key","fingerprint",Duration.ofSeconds(1)).result()).isEqualTo(result);
            assertThat(jdbc.queryForObject("select encrypted_result from ai_generation_requests where request_id=?",String.class,id)).doesNotContain("private architecture");
            assertThat(store.read("other-user",id,"fingerprint")).isNull();
            assertThatThrownBy(() -> store.begin(user,"same-key","different",Duration.ofSeconds(1))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("different input");
            assertThat(store.begin(user+"other","same-key","fingerprint",Duration.ofSeconds(1)).owned()).isTrue();
            store.accountDeleted(new AccountDeletedEvent(user));
            assertThat(store.read(user,id,"fingerprint")).isNull();
        } finally {pool.shutdownNow();}
    }
    @Test void reservesBudgetsAcrossConcurrentTransactionsAndReconcilesUsage() throws Exception {
        String user=UUID.randomUUID().toString();
        var pool=Executors.newFixedThreadPool(4);var start=new CountDownLatch(1);var accepted=new java.util.concurrent.ConcurrentLinkedQueue<String>();
        try {
            var work=new ArrayList<Future<?>>();
            for(int i=0;i<4;i++) work.add(pool.submit(() -> {start.await();String id=UUID.randomUUID().toString();try{usage.reserve(id,user,3_000_000);accepted.add(id);}catch(ResponseStatusException expected){assertThat(expected.getStatusCode().value()).isEqualTo(429);}return null;}));
            start.countDown();for(var future:work)future.get();assertThat(accepted).hasSize(1);
            var totals=new AiUsageAccumulator(new AiPricing.Rates(java.math.BigDecimal.ONE,java.math.BigDecimal.ZERO,java.math.BigDecimal.ONE));
            totals.add(null,100,100,false);
            usage.record(accepted.peek(),user,"test",totals,"FAILED","test-v1",10);
            assertThat(jdbc.queryForObject("select count(*) from ai_budget_reservations where user_subject=?",Long.class,user)).isZero();
            assertThat(usage.summary().unknownUsageAttempts()).isGreaterThanOrEqualTo(1);
            usage.reserve(UUID.randomUUID().toString(),user,3_000_000);
        }finally{pool.shutdownNow();jdbc.update("delete from ai_budget_reservations where user_subject=?",user);}
    }
    @Test void failureAndExpiryAreTerminalAndDoNotRestartProviderWork() {
        String user=UUID.randomUUID().toString();
        var claim=store.begin(user,"failure-key","fp",Duration.ofSeconds(1));
        store.fail(user,claim.id(),new ResponseStatusException(org.springframework.http.HttpStatus.BAD_GATEWAY,"Safe failure"));
        assertThat(store.begin(user,"failure-key","fp",Duration.ofSeconds(1)).message()).isEqualTo("Safe failure");
        jdbc.update("update ai_generation_requests set expires_at=? where request_id=?",java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(1)),claim.id());
        assertThat(store.begin(user,"failure-key","fp",Duration.ofSeconds(1)).status()).isEqualTo(410);
        store.cleanup(); assertThat(store.read(user,claim.id(),"fp")).isNull();
    }
}
