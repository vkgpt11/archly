package io.archly.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class AiReliabilityTest {
    final ObjectMapper mapper = new ObjectMapper();
    final String prices = "{\"mini\":{\"input\":0.4,\"cachedInput\":0.1,\"output\":1.6},\"large\":{\"input\":2,\"cachedInput\":0.5,\"output\":8}}";
    @Test void pricesModelsAndCachedTokensAndAccountsForUnknownUsage() throws Exception {
        AiPricing pricing = new AiPricing(mapper, prices, "test-v1");
        assertThat(pricing.require("mini").cost(1000, 500, 100)).isEqualTo(410);
        assertThat(pricing.require("large").cost(1000, 500, 100)).isEqualTo(2050);
        assertThatThrownBy(() -> pricing.require("unknown")).isInstanceOf(ResponseStatusException.class);
        var usage = new AiUsageAccumulator(pricing.require("mini"));
        usage.add(mapper.readTree("{\"usage\":{\"input_tokens\":1000,\"input_tokens_details\":{\"cached_tokens\":500},\"output_tokens\":100}}"), 2000, 8000, false);
        usage.add(mapper.readTree("{\"usage\":{\"input_tokens\":100,\"output_tokens\":50}}"), 1000, 8000, true);
        usage.add(null, 2000, 8000, true);
        assertThat(usage.input).isEqualTo(1100); assertThat(usage.output).isEqualTo(150);
        assertThat(usage.cost).isEqualTo(410 + 120 + 13600);
        assertThat(usage.attempts).isEqualTo(3); assertThat(usage.repairAttempts).isEqualTo(2); assertThat(usage.unknownAttempts).isEqualTo(1);
    }
    @Test void honorsSecondsAndDateRetryAfterAndBoundsJitter() {
        Instant now = Instant.parse("2026-09-09T00:00:00Z");
        assertThat(AiProviderClient.retryDelay(0, "2", now).toMillis()).isBetween(2001L, 2250L);
        String date = DateTimeFormatter.RFC_1123_DATE_TIME.format(now.plusSeconds(3).atZone(ZoneOffset.UTC));
        assertThat(AiProviderClient.retryDelay(1, date, now).toMillis()).isBetween(3001L, 3500L);
        var values = new java.util.HashSet<Long>();
        for (int i=0;i<20;i++) { long delay=AiProviderClient.retryDelay(1,"invalid",now).toMillis(); assertThat(delay).isBetween(1L,500L); values.add(delay); }
        assertThat(values.size()).isGreaterThan(1);
    }
    @Test void retriesTransientFailureButNeverDefinitiveQuota() throws Exception {
        AtomicInteger calls = new AtomicInteger(), accounted = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/responses", exchange -> {
            int call = calls.incrementAndGet();
            byte[] body = (call == 1 ? "{\"error\":{\"code\":\"rate_limit_exceeded\"}}" : "{\"output\":[]}").getBytes(StandardCharsets.UTF_8);
            exchange.getRequestBody().readAllBytes(); exchange.getResponseHeaders().add("Retry-After","0");
            exchange.sendResponseHeaders(call == 1 ? 429 : 200, body.length); exchange.getResponseBody().write(body); exchange.close();
        }); server.start();
        try {
            var client = client(server);
            client.request(new UserLlmSettingsService.Configuration("mini", "test-key"), mapper.createObjectNode(), "key", new AiDeadline(Duration.ofSeconds(3)), ignored -> accounted.incrementAndGet());
            assertThat(calls).hasValue(2); assertThat(accounted).hasValue(2);
            server.removeContext("/responses"); calls.set(0);
            server.createContext("/responses", exchange -> { calls.incrementAndGet(); byte[] body="{\"error\":{\"code\":\"insufficient_quota\"}}".getBytes(); exchange.sendResponseHeaders(429,body.length);exchange.getResponseBody().write(body);exchange.close(); });
            assertThatThrownBy(() -> client.request(new UserLlmSettingsService.Configuration("mini", "test-key"), mapper.createObjectNode(), "key", new AiDeadline(Duration.ofSeconds(3)), ignored -> {})).isInstanceOf(ResponseStatusException.class).hasMessageContaining("quota");
            assertThat(calls).hasValue(1);
        } finally { server.stop(0); }
    }
    @Test void totalDeadlineBoundsSlowBodyAndRetryAfter() throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/responses", exchange -> {
            exchange.sendResponseHeaders(200, 100);
            try { Thread.sleep(1500); } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
            exchange.close();
        }); server.start();
        try {
            long started=System.nanoTime();
            assertThatThrownBy(() -> client(server).request(new UserLlmSettingsService.Configuration("mini","test-key"),mapper.createObjectNode(),"key",new AiDeadline(Duration.ofMillis(200)), ignored -> {})).isInstanceOf(ResponseStatusException.class).hasMessageContaining("deadline");
            // The provider deadline is 200 ms; allow runner scheduling and HTTP cancellation cleanup.
            assertThat(Duration.ofNanos(System.nanoTime()-started)).isLessThan(Duration.ofSeconds(2));
            assertThatThrownBy(() -> new AiDeadline(Duration.ofMillis(20)).pause(Duration.ofSeconds(30))).isInstanceOf(ResponseStatusException.class);
        } finally { server.stop(0); }
    }
    private AiProviderClient client(HttpServer server) {
        return new AiProviderClient(mapper,"http://127.0.0.1:"+server.getAddress().getPort(),Duration.ofSeconds(1),Duration.ofSeconds(2));
    }
}
