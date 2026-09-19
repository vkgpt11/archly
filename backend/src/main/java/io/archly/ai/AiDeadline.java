package io.archly.ai;

import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class AiDeadline {
    private final long end;
    AiDeadline(Duration duration) { end = System.nanoTime() + duration.toNanos(); }
    Duration remaining() {
        if (Thread.currentThread().isInterrupted()) throw new ResponseStatusException(HttpStatus.REQUEST_TIMEOUT, "AI request cancelled.");
        long nanos = end - System.nanoTime();
        if (nanos <= 0) throw expired();
        return Duration.ofNanos(nanos);
    }
    void pause(Duration delay) {
        if (delay.compareTo(remaining()) >= 0) throw expired();
        try { Thread.sleep(delay.toMillis()); }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); remaining(); }
        remaining();
    }
    static ResponseStatusException expired() {
        return new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "The overall AI generation deadline was reached. Try a smaller request.");
    }
}
