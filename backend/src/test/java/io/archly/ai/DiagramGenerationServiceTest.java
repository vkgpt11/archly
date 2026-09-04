package io.archly.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import static org.mockito.Mockito.mock;

class DiagramGenerationServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final DiagramGenerationService service = new DiagramGenerationService(
        RestClient.builder(), mapper, "https://example.invalid/v1", mock(UserLlmSettingsService.class)
    );

    @Test
    void convertsModelSpecificationToEditableArchlyCanvas() throws Exception {
        JsonNode specification = mapper.readTree("""
            {
              "summary": "A web application with durable storage",
              "nodes": [
                {"key":"web","label":"Web app","description":"Browser client","kind":"web"},
                {"key":"api","label":"API","description":"Application service","kind":"service"},
                {"key":"db","label":"PostgreSQL","description":"Primary data store","kind":"database"}
              ],
              "edges": [
                {"source":"web","target":"api","label":"HTTPS"},
                {"source":"api","target":"db","label":"SQL"}
              ]
            }
            """);

        var result = service.toCanvas(specification);

        assertThat(result.summary()).isEqualTo("A web application with durable storage");
        assertThat(result.canvas().path("schemaVersion").asInt()).isEqualTo(1);
        assertThat(result.canvas().path("nodes")).hasSize(3);
        assertThat(result.canvas().path("edges")).hasSize(2);
        assertThat(result.canvas().path("nodes").get(0).path("type").asText()).isEqualTo("architecture");
        assertThat(result.canvas().path("edges").get(0).path("type").asText()).isEqualTo("editable");
        assertThat(result.canvas().path("edges").get(0).path("source").asText())
            .isEqualTo(result.canvas().path("nodes").get(0).path("id").asText());
    }

    @Test
    void suppliesStrictStructuredOutputSchemaToProvider() {
        JsonNode body = service.requestBody("test-model", "Build a payment platform");

        assertThat(body.path("model").asText()).isEqualTo("test-model");
        assertThat(body.path("store").asBoolean()).isFalse();
        assertThat(body.path("text").path("format").path("type").asText()).isEqualTo("json_schema");
        assertThat(body.path("text").path("format").path("strict").asBoolean()).isTrue();
    }
}
