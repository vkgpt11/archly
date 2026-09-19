package io.archly.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class AiProviderClient {
    private final HttpClient client;
    private final URI endpoint;
    private final ObjectMapper mapper;
    private final Duration responseTimeout;
    AiProviderClient(ObjectMapper mapper, @Value("${archly.ai.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${archly.ai.connect-timeout:5s}") Duration connectTimeout,
            @Value("${archly.ai.response-timeout:45s}") Duration responseTimeout) {
        this.mapper = mapper; this.responseTimeout = responseTimeout;
        endpoint = URI.create(baseUrl.replaceAll("/$", "") + "/responses");
        client = HttpClient.newBuilder().connectTimeout(connectTimeout).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    JsonNode request(UserLlmSettingsService.Configuration config, ObjectNode body, String key,
                     AiDeadline deadline, Consumer<JsonNode> account) {
        for (int attempt = 0; attempt < 3; attempt++) {
            Duration remaining = deadline.remaining();
            HttpRequest request = HttpRequest.newBuilder(endpoint).timeout(remaining.compareTo(responseTimeout) < 0 ? remaining : responseTimeout)
                .header("Authorization", "Bearer " + config.apiKey()).header("Content-Type", "application/json")
                .header("Idempotency-Key", key).POST(HttpRequest.BodyPublishers.ofString(body.toString())).build();
            var pending = client.sendAsync(request, ignored -> new BoundedBody());
            HttpResponse<byte[]> response;
            try { response = pending.get(Math.min(remaining.toNanos(), responseTimeout.toNanos()), TimeUnit.NANOSECONDS); }
            catch (InterruptedException exception) {
                pending.cancel(true); account.accept(null); Thread.currentThread().interrupt(); deadline.remaining(); throw AiDeadline.expired();
            } catch (Exception exception) {
                pending.cancel(true); account.accept(null); deadline.remaining();
                if (exception.getCause() instanceof BodyTooLarge) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI provider response exceeds the size limit.");
                if (attempt == 2) throw new ResponseStatusException(exception instanceof TimeoutException ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY, "The AI provider could not complete the request.");
                deadline.pause(retryDelay(attempt, null, Instant.now())); continue;
            }
            JsonNode parsed = null;
            try { parsed = mapper.readTree(response.body()); } catch (Exception ignored) { }
            account.accept(parsed);
            deadline.remaining();
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                if (parsed == null) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The AI provider returned invalid JSON.");
                return parsed;
            }
            String code = parsed == null ? "" : parsed.path("error").path("code").asText();
            boolean quota = code.equals("insufficient_quota") || code.equals("billing_hard_limit_reached");
            if (!quota && (status == 408 || status == 429 || status == 500 || status == 502 || status == 503 || status == 504) && attempt < 2) {
                deadline.pause(retryDelay(attempt, response.headers().firstValue("Retry-After").orElse(null), Instant.now())); continue;
            }
            throw switch (status) {
                case 401, 403 -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "The AI provider credential is invalid or unauthorized.");
                case 404 -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "The configured AI model is unavailable.");
                case 429 -> new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, quota ? "The AI provider quota is exhausted." : "The AI provider is rate limiting requests. Try again later.");
                default -> new ResponseStatusException(HttpStatus.BAD_GATEWAY, status >= 500 ? "The AI provider is temporarily unavailable." : "The AI provider refused the request.");
            };
        }
        throw new IllegalStateException("Unreachable retry state");
    }

    static Duration retryDelay(int attempt, String retryAfter, Instant now) {
        long jitter = ThreadLocalRandom.current().nextLong(1, (250L << Math.min(attempt, 4)) + 1);
        Duration minimum = Duration.ZERO;
        if (retryAfter != null) try {
            minimum = retryAfter.trim().matches("[0-9]+") ? Duration.ofSeconds(Long.parseLong(retryAfter.trim()))
                : Duration.between(now, ZonedDateTime.parse(retryAfter, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant());
        } catch (RuntimeException ignored) { }
        return minimum.isNegative() ? Duration.ofMillis(jitter) : minimum.plusMillis(jitter);
    }

    private static class BodyTooLarge extends RuntimeException { }
    private static class BoundedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private Flow.Subscription subscription;
        public CompletionStage<byte[]> getBody() { return result; }
        public void onSubscribe(Flow.Subscription value) { subscription = value; value.request(1); }
        public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) {
                if (bytes.size() + buffer.remaining() > 1_000_000) { subscription.cancel(); result.completeExceptionally(new BodyTooLarge()); return; }
                byte[] chunk = new byte[buffer.remaining()]; buffer.get(chunk); bytes.writeBytes(chunk);
            }
            subscription.request(1);
        }
        public void onError(Throwable error) { result.completeExceptionally(error); }
        public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
