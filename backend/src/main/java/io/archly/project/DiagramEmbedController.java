package io.archly.project;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/embeds")
public class DiagramEmbedController {
    private final DiagramEmbedService service;
    private final DiagramPngRenderer renderer;
    private final RequestRateLimiter limiter;
    public DiagramEmbedController(DiagramEmbedService service, DiagramPngRenderer renderer, RequestRateLimiter limiter) {
        this.service = service; this.renderer = renderer; this.limiter = limiter;
    }
    @GetMapping("/{token}")
    ResponseEntity<DiagramEmbedService.Diagram> get(@PathVariable String token, HttpServletRequest request) {
        limit(request, 120, "view");
        return headers(MediaType.APPLICATION_JSON).body(service.get(token));
    }
    @GetMapping("/{token}/image.png")
    ResponseEntity<byte[]> png(@PathVariable String token, HttpServletRequest request) {
        limit(request, 20, "render");
        var diagram = service.renderable(token);
        byte[] image = renderer.render(diagram);
        service.get(token); // Recheck revocation after the potentially slow render.
        return headers(MediaType.IMAGE_PNG).body(image);
    }
    @GetMapping("/{token}/assets/{asset}")
    ResponseEntity<byte[]> asset(@PathVariable String token, @PathVariable UUID asset, HttpServletRequest request) {
        limit(request, 240, "asset");
        return headers(MediaType.parseMediaType(service.imageType(token, asset))).body(service.image(token, asset));
    }
    private ResponseEntity.BodyBuilder headers(MediaType type) {
        return ResponseEntity.ok().contentType(type).cacheControl(CacheControl.noStore())
            .header("Referrer-Policy", "no-referrer").header("X-Content-Type-Options", "nosniff")
            .header("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    private void limit(HttpServletRequest request, int count, String purpose) {
        limiter.check("embed-" + purpose + ":" + request.getRemoteAddr(), count, Duration.ofMinutes(1));
    }
}
