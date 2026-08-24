package io.archly.project;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean JwtDecoder jwtDecoder;

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
            .andExpect(jsonPath("$[0].name").value("Payments architecture"));
    }

    @Test
    void duplicatesProjectAsIndependentRevisionZeroCopy() throws Exception {
        var identity = jwt().jwt(token -> token.claim("email", "copy@gmail.com"));
        String createdBody = mvc.perform(post("/api/projects").with(identity)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Payments\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(createdBody).get("id").asText();
        String update = """
            {"name":"Payments","canvasJson":"{\\"nodes\\":[{\\"id\\":\\"api\\"}],\\"edges\\":[]}","markdown":"<p>Design</p>","revision":0}
            """;
        mvc.perform(put("/api/projects/{id}", id).with(identity)
                .contentType(MediaType.APPLICATION_JSON).content(update)).andExpect(status().isOk());

        mvc.perform(post("/api/projects/{id}/duplicate", id).with(identity))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.not(id)))
            .andExpect(jsonPath("$.name").value("Payments — Copy"))
            .andExpect(jsonPath("$.revision").value(0))
            .andExpect(jsonPath("$.canvasJson").value("{\"nodes\":[{\"id\":\"api\"}],\"edges\":[]}"))
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
}
