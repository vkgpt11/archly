package io.archly.admin;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminMetricsControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder jwtDecoder;
    @Autowired ArchlyUserRepository users;

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
}
