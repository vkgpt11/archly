package io.archly.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class AdminAuthorizationServiceTest {
    @Test void normalizesCaseAndWhitespaceAndRequiresExactMatches() {
        var service = new AdminAuthorizationService(" Admin@Gmail.com,second@gmail.com ");
        assertThat(service.isAdmin("admin@gmail.com")).isTrue();
        assertThat(service.isAdmin(" ADMIN@GMAIL.COM ")).isTrue();
        assertThat(service.isAdmin("admin@gmail.com.attacker.example")).isFalse();
    }

    @Test void emptyAndMalformedEntriesGrantNoAccess() {
        var service = new AdminAuthorizationService(" , , ");
        assertThat(service.isAdmin(null)).isFalse();
        assertThatThrownBy(() -> service.requireAdmin("user@gmail.com"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("403");
    }
}
