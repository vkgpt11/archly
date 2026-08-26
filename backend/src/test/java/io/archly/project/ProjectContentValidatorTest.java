package io.archly.project;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class ProjectContentValidatorTest {
    private final ProjectContentValidator validator = new ProjectContentValidator();

    @Test
    void acceptsOrdinaryHtmlAndSmallEmbeddedImages() {
        assertDoesNotThrow(() -> validator.validateMarkdown("<p>Design</p><img src=\"data:image/png;base64,AAAA\">"));
    }

    @Test
    void rejectsAnOversizedEmbeddedImage() {
        String image = "A".repeat(2_700_000);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> validator.validateMarkdown("<img src=\"data:image/png;base64," + image + "\">"));
        assertEquals(413, error.getStatusCode().value());
    }

    @Test
    void rejectsExcessiveCombinedEmbeddedImageData() {
        String image = "A".repeat(2_400_000);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> validator.validateMarkdown("<img src=\"data:image/png;base64," + image + "\"><img src=\"data:image/png;base64," + image + "\"><img src=\"data:image/png;base64," + image + "\">"));
        assertEquals(413, error.getStatusCode().value());
    }
}
