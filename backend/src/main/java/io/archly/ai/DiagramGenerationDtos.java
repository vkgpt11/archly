package io.archly.ai;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class DiagramGenerationDtos {
    private DiagramGenerationDtos() {}

    public record GenerateDiagramRequest(
        @NotBlank @Size(max = 4_000) String prompt,
        @Size(max = 1_000_000) String currentCanvas,
        @Size(max = 100_000) String documentation,
        @Size(max = 100_000) String catalogue,
        @Size(max = 20) String mode,
        @Size(max = 50_000) String selectedSubsystem
    ) {}

    public record GenerateDiagramResponse(JsonNode canvas, String summary) {}
}
