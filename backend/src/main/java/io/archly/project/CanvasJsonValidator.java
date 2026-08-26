package io.archly.project;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CanvasJsonValidator {
    static final int CURRENT_SCHEMA_VERSION = 1;
    static final int MAX_DEPTH = 20;
    static final int MAX_NODES = 5_000;
    static final int MAX_EDGES = 10_000;

    private final ObjectMapper objectMapper;

    public CanvasJsonValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void validate(String value) {
        final JsonNode root;
        try {
            root = objectMapper.readTree(value);
        } catch (JsonProcessingException | RuntimeException exception) {
            reject("Canvas must be valid JSON.");
            return;
        }
        if (root == null || !root.isObject()) reject("Canvas must be a JSON object.");
        if (depth(root) > MAX_DEPTH) reject("Canvas exceeds the maximum nesting depth of " + MAX_DEPTH + ".");

        JsonNode version = root.get("schemaVersion");
        if (version != null && (!version.canConvertToInt() || version.intValue() != CURRENT_SCHEMA_VERSION)) {
            reject("Unsupported canvas schema version.");
        }
        JsonNode nodes = requiredArray(root, "nodes");
        JsonNode edges = requiredArray(root, "edges");
        if (nodes.size() > MAX_NODES) reject("Canvas contains too many nodes.");
        if (edges.size() > MAX_EDGES) reject("Canvas contains too many edges.");

        Set<String> nodeIds = new HashSet<>();
        for (JsonNode node : nodes) {
            if (!node.isObject()) reject("Every canvas node must be an object.");
            String id = requiredText(node, "id", "node");
            if (!nodeIds.add(id)) reject("Canvas node IDs must be unique.");
            JsonNode position = node.get("position");
            if (position == null || !position.isObject()
                || !finiteNumber(position.get("x")) || !finiteNumber(position.get("y"))) {
                reject("Every canvas node must have a numeric x/y position.");
            }
            JsonNode data = node.get("data");
            if (data == null || !data.isObject()) reject("Every canvas node must have an object data field.");
        }

        Set<String> edgeIds = new HashSet<>();
        for (JsonNode edge : edges) {
            if (!edge.isObject()) reject("Every canvas edge must be an object.");
            String id = requiredText(edge, "id", "edge");
            if (!edgeIds.add(id)) reject("Canvas edge IDs must be unique.");
            String source = requiredText(edge, "source", "edge");
            String target = requiredText(edge, "target", "edge");
            if (!nodeIds.contains(source) || !nodeIds.contains(target)) {
                reject("Every canvas edge must reference existing nodes.");
            }
        }
        JsonNode viewport = root.get("viewport");
        if (viewport != null && (!viewport.isObject() || !finiteNumber(viewport.get("x"))
            || !finiteNumber(viewport.get("y")) || !finiteNumber(viewport.get("zoom"))
            || viewport.get("zoom").doubleValue() <= 0)) {
            reject("Canvas viewport must contain numeric x, y, and positive zoom values.");
        }
    }

    private JsonNode requiredArray(JsonNode root, String field) {
        JsonNode value = root.get(field);
        if (value == null || !value.isArray()) reject("Canvas " + field + " must be an array.");
        return value;
    }

    private String requiredText(JsonNode value, String field, String owner) {
        JsonNode property = value.get(field);
        if (property == null || !property.isTextual() || property.textValue().isBlank()
            || property.textValue().length() > 128) {
            reject("Every canvas " + owner + " must have a valid " + field + ".");
        }
        return property.textValue();
    }

    private boolean finiteNumber(JsonNode value) {
        return value != null && value.isNumber() && Double.isFinite(value.doubleValue());
    }

    private int depth(JsonNode node) {
        if (!node.isContainerNode() || node.isEmpty()) return 1;
        int childDepth = 0;
        for (JsonNode child : node) childDepth = Math.max(childDepth, depth(child));
        return childDepth + 1;
    }

    private void reject(String reason) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
