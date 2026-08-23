package io.archly.project;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectControllerTest {
    @Autowired MockMvc mvc;
    @MockBean JwtDecoder jwtDecoder;

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
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
}
