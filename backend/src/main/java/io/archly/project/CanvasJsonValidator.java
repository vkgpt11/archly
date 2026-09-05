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
    static final int MAX_MODULES = 100;
    static final int MAX_MODULE_SOURCE = 500_000;

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
        JsonNode modules = root.get("diagramModules");
        if (modules != null) {
            if (!modules.isArray() || modules.size() > MAX_MODULES) reject("Canvas diagram modules must be an array of at most " + MAX_MODULES + " items.");
            Set<String> moduleIds = new HashSet<>();
            for (JsonNode module : modules) {
                if (!module.isObject()) reject("Every diagram module must be an object.");
                String id = requiredModuleText(module, "id", 160);
                String moduleVersion = requiredModuleText(module, "version", 32);
                JsonNode sourceValue = module.get("source");
                if (sourceValue == null || !sourceValue.isTextual()) reject("Every diagram module must have a valid source.");
                String source = sourceValue.textValue();
                if (!id.matches("[A-Za-z0-9][A-Za-z0-9_-]*(/[A-Za-z0-9][A-Za-z0-9_-]*)*") || id.contains("..") || id.contains("://")) reject("Diagram module IDs must be safe project-relative identifiers.");
                if (!moduleVersion.matches("\\d+(\\.\\d+){0,2}")) reject("Diagram module versions must be numeric.");
                if (!moduleIds.add(id)) reject("Diagram module IDs must be unique.");
                if (source.length() > MAX_MODULE_SOURCE) reject("Diagram module source is too large.");
            }
        }
        JsonNode activeView = root.get("activeView");
        if (activeView != null && (!activeView.isTextual() || activeView.textValue().isBlank() || activeView.textValue().length() > 128)) reject("Canvas active view must be a valid name.");
        JsonNode viewStates = root.get("diagramViewStates");
        if (viewStates != null) {
            if (!viewStates.isObject() || viewStates.size() > 100) reject("Canvas view states must contain at most 100 named views.");
            var fields = viewStates.fields();
            while (fields.hasNext()) {
                var entry = fields.next();
                if (entry.getKey().isBlank() || entry.getKey().length() > 128 || !entry.getValue().isObject()) reject("Every canvas view state must be valid.");
                JsonNode positions = entry.getValue().get("positions");
                if (positions == null || !positions.isObject() || positions.size() > MAX_NODES) reject("Every canvas view state must contain bounded positions.");
                var positionFields = positions.fields();
                while (positionFields.hasNext()) {
                    JsonNode position = positionFields.next().getValue();
                    if (!position.isObject() || !finiteNumber(position.get("x")) || !finiteNumber(position.get("y"))) reject("Every view position must contain numeric x and y values.");
                }
            }
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

    private String requiredModuleText(JsonNode value, String field, int maxLength) {
        JsonNode property = value.get(field);
        if (property == null || !property.isTextual() || property.textValue().isBlank() || property.textValue().length() > maxLength) {
            reject("Every diagram module must have a valid " + field + ".");
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
