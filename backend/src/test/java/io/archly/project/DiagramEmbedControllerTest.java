package io.archly.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DiagramEmbedControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoBean JwtDecoder decoder;
    @MockitoBean DiagramPngRenderer renderer;

    @Test void embedsExposeOnlySavedDiagramAndCannotReadDocumentsOrWrite() throws Exception {
        var owner = jwt().jwt(t -> t.claim("email", "embed-owner@gmail.com"));
        String created = mvc.perform(post("/api/projects").with(owner).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Private project name\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var project = mapper.readTree(created);
        String id = project.path("id").asText();
        var content = mapper.createObjectNode().put("name", "Private project name").put("markdown", "<p>PRIVATE DOCUMENT</p>")
            .put("revision", project.path("revision").asLong())
            .put("canvasJson", "{\"schemaVersion\":1,\"nodes\":[{\"id\":\"service\",\"type\":\"architecture\",\"position\":{\"x\":0,\"y\":0},\"data\":{\"kind\":\"service\",\"label\":\"Public service\"}}],\"edges\":[],\"diagramCode\":\"# PRIVATE SOURCE\",\"diagramModules\":[],\"diagramSnapshots\":[]}");
        String saved = mvc.perform(put("/api/projects/" + id).with(owner).contentType(MediaType.APPLICATION_JSON).content(content.toString()))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String link = mvc.perform(post("/api/projects/" + id + "/shares").with(owner).contentType(MediaType.APPLICATION_JSON).content("{\"permission\":\"EMBED\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var share = mapper.readTree(link); String token = share.path("token").asText();
        mvc.perform(get("/api/embeds/" + token)).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.canvas.nodes[0].data.label").value("Public service"))
            .andExpect(jsonPath("$.canvas.diagramCode").doesNotExist())
            .andExpect(jsonPath("$.canvas.diagramSnapshots").doesNotExist())
            .andExpect(jsonPath("$.markdown").doesNotExist()).andExpect(jsonPath("$.name").doesNotExist())
            .andExpect(content().string(not(containsString("PRIVATE"))));
        mvc.perform(get("/api/embeds/" + token).cookie(new jakarta.servlet.http.Cookie("ARCHLY_AUTH", "expired")))
            .andExpect(status().isOk());
        verifyNoInteractions(decoder);
        mvc.perform(get("/api/shares/" + token)).andExpect(status().isNotFound());
        mvc.perform(put("/api/shares/" + token).contentType(MediaType.APPLICATION_JSON).content(content.toString())).andExpect(status().isForbidden());
        mvc.perform(get("/api/projects/" + id).with(jwt().jwt(t -> t.claim("email", "other@gmail.com")))).andExpect(status().isNotFound());
        content.put("revision", mapper.readTree(saved).path("revision").asLong());
        content.put("canvasJson", content.path("canvasJson").asText().replace("Public service", "New saved label"));
        mvc.perform(put("/api/projects/" + id).with(owner).contentType(MediaType.APPLICATION_JSON).content(content.toString())).andExpect(status().isOk());
        mvc.perform(get("/api/embeds/" + token)).andExpect(jsonPath("$.canvas.nodes[0].data.label").value("New saved label"));
        mvc.perform(delete("/api/projects/" + id + "/shares/" + share.path("id").asText()).with(owner)).andExpect(status().isNoContent());
        mvc.perform(get("/api/embeds/" + token)).andExpect(status().isNotFound());
        mvc.perform(get("/api/embeds/" + token + "/image.png")).andExpect(status().isNotFound());
    }

    @Test void scopeRemainsBoundWhenTheOwnerSavesAnotherView() throws Exception {
        var owner = jwt().jwt(t -> t.claim("email", "scope-owner@gmail.com"));
        var created = mapper.readTree(mvc.perform(post("/api/projects").with(owner).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Scope test\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String id = created.path("id").asText();
        var share = mapper.readTree(mvc.perform(post("/api/projects/" + id + "/shares").with(owner).contentType(MediaType.APPLICATION_JSON).content("{\"permission\":\"EMBED\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String token = share.path("token").asText();
        var content = mapper.createObjectNode().put("name", "Scope test").put("markdown", "")
            .put("revision", created.path("revision").asLong()).put("canvasJson", "{\"nodes\":[],\"edges\":[],\"activeView\":\"another\",\"diagramCode\":\"# private source\"}");
        mvc.perform(put("/api/projects/" + id).with(owner).contentType(MediaType.APPLICATION_JSON).content(content.toString())).andExpect(status().isOk());
        when(renderer.project(any(), eq(""), eq(""))).thenReturn(mapper.readTree("{\"nodes\":[{\"id\":\"bound\",\"position\":{\"x\":0,\"y\":0},\"data\":{\"label\":\"Bound scope\"}}],\"edges\":[]}"));
        mvc.perform(get("/api/embeds/" + token)).andExpect(status().isOk()).andExpect(jsonPath("$.canvas.nodes").isArray())
            .andExpect(jsonPath("$.view").value(""));
    }
}
