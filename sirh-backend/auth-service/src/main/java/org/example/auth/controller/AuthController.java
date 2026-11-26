package org.example.auth.controller;

import org.example.auth.dto.AuthResponse;
import org.example.auth.dto.LoginRequest;
import org.example.auth.dto.RegisterRequest;
import org.example.auth.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }




    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody @Validated RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Validated LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody AuthResponse tokenHolder) {
        return ResponseEntity.ok(authService.refresh(tokenHolder.getRefreshToken()));
    }

    @PostMapping("/keycloak/register")
    public ResponseEntity<Void> registerKeycloakEmployee(@RequestBody @Validated RegisterRequest request) {
        authService.registerKeycloakEmployee(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/keycloak/exchange")
    public ResponseEntity<AuthResponse> exchangeKeycloakToken(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.exchangeKeycloakToken(body.get("token")));
    }
}