package io.archly.project;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
    }

    @Test
    void returnsClearGmailOnlyResponseForRejectedBearerToken() throws Exception {
        when(jwtDecoder.decode("rejected-google-token"))
            .thenThrow(new JwtValidationException("Rejected Google identity",
                List.of(new OAuth2Error("gmail_account_required"))));

        mvc.perform(get("/api/auth/session")
                .header("Authorization", "Bearer rejected-google-token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("gmail_account_required"))
            .andExpect(jsonPath("$.message").value(
                "Archly supports only verified personal @gmail.com accounts."));
    }

    @Test
    void returnsAuthenticatedGmailSession() throws Exception {
        mvc.perform(get("/api/auth/session")
                .with(jwt().jwt(token -> token.claim("email", "owner@gmail.com"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("owner@gmail.com"));
    }

    @Test
    void acceptsPreflightFromLocalIpUi() throws Exception {
        mvc.perform(options("/api/projects")
                .header("Origin", "http://127.0.0.1:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "authorization,content-type"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:5173"));
    }

    @Test
    void exposesOpenApiDocumentationWithoutAuthentication() throws Exception {
        mvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.info.title").value("Archly API"))
            .andExpect(jsonPath("$.paths['/api/projects'].get").exists())
            .andExpect(jsonPath("$.components.securitySchemes.bearerAuth").exists());
    }

    @Test
    void createsAndListsOwnedProject() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "owner@gmail.com"));
        mvc.perform(post("/api/projects")
                .with(identity)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Payments architecture\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Payments architecture"))
            .andExpect(jsonPath("$.revision").value(0));

        mvc.perform(get("/api/projects").with(identity))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].name").value("Payments architecture"))
            .andExpect(jsonPath("$.items[0].canvasJson").doesNotExist())
            .andExpect(jsonPath("$.items[0].markdown").doesNotExist())
            .andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void duplicatesProjectAsIndependentRevisionZeroCopy() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "copy@gmail.com"));
        String createdBody = mvc.perform(post("/api/projects").with(identity)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Payments\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(createdBody).get("id").asText();
        String update = """
            {"name":"Payments","canvasJson":"{\\"nodes\\":[{\\"id\\":\\"api\\",\\"position\\":{\\"x\\":0,\\"y\\":0},\\"data\\":{}}],\\"edges\\":[]}","markdown":"<p>Design</p>","revision":0}
            """;
        mvc.perform(put("/api/projects/{id}", id).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content(update)).andExpect(status().isOk());

        mvc.perform(post("/api/projects/{id}/duplicate", id).with(identity))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.not(id)))
            .andExpect(jsonPath("$.name").value("Payments — Copy"))
            .andExpect(jsonPath("$.revision").value(0))
            .andExpect(jsonPath("$.canvasJson").value("{\"nodes\":[{\"id\":\"api\",\"position\":{\"x\":0,\"y\":0},\"data\":{}}],\"edges\":[]}"))
            .andExpect(jsonPath("$.markdown").value("<p>Design</p>"));
    }

    @Test
    void rejectsAStaleConcurrentUpdateWithoutOverwritingTheWinner() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "concurrent@gmail.com"));
        var createdBody = mvc.perform(post("/api/projects")
                .with(identity)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Concurrent project\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        JsonNode created = objectMapper.readTree(createdBody);
        String id = created.get("id").asText();
        String firstUpdate = """
            {"name":"Concurrent project","canvasJson":"{\\"nodes\\":[],\\"edges\\":[]}","markdown":"<p>Tab A wins</p>","revision":0}
            """;
        String staleUpdate = """
            {"name":"Concurrent project","canvasJson":"{\\"nodes\\":[],\\"edges\\":[]}","markdown":"<p>Tab B stale</p>","revision":0}
            """;

        mvc.perform(put("/api/projects/{id}", id).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content(firstUpdate))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.revision").value(1));

        mvc.perform(put("/api/projects/{id}", id).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content(staleUpdate))
            .andExpect(status().isConflict());

        mvc.perform(get("/api/projects/{id}", id).with(identity))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.revision").value(1))
            .andExpect(jsonPath("$.markdown").value("<p>Tab A wins</p>"));
    }

    @Test
    void rejectsMalformedUnsupportedAndStructurallyInvalidCanvasData() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "canvas-validation@gmail.com"));
        String created = mvc.perform(post("/api/projects").with(identity)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Validated canvas\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("id").asText();

        List<String> invalidCanvases = List.of(
            "not-json",
            "[]",
            "{\"schemaVersion\":2,\"nodes\":[],\"edges\":[]}",
            "{\"schemaVersion\":1,\"nodes\":{},\"edges\":[]}",
            "{\"schemaVersion\":1,\"nodes\":[{\"id\":\"api\",\"data\":{}}],\"edges\":[]}",
            "{\"schemaVersion\":1,\"nodes\":[],\"edges\":[{\"id\":\"edge\",\"source\":\"missing\",\"target\":\"missing\"}]}"
        );
        for (String invalidCanvas : invalidCanvases) {
            var update = objectMapper.createObjectNode().put("name", "Validated canvas")
                .put("canvasJson", invalidCanvas).put("markdown", "<p>Safe</p>").put("revision", 0);
            mvc.perform(put("/api/projects/{id}", id).with(identity)
                    .contentType(MediaType.APPLICATION_JSON).content(update.toString()))
                .andExpect(status().isBadRequest());
        }

        var nested = objectMapper.createObjectNode();
        com.fasterxml.jackson.databind.node.ObjectNode cursor = nested;
        for (int level = 0; level < 25; level++) {
            var child = objectMapper.createObjectNode();
            cursor.set("child", child);
            cursor = child;
        }
        var node = objectMapper.createObjectNode().put("id", "api");
        node.set("position", objectMapper.createObjectNode().put("x", 0).put("y", 0));
        node.set("data", nested);
        var canvas = objectMapper.createObjectNode().put("schemaVersion", 1);
        canvas.set("nodes", objectMapper.createArrayNode().add(node));
        canvas.set("edges", objectMapper.createArrayNode());
        var nestedUpdate = objectMapper.createObjectNode().put("name", "Validated canvas")
            .put("canvasJson", canvas.toString()).put("markdown", "<p>Safe</p>").put("revision", 0);
        mvc.perform(put("/api/projects/{id}", id).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content(nestedUpdate.toString()))
            .andExpect(status().isBadRequest());

        mvc.perform(get("/api/projects/{id}", id).with(identity))
            .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(0));
    }

    @Test
    void sanitizesRichTextBeforeItIsStoredAndReturned() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "sanitizer@gmail.com"));
        var createdBody = mvc.perform(post("/api/projects")
                .with(identity)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Sanitizer project\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(createdBody).get("id").asText();
        String unsafe = "<p onclick=\"alert(1)\">Safe</p><img src=\"x\" onerror=\"alert(1)\">"
            + "<p><a href=\"javascript:alert(1)\">Unsafe</a></p>";
        var update = objectMapper.createObjectNode()
            .put("name", "Sanitizer project")
            .put("canvasJson", "{\"nodes\":[],\"edges\":[]}")
            .put("markdown", unsafe)
            .put("revision", 0);

        mvc.perform(put("/api/projects/{id}", id).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content(update.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.markdown").value("<p>Safe</p><p><a>Unsafe</a></p>"));

        mvc.perform(get("/api/projects/{id}", id).with(identity))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.markdown").value("<p>Safe</p><p><a>Unsafe</a></p>"));
    }

    @Test
    void organizesProjectsIntoFoldersAndArchive() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "organize@gmail.com"));
        String created = mvc.perform(post("/api/projects").with(identity).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Platform\"}"))
            .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("id").asText();

        mvc.perform(put("/api/projects/{id}/organization", id).with(identity).contentType(MediaType.APPLICATION_JSON)
                .content("{\"folder\":\"Production\",\"archived\":true,\"revision\":0}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.folder").value("Production"))
            .andExpect(jsonPath("$.archived").value(true));

        mvc.perform(put("/api/projects/{id}/organization", id).with(identity).contentType(MediaType.APPLICATION_JSON)
                .content("{\"folder\":\"Stale\",\"archived\":false,\"revision\":0}"))
            .andExpect(status().isConflict());

        mvc.perform(put("/api/projects/{id}/organization", id).with(identity).contentType(MediaType.APPLICATION_JSON)
                .content("{\"folder\":\"Missing revision\",\"archived\":false}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void enforcesReadOnlyShareAndRevocationWithoutAuthentication() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "share@gmail.com"));
        String created = mvc.perform(post("/api/projects").with(identity).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Shared architecture\"}"))
            .andReturn().getResponse().getContentAsString();
        String projectId = objectMapper.readTree(created).get("id").asText();
        String shareBody = mvc.perform(post("/api/projects/{id}/shares", projectId).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content("{\"permission\":\"READ\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode share = objectMapper.readTree(shareBody);
        String token = share.get("token").asText();
        String shareId = share.get("id").asText();

        mvc.perform(get("/api/shares/{token}", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.permission").value("READ"))
            .andExpect(jsonPath("$.project.name").value("Shared architecture"));
        mvc.perform(put("/api/shares/{token}", token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Hacked\",\"canvasJson\":\"{\\\"nodes\\\":[],\\\"edges\\\":[]}\",\"markdown\":\"<p>x</p>\",\"revision\":0}"))
            .andExpect(status().isForbidden());
        mvc.perform(delete("/api/projects/{projectId}/shares/{shareId}", projectId, shareId).with(identity))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/shares/{token}", token)).andExpect(status().isNotFound());
    }

    @Test
    void rejectsMissingSharePermissionAsBadRequest() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "missing-permission@gmail.com"));
        String created = mvc.perform(post("/api/projects").with(identity).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Permission validation\"}"))
            .andReturn().getResponse().getContentAsString();
        String projectId = objectMapper.readTree(created).get("id").asText();

        mvc.perform(post("/api/projects/{id}/shares", projectId).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void editableShareCanUpdateButCannotBypassRevisionChecks() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "edit-share@gmail.com"));
        String created = mvc.perform(post("/api/projects").with(identity).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Editable architecture\"}"))
            .andReturn().getResponse().getContentAsString();
        String projectId = objectMapper.readTree(created).get("id").asText();
        String shareBody = mvc.perform(post("/api/projects/{id}/shares", projectId).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content("{\"permission\":\"EDIT\"}"))
            .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(shareBody).get("token").asText();
        String update = "{\"name\":\"Edited anonymously\",\"canvasJson\":\"{\\\"nodes\\\":[],\\\"edges\\\":[]}\",\"markdown\":\"<p>Edited</p>\",\"revision\":0}";

        mvc.perform(put("/api/shares/{token}", token).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk()).andExpect(jsonPath("$.project.revision").value(1));
        mvc.perform(put("/api/shares/{token}", token).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isConflict());
    }

    @Test
    void preventsCrossOwnerAccessAcrossEveryProjectAndShareOperation() throws Exception {
        var owner = jwt().jwt(token -> token.claim("email", "alice@gmail.com"));
        var intruder = jwt().jwt(token -> token.claim("email", "bob@gmail.com"));
        String created = mvc.perform(post("/api/projects").with(owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Alice private design\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String projectId = objectMapper.readTree(created).get("id").asText();
        String shareBody = mvc.perform(post("/api/projects/{id}/shares", projectId).with(owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"permission\":\"READ\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String shareId = objectMapper.readTree(shareBody).get("id").asText();

        mvc.perform(get("/api/projects/{id}", projectId).with(intruder)).andExpect(status().isNotFound());
        mvc.perform(put("/api/projects/{id}", projectId).with(intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Stolen\",\"canvasJson\":\"{\\\"nodes\\\":[],\\\"edges\\\":[]}\",\"markdown\":\"<p>x</p>\",\"revision\":0}"))
            .andExpect(status().isNotFound());
        mvc.perform(put("/api/projects/{id}/organization", projectId).with(intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"folder\":\"Stolen\",\"archived\":true,\"revision\":0}"))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/projects/{id}/duplicate", projectId).with(intruder))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/api/projects/{id}", projectId).with(intruder))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/projects/{id}/shares", projectId).with(intruder))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/projects/{id}/shares", projectId).with(intruder)
                .contentType(MediaType.APPLICATION_JSON).content("{\"permission\":\"EDIT\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/api/projects/{projectId}/shares/{shareId}", projectId, shareId).with(intruder))
            .andExpect(status().isNotFound());

        mvc.perform(get("/api/projects/{id}", projectId).with(owner))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice private design"));
        mvc.perform(get("/api/projects/{id}/shares", projectId).with(owner))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(shareId));
    }

    @Test
    void deletesAnOwnedProjectAndInvalidatesItsShareLinks() throws Exception {
        var owner = jwt().jwt(token -> token.claim("email", "delete-owner@gmail.com"));
        String created = mvc.perform(post("/api/projects").with(owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Disposable design\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String projectId = objectMapper.readTree(created).get("id").asText();
        String shared = mvc.perform(post("/api/projects/{id}/shares", projectId).with(owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"permission\":\"READ\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String shareToken = objectMapper.readTree(shared).get("token").asText();

        mvc.perform(delete("/api/projects/{id}", projectId).with(owner))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/projects/{id}", projectId).with(owner))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/shares/{token}", shareToken))
            .andExpect(status().isNotFound());
    }
}
