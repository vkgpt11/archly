package io.archly.project;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class RequestRateLimiter {
    private record Window(Instant startedAt, int requests) {}
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public void check(String key, int limit, Duration duration) {
        Instant now = Instant.now();
        Window result = windows.compute(key, (ignored, current) -> {
            if (current == null || current.startedAt().plus(duration).isBefore(now)) return new Window(now, 1);
            return new Window(current.startedAt(), current.requests() + 1);
        });
        if (result.requests() > limit) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Try again later.");
        if (windows.size() > 10_000) windows.entrySet().removeIf(entry -> entry.getValue().startedAt().plus(duration).isBefore(now));
    }
}
