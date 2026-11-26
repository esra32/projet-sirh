package org.example.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Key;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtValidator {

    private final Key secretKey;
    private final boolean keycloakEnabled;
    private final String keycloakJwksUri;
    private final String keycloakIssuer;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, PublicKey> kidToPublicKey = new ConcurrentHashMap<>();

    public JwtValidator(
            @Value("${app.security.jwt.secret:change-me-to-a-very-long-secret-key-min-256-bits}") String secret,
            @Value("${keycloak.jwks-uri:}") String keycloakJwksUri,
            @Value("${keycloak.issuer:}") String keycloakIssuer
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.keycloakJwksUri = keycloakJwksUri;
        this.keycloakIssuer = keycloakIssuer;
        this.keycloakEnabled = keycloakJwksUri != null && !keycloakJwksUri.isBlank();
        if (keycloakEnabled) {
            refreshJwks();
        }
    }

    public Claims validateAndExtract(String token) {
        String kid = null;
        try {
            kid = extractKid(token);
        } catch (Exception ignored) {}

        if (kid == null || kid.isBlank() || !keycloakEnabled) {
            return Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        }

        try {
            PublicKey pk = kidToPublicKey.get(kid);
            if (pk == null) {
                refreshJwks();
                pk = kidToPublicKey.get(kid);
            }
            if (pk == null) {
                throw new IllegalStateException("No JWKS public key found for kid=" + kid);
            }

            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(pk)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            if (keycloakIssuer != null && !keycloakIssuer.isBlank()) {
                if (claims.getIssuer() == null || !keycloakIssuer.equals(claims.getIssuer())) {
                    throw new IllegalStateException("Invalid token issuer: " + claims.getIssuer());
                }
            }
            return claims;
        } catch (Exception e) {
            throw new IllegalStateException("JWT validation failed", e);
        }
    }

    public boolean isValid(String token) {
        try {
            validateAndExtract(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        Claims claims = validateAndExtract(token);
        String email = claims.get("email", String.class);
        if (email != null && !email.isBlank()) {
            return email;
        }
        String preferredUsername = claims.get("preferred_username", String.class);
        if (preferredUsername != null && !preferredUsername.isBlank()) {
            return preferredUsername;
        }
        return claims.getSubject();
    }

    public List<String> extractRoles(String token) {
        Claims claims = validateAndExtract(token);
        Object rolesObj = claims.get("roles");
        if (rolesObj instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }

        // Keycloak: realm_access.roles
        Object realmAccess = claims.get("realm_access");
        if (realmAccess instanceof Map<?, ?> map) {
            Object r = map.get("roles");
            if (r instanceof List<?> rList) {
                return rList.stream().map(Object::toString).toList();
            }
        }

        // Keycloak: resource_access.{client}.roles (union)
        Object resourceAccess = claims.get("resource_access");
        if (resourceAccess instanceof Map<?, ?> map) {
            java.util.LinkedHashSet<String> union = new java.util.LinkedHashSet<>();
            for (Object val : map.values()) {
                if (val instanceof Map<?, ?> clientMap) {
                    Object r = clientMap.get("roles");
                    if (r instanceof List<?> rList) {
                        for (Object role : rList) {
                            union.add(String.valueOf(role));
                        }
                    }
                }
            }
            return new java.util.ArrayList<>(union);
        }

        return java.util.List.of();
    }

    private String extractKid(String token) throws Exception {
        String[] parts = token.split("\\.");
        if (parts.length < 2) return "";
        byte[] headerBytes = Base64.getUrlDecoder().decode(parts[0]);
        JsonNode header = objectMapper.readTree(new String(headerBytes));
        JsonNode kidNode = header.get("kid");
        return kidNode == null ? "" : kidNode.asText();
    }

    private void refreshJwks() {
        if (!keycloakEnabled) return;
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(keycloakJwksUri))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) return;

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode keys = root.get("keys");
            if (keys == null || !keys.isArray()) return;

            for (JsonNode k : keys) {
                String kid = k.path("kid").asText();
                String kty = k.path("kty").asText();
                if (kid == null || kid.isBlank()) continue;
                if (!"RSA".equalsIgnoreCase(kty)) continue;

                String n = k.path("n").asText();
                String e = k.path("e").asText();
                if (n == null || n.isBlank() || e == null || e.isBlank()) continue;

                PublicKey pk = rsaPublicKeyFromModExp(n, e);
                kidToPublicKey.put(kid, pk);
            }
        } catch (Exception ignored) {
            // If JWKS fetch fails, leave previous keys (or fail closed).
        }
    }

    private PublicKey rsaPublicKeyFromModExp(String n, String e) throws Exception {
        BigInteger modulus = new BigInteger(1, Base64.getUrlDecoder().decode(n));
        BigInteger exponent = new BigInteger(1, Base64.getUrlDecoder().decode(e));
        RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, exponent);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return kf.generatePublic(spec);
    }
}
