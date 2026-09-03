package io.archly.ai;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class AiGenerationRateLimiter {
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    void check(String identity) {
        Instant now = Instant.now();
        Window value = windows.compute(identity.toLowerCase(), (key, current) ->
            current == null || current.started.plusSeconds(60).isBefore(now) ? new Window(now) : current);
        if (value.count.incrementAndGet() > 10) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "AI generation limit exceeded. Try again in a minute.");
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(entry -> entry.getValue().started.plusSeconds(60).isBefore(now));
        }
    }

    private static final class Window {
        final Instant started;
        final AtomicInteger count = new AtomicInteger();
        Window(Instant started) { this.started = started; }
    }
}
