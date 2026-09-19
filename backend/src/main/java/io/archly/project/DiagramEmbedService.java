package io.archly.project;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** A deliberately minimal public projection. Never return a ProjectResponse here. */
@Service
public class DiagramEmbedService {
    public record Diagram(UUID projectId, long revision, Instant updatedAt, JsonNode canvas, String view, String variant) {}
    private final ProjectShareService shares;
    private final ProjectAssetService assets;
    private final ObjectMapper mapper;
    private final CanvasJsonValidator validator;
    private final DiagramPngRenderer renderer;
    public DiagramEmbedService(ProjectShareService shares, ProjectAssetService assets, ObjectMapper mapper, CanvasJsonValidator validator, DiagramPngRenderer renderer) {
        this.shares = shares; this.assets = assets; this.mapper = mapper; this.validator = validator; this.renderer = renderer;
    }
    @Transactional(readOnly = true)
    public Diagram get(String token) {
        var target = shares.embeddedTarget(token);
        Project project = target.project();
        return new Diagram(project.getId(), project.getRevision(), project.getUpdatedAt(), projectCanvas(target), target.view(), target.variant());
    }
    private ObjectNode projectCanvas(ProjectShareService.EmbedTarget target) {
        try {
            Project project = target.project();
            validator.validate(project.getCanvasJson());
            JsonNode source = mapper.readTree(project.getCanvasJson());
            if ((target.view() != null && !target.view().isBlank()) || (target.variant() != null && !target.variant().isBlank())) {
                source = renderer.project(source, target.view(), target.variant());
            }
            if (!source.path("nodes").isArray() || !source.path("edges").isArray()
                || source.path("nodes").size() > 1500 || source.path("edges").size() > 3000)
                throw new IllegalArgumentException();
            ObjectNode canvas = mapper.createObjectNode().put("schemaVersion", 1);
            var nodes = canvas.putArray("nodes");
            for (JsonNode raw : source.path("nodes")) {
                ObjectNode node = copy(raw, List.of("id", "width", "height", "zIndex", "parentId"));
                node.set("position", copy(raw.path("position"), List.of("x", "y")));
                node.put("type", "architecture");
                node.set("style", copy(raw.path("style"), List.of("width", "height", "background", "borderColor", "color", "borderWidth", "opacity")));
                ObjectNode data = copy(raw.path("data"), List.of("label", "kind", "fill", "border", "textColor", "containerId", "iconId", "shape", "opacity", "borderWidth", "customWidth", "customHeight", "padding", "collapsed", "manualSize", "alt", "diagramViewKind", "dataClassification", "dataStore", "processingStep", "trustBoundary"));
                if (raw.path("data").path("sequenceNotes").isArray()) {
                    var notes = data.putArray("sequenceNotes");
                    for (JsonNode note : raw.path("data").path("sequenceNotes")) if (note.isTextual()) notes.add(note.asText());
                }
                if (raw.path("data").path("sequenceActivations").isArray()) {
                    var activations = data.putArray("sequenceActivations");
                    for (JsonNode activation : raw.path("data").path("sequenceActivations")) activations.add(copy(activation, List.of("action", "order")));
                }
                String image = raw.path("data").path("imageSrc").asText("");
                // Never let public rendering contact a user-supplied remote URL.
                if (image.matches("archly-asset:[0-9a-fA-F-]{36}") || image.matches("data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+")) data.put("imageSrc", image);
                else if (!image.isBlank()) throw new IllegalArgumentException("Unsupported public image source");
                node.set("data", data); nodes.add(node);
            }
            var edges = canvas.putArray("edges");
            for (JsonNode raw : source.path("edges")) {
                ObjectNode edge = copy(raw, List.of("id", "source", "target", "sourceHandle", "targetHandle", "label", "zIndex"));
                for (String marker : List.of("markerStart", "markerEnd")) {
                    if (raw.path(marker).isObject()) edge.set(marker, copy(raw.path(marker), List.of("type", "color", "width", "height", "markerUnits", "orient", "strokeWidth")));
                    else if (raw.path(marker).isTextual() && !raw.path(marker).asText().isBlank()) throw new IllegalArgumentException("Unsupported marker reference");
                }
                edge.put("type", "editable");
                edge.set("style", copy(raw.path("style"), List.of("stroke", "strokeWidth", "strokeDasharray", "opacity")));
                edge.set("data", copy(raw.path("data"), List.of("routing", "sequenceOrder", "messageType", "async", "alternative")));
                edges.add(edge);
            }
            return canvas;
        } catch (ResponseStatusException failure) { throw failure; }
        catch (Exception invalid) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "The saved diagram cannot be rendered.");
        }
    }
    private ObjectNode copy(JsonNode input, List<String> fields) {
        ObjectNode output = mapper.createObjectNode();
        for (String field : fields) if (input.has(field) && input.get(field).isValueNode()) output.set(field, input.get(field).deepCopy());
        return output;
    }
    @Transactional(readOnly = true)
    public byte[] image(String token, UUID asset) {
        var target = shares.embeddedTarget(token);
        Project project = target.project();
        if (!ProjectAssetService.references(projectCanvas(target).toString(), "").contains(asset))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image unavailable.");
        return assets.read(project, asset, false);
    }
    @Transactional(readOnly = true)
    public String imageType(String token, UUID asset) {
        var target = shares.embeddedTarget(token);
        Project project = target.project();
        if (!ProjectAssetService.references(projectCanvas(target).toString(), "").contains(asset))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image unavailable.");
        return assets.mediaType(project, asset);
    }
    @Transactional(readOnly = true)
    public Diagram renderable(String token) {
        Diagram diagram = get(token);
        long bytes = 0;
        for (JsonNode node : diagram.canvas().path("nodes")) {
            String reference = node.path("data").path("imageSrc").asText();
            if (reference.startsWith("archly-asset:")) {
                UUID id = UUID.fromString(reference.substring(13));
                byte[] content = image(token, id); bytes += content.length;
                if (bytes > 12_000_000) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Diagram images exceed the render limit.");
                ((ObjectNode) node.path("data")).put("imageSrc", "data:" + imageType(token, id) + ";base64," + java.util.Base64.getEncoder().encodeToString(content));
            }
        }
        return diagram;
    }
}
