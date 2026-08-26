package io.archly.project;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProjectContentValidator {
    static final int MAX_EMBEDDED_IMAGE_BYTES = 2_000_000;
    static final int MAX_TOTAL_EMBEDDED_IMAGE_BYTES = 5_000_000;
    private static final Pattern DATA_IMAGE = Pattern.compile(
        "data:image/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)", Pattern.CASE_INSENSITIVE);

    public void validateMarkdown(String markdown) {
        if (markdown == null || markdown.isEmpty()) return;
        Matcher matcher = DATA_IMAGE.matcher(markdown);
        long total = 0;
        while (matcher.find()) {
            int encodedLength = matcher.group(1).length();
            long bytes = (encodedLength * 3L) / 4L;
            if (bytes > MAX_EMBEDDED_IMAGE_BYTES) reject("Each embedded image must be 2 MB or smaller.");
            total += bytes;
            if (total > MAX_TOTAL_EMBEDDED_IMAGE_BYTES) reject("Embedded images must total 5 MB or less per document.");
        }
    }

    private void reject(String reason) {
        throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, reason);
    }
}
