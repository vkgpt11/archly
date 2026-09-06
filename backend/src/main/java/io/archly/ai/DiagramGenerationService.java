package io.archly.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.archly.ai.DiagramGenerationDtos.GenerateDiagramResponse;
import io.archly.ai.DiagramGenerationDtos.GenerateDiagramRequest;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Service
public class DiagramGenerationService {
    private static final Set<String> KINDS = Set.of(
        "service", "web", "mobile", "database", "cache", "queue", "storage", "external", "actor", "custom", "container"
    );
    private static final int MAX_NODES = 40;
    private static final int MAX_EDGES = 80;

    private final RestClient client;
    private final ObjectMapper mapper;
    private final UserLlmSettingsService settings;

    public DiagramGenerationService(
        RestClient.Builder builder,
        ObjectMapper mapper,
        @Value("${archly.ai.base-url:https://api.openai.com/v1}") String baseUrl,
        UserLlmSettingsService settings
    ) {
        this.client = builder.baseUrl(baseUrl).build();
        this.mapper = mapper;
        this.settings = settings;
    }

    public GenerateDiagramResponse generate(String userSubject, String prompt) {
        return generate(userSubject, new GenerateDiagramRequest(prompt, null, null, null, "create", null));
    }

    public GenerateDiagramResponse generate(String userSubject, GenerateDiagramRequest request) {
        UserLlmSettingsService.Configuration configuration = settings.requireConfiguration(userSubject);
        JsonNode response;
        try {
            response = client.post().uri("/responses")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + configuration.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody(configuration.model(), request))
                .retrieve()
                .body(JsonNode.class);
            settings.recordSuccess(userSubject);
        } catch (RestClientException exception) {
            settings.recordFailure(userSubject, "PROVIDER_REQUEST_FAILED");
            throw new ResponseStatusException(BAD_GATEWAY, "The AI provider could not generate a diagram. Try again.", exception);
        }
        try {
            String output = extractOutputText(response);
            JsonNode specification = mapper.readTree(output);
            return toCanvas(specification);
        } catch (Exception exception) {
            throw new ResponseStatusException(BAD_GATEWAY, "The AI provider returned an invalid diagram. Try a more specific prompt.", exception);
        }
    }

    public void testConnection(String userSubject, String model, String apiKey) {
        UserLlmSettingsService.Configuration saved = apiKey == null || apiKey.isBlank()
            ? settings.requireConfiguration(userSubject) : new UserLlmSettingsService.Configuration(model.trim(), apiKey.trim());
        String selectedModel = model == null || model.isBlank() ? saved.model() : model.trim();
        try {
            client.post().uri("/responses")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + saved.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(mapper.createObjectNode().put("model", selectedModel).put("input", "Reply with OK.").put("store", false).put("max_output_tokens", 16))
                .retrieve().toBodilessEntity();
            if (apiKey == null || apiKey.isBlank()) settings.recordSuccess(userSubject);
        } catch (RestClientException exception) {
            if (apiKey == null || apiKey.isBlank()) settings.recordFailure(userSubject, "CONNECTION_TEST_FAILED");
            throw new ResponseStatusException(BAD_GATEWAY, "OpenAI rejected the connection test. Check the API key and model.", exception);
        }
    }

    ObjectNode requestBody(String model, String prompt) {
        return requestBody(model, new GenerateDiagramRequest(prompt, null, null, null, "create", null));
    }

    ObjectNode requestBody(String model, GenerateDiagramRequest request) {
        ObjectNode root = mapper.createObjectNode();
        root.put("model", model);
        root.put("store", false);
        root.put("instructions", "You are Archly's architecture copilot. Produce a technically credible, editable architecture. Reuse catalogue iconId values exactly when relevant. Model regions, VPCs/VNets, clusters, namespaces and trust boundaries as container nodes and assign children with containerKey. Preserve unaffected components when editing. Use explicit protocols, ports, encryption, direction and asynchronous semantics. Return the complete resulting diagram, not a patch, and only the requested schema.");
        ObjectNode input = mapper.createObjectNode();
        input.put("request", request.prompt());
        input.put("mode", request.mode() == null ? "create" : request.mode());
        if (request.currentCanvas() != null && !request.currentCanvas().isBlank()) input.put("currentCanvas", request.currentCanvas());
        if (request.selectedSubsystem() != null && !request.selectedSubsystem().isBlank()) input.put("selectedSubsystem", request.selectedSubsystem());
        if (request.documentation() != null && !request.documentation().isBlank()) input.put("projectDocumentation", request.documentation());
        if (request.catalogue() != null && !request.catalogue().isBlank()) input.put("componentCatalogue", request.catalogue());
        root.put("input", input.toString());
        ObjectNode format = root.putObject("text").putObject("format");
        format.put("type", "json_schema");
        format.put("name", "archly_diagram");
        format.put("strict", true);
        format.set("schema", outputSchema());
        return root;
    }

    private ObjectNode outputSchema() {
        ObjectNode node = mapper.createObjectNode();
        node.put("type", "object");
        node.putArray("required").add("summary").add("nodes").add("edges");
        node.put("additionalProperties", false);
        ObjectNode properties = node.putObject("properties");
        properties.putObject("summary").put("type", "string").put("maxLength", 240);
        ObjectNode nodes = properties.putObject("nodes");
        nodes.put("type", "array").put("maxItems", MAX_NODES);
        ObjectNode nodeItem = nodes.putObject("items");
        nodeItem.put("type", "object").put("additionalProperties", false);
        nodeItem.putArray("required").add("key").add("label").add("description").add("kind").add("iconId").add("containerKey").add("boundaryType").add("provider");
        ObjectNode nodeProps = nodeItem.putObject("properties");
        nodeProps.putObject("key").put("type", "string").put("maxLength", 48);
        nodeProps.putObject("label").put("type", "string").put("maxLength", 80);
        nodeProps.putObject("description").put("type", "string").put("maxLength", 240);
        ArrayNode kinds = nodeProps.putObject("kind").put("type", "string").putArray("enum");
        KINDS.forEach(kinds::add);
        nullableString(nodeProps, "iconId", 120);
        nullableString(nodeProps, "containerKey", 48);
        nullableString(nodeProps, "boundaryType", 80);
        nullableString(nodeProps, "provider", 32);
        ObjectNode edges = properties.putObject("edges");
        edges.put("type", "array").put("maxItems", MAX_EDGES);
        ObjectNode edgeItem = edges.putObject("items");
        edgeItem.put("type", "object").put("additionalProperties", false);
        edgeItem.putArray("required").add("source").add("target").add("label").add("protocol").add("port").add("async").add("encrypted").add("direction").add("description");
        ObjectNode edgeProps = edgeItem.putObject("properties");
        edgeProps.putObject("source").put("type", "string").put("maxLength", 48);
        edgeProps.putObject("target").put("type", "string").put("maxLength", 48);
        edgeProps.putObject("label").put("type", "string").put("maxLength", 80);
        nullableString(edgeProps, "protocol", 32);
        nullableString(edgeProps, "port", 16);
        edgeProps.putObject("async").putArray("type").add("boolean").add("null");
        edgeProps.putObject("encrypted").putArray("type").add("boolean").add("null");
        nullableString(edgeProps, "direction", 20);
        nullableString(edgeProps, "description", 240);
        return node;
    }

    private void nullableString(ObjectNode properties, String name, int maxLength) {
        ObjectNode value = properties.putObject(name);
        value.putArray("type").add("string").add("null");
        value.put("maxLength", maxLength);
    }

    private String extractOutputText(JsonNode response) {
        if (response == null) throw new IllegalArgumentException("Missing response");
        for (JsonNode item : response.path("output")) {
            for (JsonNode content : item.path("content")) {
                if ("output_text".equals(content.path("type").asText()) && content.hasNonNull("text")) {
                    return content.get("text").asText();
                }
            }
        }
        throw new IllegalArgumentException("Missing output text");
    }

    GenerateDiagramResponse toCanvas(JsonNode specification) {
        JsonNode specs = specification.path("nodes");
        JsonNode connections = specification.path("edges");
        if (!specs.isArray() || specs.isEmpty() || specs.size() > MAX_NODES || !connections.isArray() || connections.size() > MAX_EDGES) {
            throw new IllegalArgumentException("Invalid diagram size");
        }
        ObjectNode canvas = mapper.createObjectNode();
        canvas.put("schemaVersion", 1);
        ArrayNode nodes = canvas.putArray("nodes");
        ArrayNode edges = canvas.putArray("edges");
        Map<String, String> ids = new HashMap<>();
        Set<String> uniqueKeys = new HashSet<>();
        int columns = Math.min(4, Math.max(1, (int) Math.ceil(Math.sqrt(specs.size()))));
        for (int index = 0; index < specs.size(); index++) {
            JsonNode spec = specs.get(index);
            String key = required(spec, "key", 48);
            String label = required(spec, "label", 80);
            String kind = required(spec, "kind", 20);
            if (!uniqueKeys.add(key) || !KINDS.contains(kind)) throw new IllegalArgumentException("Invalid node");
            String id = UUID.randomUUID().toString();
            ids.put(key, id);
            ObjectNode node = nodes.addObject();
            node.put("id", id).put("type", "architecture");
            node.putObject("position").put("x", 80 + (index % columns) * 260).put("y", 80 + (index / columns) * 180);
            ObjectNode data = node.putObject("data");
            data.put("label", label).put("kind", kind).put("description", optional(spec, "description", 240));
            copyText(spec, data, "iconId", 120); copyText(spec, data, "boundaryType", 80); copyText(spec, data, "provider", 32);
        }
        for (int index = 0; index < specs.size(); index++) {
            String containerKey = optional(specs.get(index), "containerKey", 48);
            if (!containerKey.isBlank() && ids.containsKey(containerKey)) ((ObjectNode) nodes.get(index).path("data")).put("containerId", ids.get(containerKey));
        }
        Set<String> uniqueEdges = new HashSet<>();
        for (JsonNode connection : connections) {
            String source = ids.get(required(connection, "source", 48));
            String target = ids.get(required(connection, "target", 48));
            if (source == null || target == null || source.equals(target) || !uniqueEdges.add(source + ">" + target)) continue;
            ObjectNode edge = edges.addObject();
            edge.put("id", UUID.randomUUID().toString()).put("source", source).put("target", target).put("type", "editable");
            String label = optional(connection, "label", 80);
            if (!label.isBlank()) edge.put("label", label);
            ObjectNode data = edge.putObject("data").put("routing", "smoothstep");
            copyText(connection, data, "protocol", 32); copyText(connection, data, "port", 16); copyText(connection, data, "direction", 20); copyText(connection, data, "description", 240);
            if (connection.hasNonNull("async")) data.put("async", connection.get("async").asBoolean());
            if (connection.hasNonNull("encrypted")) data.put("encrypted", connection.get("encrypted").asBoolean());
        }
        canvas.putObject("viewport").put("x", 0).put("y", 0).put("zoom", 1);
        return new GenerateDiagramResponse(canvas, optional(specification, "summary", 240));
    }

    private String required(JsonNode node, String field, int maxLength) {
        String value = optional(node, field, maxLength);
        if (value.isBlank()) throw new IllegalArgumentException("Missing " + field);
        return value;
    }

    private String optional(JsonNode node, String field, int maxLength) {
        String value = node.path(field).asText("").trim();
        if (value.length() > maxLength) throw new IllegalArgumentException("Invalid " + field);
        return value;
    }

    private void copyText(JsonNode source, ObjectNode target, String field, int maxLength) {
        String value = optional(source, field, maxLength);
        if (!value.isBlank()) target.put(field, value);
    }
}
