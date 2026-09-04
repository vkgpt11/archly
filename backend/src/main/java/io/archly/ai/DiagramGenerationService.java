package io.archly.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.archly.ai.DiagramGenerationDtos.GenerateDiagramResponse;
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
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class DiagramGenerationService {
    private static final Set<String> KINDS = Set.of(
        "service", "web", "mobile", "database", "cache", "queue", "storage", "external", "actor", "custom"
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
        UserLlmSettingsService.Configuration configuration = settings.requireConfiguration(userSubject);
        JsonNode response;
        try {
            response = client.post().uri("/responses")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + configuration.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody(configuration.model(), prompt))
                .retrieve()
                .body(JsonNode.class);
        } catch (RestClientException exception) {
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

    ObjectNode requestBody(String model, String prompt) {
        ObjectNode root = mapper.createObjectNode();
        root.put("model", model);
        root.put("store", false);
        root.put("instructions", "Design a clear, technically credible architecture diagram. Use short labels, include only components justified by the request, and connect every non-actor component where practical. Return only the requested schema.");
        root.put("input", prompt);
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
        nodeItem.putArray("required").add("key").add("label").add("description").add("kind");
        ObjectNode nodeProps = nodeItem.putObject("properties");
        nodeProps.putObject("key").put("type", "string").put("maxLength", 48);
        nodeProps.putObject("label").put("type", "string").put("maxLength", 80);
        nodeProps.putObject("description").put("type", "string").put("maxLength", 240);
        ArrayNode kinds = nodeProps.putObject("kind").put("type", "string").putArray("enum");
        KINDS.forEach(kinds::add);
        ObjectNode edges = properties.putObject("edges");
        edges.put("type", "array").put("maxItems", MAX_EDGES);
        ObjectNode edgeItem = edges.putObject("items");
        edgeItem.put("type", "object").put("additionalProperties", false);
        edgeItem.putArray("required").add("source").add("target").add("label");
        ObjectNode edgeProps = edgeItem.putObject("properties");
        edgeProps.putObject("source").put("type", "string").put("maxLength", 48);
        edgeProps.putObject("target").put("type", "string").put("maxLength", 48);
        edgeProps.putObject("label").put("type", "string").put("maxLength", 80);
        return node;
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
            edge.putObject("data").put("routing", "smoothstep");
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
}
