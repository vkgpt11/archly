package io.archly.project;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

@Component
public class RichTextSanitizer {
    private static final Safelist ALLOWED = Safelist.none()
        .addTags("p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "s", "strike", "del",
            "ul", "ol", "li", "blockquote", "pre", "code", "span", "mark", "a", "img")
        .addAttributes("a", "href", "title", "target", "rel")
        .addAttributes("span", "style")
        .addAttributes("mark", "style", "data-color")
        .addAttributes("code", "class")
        .addAttributes("img", "src", "alt", "title", "width")
        .addProtocols("a", "href", "http", "https", "mailto")
        .addProtocols("img", "src", "data");
    private static final Pattern COLOR_VALUE = Pattern.compile(
        "(?i)^(#[0-9a-f]{3,8}|rgba?\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}(?:\\s*,\\s*(?:0|1|0?\\.\\d+))?\\s*\\))$");
    private static final Pattern CODE_CLASS = Pattern.compile("^language-[a-z0-9_-]{1,40}$");

    public String sanitize(String html) {
        if (html == null || html.isBlank()) return "";
        Document.OutputSettings output = new Document.OutputSettings().prettyPrint(false);
        String cleaned = Jsoup.clean(html, "", ALLOWED, output);
        Document document = Jsoup.parseBodyFragment(cleaned);
        document.outputSettings(output);
        document.select("span[style], mark[style]").forEach(this::sanitizeColorStyle);
        document.select("mark[data-color]").forEach(element -> {
            if (!COLOR_VALUE.matcher(element.attr("data-color")).matches()) element.removeAttr("data-color");
        });
        document.select("code[class]").forEach(element -> {
            if (!CODE_CLASS.matcher(element.attr("class")).matches()) element.removeAttr("class");
        });
        document.select("img").forEach(element -> {
            if (!element.attr("src").matches("(?i)^data:image/(png|jpeg|webp);base64,[a-z0-9+/=\\s]+$")) {
                element.remove();
                return;
            }
            String width = element.attr("width");
            if (!width.isBlank() && (!width.matches("\\d{3,4}")
                || Integer.parseInt(width) < 120 || Integer.parseInt(width) > 2000)) {
                element.removeAttr("width");
            }
        });
        document.select("a[target=_blank]").forEach(element -> element.attr("rel", "noopener noreferrer"));
        return document.body().html();
    }

    private void sanitizeColorStyle(Element element) {
        List<String> retained = new ArrayList<>();
        for (String declaration : element.attr("style").split(";")) {
            String[] pair = declaration.split(":", 2);
            if (pair.length != 2) continue;
            String property = pair[0].trim().toLowerCase(Locale.ROOT);
            String value = pair[1].trim();
            if ((property.equals("color") || property.equals("background-color")) && COLOR_VALUE.matcher(value).matches()) {
                retained.add(property + ": " + value);
            }
        }
        if (retained.isEmpty()) element.removeAttr("style");
        else element.attr("style", String.join("; ", retained));
    }
}
