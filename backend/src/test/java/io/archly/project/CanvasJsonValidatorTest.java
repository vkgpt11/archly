package io.archly.project;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class CanvasJsonValidatorTest {
    private final CanvasJsonValidator validator = new CanvasJsonValidator(new ObjectMapper());

    @Test
    void acceptsBoundedProjectModules() {
        assertDoesNotThrow(() -> validator.validate("""
            {"schemaVersion":1,"nodes":[],"edges":[],"diagramModules":[
              {"id":"modules/shared","version":"1.2.0","source":"export service api \\\"API\\\""}
            ]}
            """));
    }

    @Test
    void rejectsUnsafeModuleIdentifiers() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> validator.validate("""
            {"schemaVersion":1,"nodes":[],"edges":[],"diagramModules":[
              {"id":"../secret","version":"1","source":"x"}
            ]}
            """));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void acceptsBoundedNamedViewStateAndRejectsInvalidCoordinates() {
        assertDoesNotThrow(() -> validator.validate("""
            {"schemaVersion":1,"nodes":[],"edges":[],"activeView":"checkout","diagramViewStates":{"checkout":{"positions":{"api":{"x":10,"y":20}},"viewport":{"x":0,"y":0,"zoom":1}}}}
            """));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> validator.validate("""
            {"schemaVersion":1,"nodes":[],"edges":[],"diagramViewStates":{"checkout":{"positions":{"api":{"x":"bad","y":20}}}}}
            """));
        assertEquals(400, error.getStatusCode().value());
    }
}
