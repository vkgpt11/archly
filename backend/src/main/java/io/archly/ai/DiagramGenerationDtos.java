package io.archly.ai;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class DiagramGenerationDtos {
    private DiagramGenerationDtos() {}

    public record GenerateDiagramRequest(
        @NotBlank @Size(max = 4_000) String prompt
    ) {}

    public record GenerateDiagramResponse(JsonNode canvas, String summary) {}
}
