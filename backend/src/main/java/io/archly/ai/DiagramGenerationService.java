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
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Service
public class DiagramGenerationService {
    private static final Set<String> KINDS = Set.of(
        "service", "web", "mobile", "database", "cache", "queue", "storage", "external", "actor", "custom", "container"
    );
    private static final int MAX_NODES = 40;
    private static final int MAX_EDGES = 80;

    private final AiProviderClient client;
    private final ObjectMapper mapper;
    private final UserLlmSettingsService settings;
    private final Set<String> allowedModels;
    private final AiUsageService usage;
    private final AiPricing pricing;
    private final AiRequestStore requests;
    private final AiGenerationRateLimiter limiter;
    private final Duration overallTimeout;

    public DiagramGenerationService(AiProviderClient client, ObjectMapper mapper, UserLlmSettingsService settings,
        @Value("${archly.ai.allowed-models:gpt-4.1-mini}") Set<String> allowedModels,
        AiUsageService usage, AiPricing pricing, AiRequestStore requests, AiGenerationRateLimiter limiter,
        @Value("${archly.ai.overall-timeout:50s}") Duration overallTimeout) {
        this.client=client; this.mapper=mapper; this.settings=settings; this.allowedModels=allowedModels;
        this.usage=usage; this.pricing=pricing; this.requests=requests; this.limiter=limiter; this.overallTimeout=overallTimeout;
        if (overallTimeout.isNegative() || overallTimeout.isZero() || overallTimeout.compareTo(Duration.ofSeconds(50)) > 0)
            throw new IllegalArgumentException("AI overall timeout must be positive and at most 50 seconds, below the browser timeout.");
    }

