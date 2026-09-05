package io.archly.admin;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import io.archly.analytics.ArchlyUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminMetricsControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder jwtDecoder;
    @Autowired ArchlyUserRepository users;
    @Autowired ObjectMapper objectMapper;

    @Test
    void deniesNormalAuthenticatedUsers() throws Exception {
        mvc.perform(get("/api/admin/metrics/summary").with(jwt().jwt(token -> token
                .subject("normal-subject").claim("email", "normal@gmail.com"))))
            .andExpect(status().isForbidden());
    }

    @Test
    void returnsNoStoreAggregateMetricsForConfiguredAdministrator() throws Exception {
        var admin = jwt().jwt(token -> token.subject("admin-subject").claim("email", "admin@gmail.com"));
        mvc.perform(get("/api/auth/session").with(admin).header("X-Archly-Session", "browser-session"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.isAdmin").value(true));
        mvc.perform(get("/api/admin/metrics/summary?period=30d").with(admin))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.timezone").value("UTC"))
            .andExpect(jsonPath("$.users.total").value(1));
    }

    @Test
    void rejectsUnboundedAnalyticsQueries() throws Exception {
        var admin = jwt().jwt(token -> token.subject("admin-subject").claim("email", "admin@gmail.com"));
        mvc.perform(get("/api/admin/metrics/summary?period=all").with(admin))
            .andExpect(status().isBadRequest());
    }

    @Test
    void deduplicatesRepeatedSessionEstablishment() throws Exception {
        var admin = jwt().jwt(token -> token.subject("admin-subject").claim("email", "admin@gmail.com"));
        mvc.perform(get("/api/auth/session").with(admin).header("X-Archly-Session", "same-session")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/session").with(admin).header("X-Archly-Session", "same-session")).andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(users.findByGoogleSubject("admin-subject").orElseThrow().getLoginCount()).isEqualTo(1);
    }

    @Test
    void exportsAggregateCsvWithoutIdentityData() throws Exception {
        var admin = jwt().jwt(token -> token.subject("admin-subject").claim("email", "admin@gmail.com"));
        mvc.perform(get("/api/auth/session").with(admin).header("X-Archly-Session", "csv-session")).andExpect(status().isOk());
        mvc.perform(get("/api/admin/metrics/export?period=7d").with(admin))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "text/csv"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(
                org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("total_users,1"), org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("admin@gmail.com")))));
    }

    @Test
    void reconcilesSeededLifecycleTotalsWithoutLeakingProhibitedContent() throws Exception {
        var admin = jwt().jwt(token -> token.subject("reconcile-subject").claim("email", "admin@gmail.com"));
        mvc.perform(get("/api/auth/session").with(admin).header("X-Archly-Session", "reconcile-session"))
            .andExpect(status().isOk());
        String created = mvc.perform(post("/api/projects").with(admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"PROHIBITED_PRIVATE_PROJECT_NAME\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("id").asText();
        mvc.perform(put("/api/projects/{id}", id).with(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"PROHIBITED_PRIVATE_PROJECT_NAME\",\"canvasJson\":\"{\\\"nodes\\\":[],\\\"edges\\\":[]}\",\"markdown\":\"<p>PROHIBITED_DOCUMENT_TEXT</p>\",\"revision\":0}"))
            .andExpect(status().isOk());
        String duplicate = mvc.perform(post("/api/projects/{id}/duplicate", id).with(admin))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(delete("/api/projects/{id}", objectMapper.readTree(duplicate).get("id").asText()).with(admin))
            .andExpect(status().isNoContent());

        String summary = mvc.perform(get("/api/admin/metrics/summary?period=24h").with(admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.users.total").value(1))
            .andExpect(jsonPath("$.diagrams.current").value(1))
            .andExpect(jsonPath("$.diagrams.created").value(2))
            .andExpect(jsonPath("$.diagrams.deleted").value(1))
            .andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(summary)
            .doesNotContain("admin@gmail.com", "reconcile-subject", "PROHIBITED_PRIVATE_PROJECT_NAME", "PROHIBITED_DOCUMENT_TEXT", "canvasJson", "markdown");
    }
}
