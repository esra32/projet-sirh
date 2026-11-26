package org.example.auth;

import org.example.auth.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class JwtServiceTest {

    @Autowired
    JwtService jwtService;

    @Test
    void accessTokenGeneratedAndValid() {
        String token = jwtService.generateAccessToken("user@test.com", Map.of("roles", "EMPLOYEE"));
        assertThat(token).isNotBlank();
        assertThat(jwtService.isTokenValid(token, "user@test.com")).isTrue();
        assertThat(jwtService.extractUsername(token)).isEqualTo("user@test.com");
    }

    @Test
    void refreshTokenGeneratedAndValid() {
        String token = jwtService.generateRefreshToken("user@test.com");
        assertThat(token).isNotBlank();
        assertThat(jwtService.isTokenValid(token, "user@test.com")).isTrue();
    }

    @Test
    void tokenInvalidForWrongSubject() {
        String token = jwtService.generateAccessToken("user@test.com", Map.of());
        assertThat(jwtService.isTokenValid(token, "other@test.com")).isFalse();
    }
}
