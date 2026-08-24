package io.archly.project;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RichTextSanitizerTest {
    private final RichTextSanitizer sanitizer = new RichTextSanitizer();

    @Test
    void removesExecutableMarkupAndUnsafeProtocols() {
        String unsafe = "<p onclick=\"alert(1)\">Safe</p><img src=\"x\" onerror=\"alert(1)\">"
            + "<script>alert(1)</script><p><a href=\"javascript:alert(1)\">Unsafe</a></p>";

        assertThat(sanitizer.sanitize(unsafe)).isEqualTo("<p>Safe</p><p><a>Unsafe</a></p>");
    }

    @Test
    void retainsSupportedLinksCodeAndColorStyles() {
        String supported = "<p><a href=\"https://example.com\" target=\"_blank\">Docs</a></p>"
            + "<span style=\"color:#2563eb;position:fixed\">Blue</span>"
            + "<mark data-color=\"#fef3c7\" style=\"background-color:#fef3c7;position:fixed\">Marked</mark>"
            + "<pre><code class=\"language-java\">record A() {}</code></pre>";

        assertThat(sanitizer.sanitize(supported))
            .isEqualTo("<p><a href=\"https://example.com\" target=\"_blank\" rel=\"noopener noreferrer\">Docs</a></p>"
                + "<span style=\"color: #2563eb\">Blue</span>"
                + "<mark data-color=\"#fef3c7\" style=\"background-color: #fef3c7\">Marked</mark>"
                + "<pre><code class=\"language-java\">record A() {}</code></pre>");
    }

    @Test
    void retainsSafeInlineScreenshotsAndRemovesUnsafeImages() {
        String safe = "<img src=\"data:image/png;base64,aGVsbG8=\" alt=\"Screenshot\" width=\"640\" onerror=\"alert(1)\">";
        assertThat(sanitizer.sanitize(safe))
            .isEqualTo("<img src=\"data:image/png;base64,aGVsbG8=\" alt=\"Screenshot\" width=\"640\">");
        assertThat(sanitizer.sanitize("<img src=\"data:image/png;base64,aGVsbG8=\" width=\"99999\">"))
            .isEqualTo("<img src=\"data:image/png;base64,aGVsbG8=\">");
        assertThat(sanitizer.sanitize("<img src=\"https://example.com/tracker.png\">"))
            .isEmpty();
        assertThat(sanitizer.sanitize("<img src=\"data:image/svg+xml;base64,PHN2Zz4=\">"))
            .isEmpty();
    }
}
