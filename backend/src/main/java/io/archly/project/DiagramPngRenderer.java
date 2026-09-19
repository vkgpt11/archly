package io.archly.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.concurrent.*;
import java.io.ByteArrayOutputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Calls only the administrator-configured, authenticated rendering service. */
@Service
public class DiagramPngRenderer {
    private final String url;
    private final String key;
    private final ObjectMapper mapper;
    private final java.util.concurrent.Semaphore slots = new java.util.concurrent.Semaphore(2);
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
    public DiagramPngRenderer(@Value("${archly.embed.renderer-url:${ARCHLY_EMBED_RENDERER_URL:}}") String url,
                              @Value("${archly.embed.renderer-key:${ARCHLY_EMBED_RENDERER_KEY:}}") String key, ObjectMapper mapper) {
        this.url = url; this.key = key; this.mapper = mapper;
        if (!url.isBlank()) {
            URI endpoint = URI.create(url);
            if (!List.of("http", "https").contains(endpoint.getScheme()) || endpoint.getHost() == null
                || endpoint.getUserInfo() != null || endpoint.getFragment() != null || key.length() < 32)
                throw new IllegalArgumentException("Configure a valid HTTP(S) renderer endpoint and a key with at least 32 characters.");
        }
    }
    public byte[] render(DiagramEmbedService.Diagram diagram) {
        byte[] image = exchange(diagram, url);
        if (image.length < 8 || image[0] != (byte) 137 || image[1] != 80 || image[2] != 78 || image[3] != 71)
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Invalid image response.");
        return image;
    }

    public com.fasterxml.jackson.databind.JsonNode project(com.fasterxml.jackson.databind.JsonNode canvas, String view, String variant) {
        var request = mapper.createObjectNode().put("view", view).put("variant", variant);
        // Only the isolated private compiler sees source/modules. Never send history or documentation.
        var input = request.putObject("canvas");
        for (String field : List.of("nodes", "edges", "diagramCode", "diagramModules", "diagramViewStates"))
            if (canvas.has(field)) input.set(field, canvas.get(field));
        try { return mapper.readTree(exchange(request, URI.create(url).resolve("./project").toString())); }
        catch (ResponseStatusException failure) { throw failure; }
        catch (Exception invalid) { throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "The published view is unavailable."); }
    }

    private byte[] exchange(Object body, String endpoint) {
        if (url.isBlank() || key.length() < 32) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Diagram image rendering is not configured. Open the interactive viewer instead.");
        if (!slots.tryAcquire()) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Image renderer is busy. Try again shortly.");
        try {
            var request = HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + key).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build();
            var response = client.send(request, ignored -> new LimitedBody());
            byte[] image = response.body();
            if (response.statusCode() == 422) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "The published view or environment no longer exists or cannot be rendered.");
            if (response.statusCode() != 200 || image.length > 16_000_000)
                throw new IllegalStateException();
            return image;
        } catch (ResponseStatusException rejected) { throw rejected; }
        catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image rendering interrupted.");
        } catch (Exception failed) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image rendering unavailable. Open the interactive viewer or retry.");
        } finally { slots.release(); }
    }

    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private Flow.Subscription subscription;
        @Override public CompletionStage<byte[]> getBody() { return result; }
        @Override public void onSubscribe(Flow.Subscription subscription) { this.subscription = subscription; subscription.request(1); }
        @Override public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) {
                if (buffer.remaining() > 16_000_000 - bytes.size()) {
                    subscription.cancel(); result.completeExceptionally(new IllegalStateException("Image response too large")); return;
                }
                byte[] chunk = new byte[buffer.remaining()]; buffer.get(chunk); bytes.writeBytes(chunk);
            }
            subscription.request(1);
        }
        @Override public void onError(Throwable failure) { result.completeExceptionally(failure); }
        @Override public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