    public GenerateDiagramResponse generate(String user, String prompt) {
        return generate(user, new GenerateDiagramRequest(prompt, null, null, null, "create", null));
    }
    public GenerateDiagramResponse generate(String user, GenerateDiagramRequest request) {
        return generate(user, request, UUID.randomUUID().toString());
    }
    public GenerateDiagramResponse generate(String user, GenerateDiagramRequest request, String key) {
        AiDeadline deadline = new AiDeadline(overallTimeout);
        final String fingerprint;
        try { fingerprint = AiRequestStore.hash(mapper.writeValueAsString(request)); }
        catch (Exception exception) { throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid AI request."); }
        var claim = requests.begin(user, key, fingerprint, overallTimeout);
        while (!claim.owned()) {
            if (claim.result() != null) return claim.result();
            if (claim.status() != null) throw new ResponseStatusException(org.springframework.http.HttpStatus.valueOf(claim.status()), claim.message());
            deadline.pause(Duration.ofMillis(100));
            claim = requests.read(user, claim.id(), fingerprint);
            if (claim == null) throw new ResponseStatusException(org.springframework.http.HttpStatus.GONE, "This AI request expired. Use a new key.");
        }
        String id = claim.id();
        try { return generateOwned(user, request, id, deadline); }
        catch (ResponseStatusException failure) { requests.fail(user, id, failure); throw failure; }
        catch (RuntimeException failure) {
            var safe = new ResponseStatusException(BAD_GATEWAY, "The AI request could not be completed.");
            requests.fail(user, id, safe); throw safe;
        }
    }
    private GenerateDiagramResponse generateOwned(String user, GenerateDiagramRequest request, String id, AiDeadline deadline) {
        long started = System.nanoTime();
        var configuration = settings.requireConfiguration(user);
        if (!allowedModels.contains(configuration.model())) throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "The configured AI model is not allowed.");
        var accounting = new AiUsageAccumulator(pricing.require(configuration.model()));
        limiter.check(user, configuration.model()); usage.ensureBudget(user);
        ObjectNode body = requestBody(configuration.model(), request);
        long inputBound = Math.max(32_000, body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8).length);
        usage.reserve(id,user,Math.multiplyExact(6,pricing.require(configuration.model()).cost(inputBound,0,8000)));
        String outcome = "FAILED";
        try {
            JsonNode response = providerRequest(configuration, body, id + "-initial", deadline, accounting, false);
            GenerateDiagramResponse result;
            try { result = parseResult(response, deadline); }
            catch (IllegalArgumentException | com.fasterxml.jackson.core.JsonProcessingException malformed) {
                String text = extractOutputText(response);
                ObjectNode repair = requestBody(configuration.model(), new GenerateDiagramRequest("Repair this malformed response without changing its intended architecture:\n" + text.substring(0, Math.min(3_800, text.length())), null, null, null, "create", null));
                JsonNode repaired = providerRequest(configuration, repair, id + "-repair", deadline, accounting, true);
                try { result = parseResult(repaired, deadline); }
                catch (IllegalArgumentException | com.fasterxml.jackson.core.JsonProcessingException failure) {
                    throw new ResponseStatusException(BAD_GATEWAY, "The AI provider returned an invalid diagram after one repair attempt.");
                }
            }
            deadline.remaining();
            requests.complete(user, id, result);
            settings.recordSuccess(user); outcome = "SUCCESS"; return result;
        } catch (ResponseStatusException failure) {
            outcome = failure.getStatusCode().value() == 504 ? "DEADLINE" : failure.getStatusCode().value() == 408 ? "CANCELLED" : "FAILED";
            settings.recordFailure(user, outcome); throw failure;
        } finally {
            usage.record(id, user, configuration.model(), accounting, outcome, pricing.version, (System.nanoTime()-started)/1_000_000);
        }
    }
    private GenerateDiagramResponse parseResult(JsonNode response, AiDeadline deadline) throws com.fasterxml.jackson.core.JsonProcessingException {
        deadline.remaining();
        if ("incomplete".equals(response.path("status").asText())) throw new ResponseStatusException(BAD_GATEWAY, "The AI provider returned an incomplete response. Try a smaller request.");
        for (JsonNode item : response.path("output")) for (JsonNode content : item.path("content"))
            if ("refusal".equals(content.path("type").asText())) throw new ResponseStatusException(BAD_GATEWAY, "The AI provider declined this request.");
        var result = toCanvas(mapper.readTree(extractOutputText(response)));
        deadline.remaining(); return result;
    }
    private JsonNode providerRequest(UserLlmSettingsService.Configuration configuration, ObjectNode body, String key,
            AiDeadline deadline, AiUsageAccumulator accounting, boolean repair) {
        long bytes = body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
        return client.request(configuration, body, key, deadline,
            response -> accounting.add(response, bytes, body.path("max_output_tokens").asLong(), repair));
    }
    public void testConnection(String user, String model, String apiKey) {
        AiDeadline deadline = new AiDeadline(overallTimeout);
        var saved = apiKey == null || apiKey.isBlank() ? settings.requireConfiguration(user) : new UserLlmSettingsService.Configuration(model.trim(), apiKey.trim());
        String selectedModel = model == null || model.isBlank() ? saved.model() : model.trim();
        if (!allowedModels.contains(selectedModel)) throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "The configured AI model is not allowed.");
        var accounting = new AiUsageAccumulator(pricing.require(selectedModel));
        usage.ensureBudget(user);
        String id = AiRequestStore.hash(user + UUID.randomUUID());
        usage.reserve(id,user,Math.multiplyExact(3,pricing.require(selectedModel).cost(1000,0,16)));
        long started = System.nanoTime(); String outcome = "FAILED";
        try {
            providerRequest(new UserLlmSettingsService.Configuration(selectedModel, saved.apiKey()), mapper.createObjectNode().put("model", selectedModel).put("input", "Reply with OK.").put("store", false).put("max_output_tokens", 16), id, deadline, accounting, false);
            if (apiKey == null || apiKey.isBlank()) settings.recordSuccess(user);
            settings.recordTest(user, true); outcome = "SUCCESS";
        } catch (ResponseStatusException failure) {
            if (apiKey == null || apiKey.isBlank()) settings.recordFailure(user, "CONNECTION_TEST_FAILED");
            settings.recordTest(user, false); throw failure;
        } finally { usage.record(id, user, selectedModel, accounting, outcome, pricing.version, (System.nanoTime()-started)/1_000_000); }
    }

    ObjectNode requestBody(String model, String prompt) {
        return requestBody(model, new GenerateDiagramRequest(prompt, null, null, null, "create", null));
    }

    ObjectNode requestBody(String model, GenerateDiagramRequest request) {
        ObjectNode root = mapper.createObjectNode();
        root.put("model", model);
        root.put("store", false);
        root.put("max_output_tokens", 8_000);
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
                    String text = content.get("text").asText(); if (text.length() > 1_000_000) throw new IllegalArgumentException("AI response too large"); return text;
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
