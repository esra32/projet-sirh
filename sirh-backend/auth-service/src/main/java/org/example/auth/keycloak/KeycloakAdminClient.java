package org.example.auth.keycloak;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.example.auth.dto.UserDto;
import org.example.auth.model.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class KeycloakAdminClient {

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String serverUrl;
    private final String realm;
    private final String adminClientId;
    private final String adminClientSecret;

    private volatile String cachedAccessToken;
    private volatile Instant cachedAccessTokenExpiry;

    public KeycloakAdminClient(
            @Value("${keycloak.admin.auth-server-url:}") String serverUrl,
            @Value("${keycloak.admin.realm:}") String realm,
            @Value("${keycloak.admin.client-id:}") String adminClientId,
            @Value("${keycloak.admin.client-secret:}") String adminClientSecret) {
        this.serverUrl = serverUrl;
        this.realm = realm;
        this.adminClientId = adminClientId;
        this.adminClientSecret = adminClientSecret;
    }

    public boolean isConfigured() {
        return serverUrl != null && !serverUrl.isBlank()
                && realm != null && !realm.isBlank()
                && adminClientId != null && !adminClientId.isBlank()
                && adminClientSecret != null && !adminClientSecret.isBlank();
    }

    private String adminBaseUrl() {
        // Example: http://localhost:8080/admin/realms/<realm>
        return serverUrl.replaceAll("/$", "") + "/admin/realms/" + realm;
    }

    private synchronized String getAdminToken() throws IOException, InterruptedException {
        if (!isConfigured()) {
            throw new IllegalStateException("Keycloak admin client not configured");
        }

        if (cachedAccessToken != null && cachedAccessTokenExpiry != null
                && Instant.now().isBefore(cachedAccessTokenExpiry.minusSeconds(15))) {
            return cachedAccessToken;
        }

        String tokenUrl = serverUrl.replaceAll("/$", "") + "/realms/" + realm + "/protocol/openid-connect/token";

        String form = "grant_type=client_credentials"
                + "&client_id=" + url(adminClientId)
                + "&client_secret=" + url(adminClientSecret);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(tokenUrl))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Keycloak admin token failed: " + response.statusCode() + " " + response.body());
        }

        JsonNode json = objectMapper.readTree(response.body());
        cachedAccessToken = json.path("access_token").asText();
        long expiresIn = json.path("expires_in").asLong(60);
        cachedAccessTokenExpiry = Instant.now().plusSeconds(expiresIn);
        return cachedAccessToken;
    }

    public List<UserDto> listUsersWithRoles(int max) {
        if (!isConfigured()) return List.of();

        try {
            String url = adminBaseUrl() + "/users?max=" + max;
            HttpRequest req = baseRequest(URI.create(url)).GET().build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new IllegalStateException("Keycloak list users failed: " + resp.statusCode());
            }

            JsonNode arr = objectMapper.readTree(resp.body());
            List<UserDto> out = new ArrayList<>();
            if (!arr.isArray()) return out;

            for (JsonNode u : arr) {
                String id = u.path("id").asText();
                String email = u.path("email").asText();
                Set<String> roles = listRealmRolesForUser(id);
                out.add(new UserDto(id, email, roles));
            }
            return out;
        } catch (Exception e) {
            throw new IllegalStateException("Keycloak listUsersWithRoles failed", e);
        }
    }

    public void deleteUser(String userId) {
        if (!isConfigured()) return;
        try {
            String url = adminBaseUrl() + "/users/" + userId;
            HttpRequest req = baseRequest(URI.create(url)).DELETE().build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                // Keycloak sometimes returns 204 with empty body, keep flexible:
                if (resp.statusCode() != 204) {
                    throw new IllegalStateException("Keycloak delete user failed: " + resp.statusCode());
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Keycloak deleteUser failed", e);
        }
    }

    public Optional<UserDto> getUserByIdWithRoles(String userId) {
        if (!isConfigured()) return Optional.empty();
        try {
            String url = adminBaseUrl() + "/users/" + userId;
            HttpRequest req = baseRequest(URI.create(url)).GET().build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                return Optional.empty();
            }
            JsonNode u = objectMapper.readTree(resp.body());
            String email = u.path("email").asText();
            Set<String> roles = listRealmRolesForUser(userId);
            return Optional.of(new UserDto(userId, email, roles));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Set<String> listRealmRolesForUser(String userId) {
        try {
            String url = adminBaseUrl() + "/users/" + userId + "/role-mappings/realm";
            HttpRequest req = baseRequest(URI.create(url)).GET().build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new IllegalStateException("Keycloak roles fetch failed: " + resp.statusCode());
            }
            JsonNode arr = objectMapper.readTree(resp.body());
            if (!arr.isArray()) return Set.of();
            Set<String> roles = new java.util.LinkedHashSet<>();
            for (JsonNode r : arr) {
                String name = r.path("name").asText();
                if (name != null && !name.isBlank()) {
                    roles.add(name);
                }
            }
            return roles;
        } catch (Exception e) {
            throw new IllegalStateException("Keycloak listRealmRolesForUser failed", e);
        }
    }

    public void assignRealmRole(String userId, String roleName) {
        if (!isConfigured()) return;
        try {
            String url = adminBaseUrl() + "/users/" + userId + "/role-mappings/realm";
            List<Map<String, String>> roles = List.of(Map.of("name", roleName));
            HttpRequest req = baseRequest(URI.create(url))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(roles)))
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new IllegalStateException("Keycloak assign role failed: " + resp.statusCode() + " " + resp.body());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Keycloak assignRealmRole failed", e);
        }
    }

    public void setUserRealmRolesSingle(String userId, Role role) {
        if (!isConfigured()) return;
        String desired = role.name();
        try {
            Set<String> current = listRealmRolesForUser(userId);
            if (current.contains(desired) && current.size() == 1) return;

            // Remove roles not desired
            for (String r : current) {
                if (r.equalsIgnoreCase(desired)) continue;
                removeRealmRole(userId, r);
            }
            if (!current.contains(desired)) {
                assignRealmRole(userId, desired);
            }
        } catch (Exception e) {
            throw new IllegalStateException("Keycloak setUserRealmRolesSingle failed", e);
        }
    }

    public String createUserWithEmailPassword(String email, String password, boolean enabled) {
        if (!isConfigured()) {
            throw new IllegalStateException("Keycloak admin client not configured");
        }
        try {
            String url = adminBaseUrl() + "/users";

            Map<String, Object> body = new HashMap<>();
            body.put("email", email);
            body.put("username", email);
            body.put("enabled", enabled);
            body.put("credentials", List.of(Map.of(
                    "type", "password",
                    "value", password,
                    "temporary", false
            )));

            HttpRequest req = baseRequest(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 409) {
                // already exists
                Optional<String> existingId = findUserIdByEmail(email);
                if (existingId.isPresent()) return existingId.get();
                throw new IllegalStateException("Keycloak user exists but id cannot be found for email=" + email);
            }
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new IllegalStateException("Keycloak create user failed: " + resp.statusCode() + " " + resp.body());
            }

            // Usually created: 201 and Location header contains the id
            Optional<String> location = resp.headers().firstValue("Location");
            if (location.isPresent()) {
                String loc = location.get();
                int idx = loc.lastIndexOf('/');
                if (idx >= 0 && idx + 1 < loc.length()) {
                    return loc.substring(idx + 1);
                }
            }

            // fallback
            Optional<String> id = findUserIdByEmail(email);
            if (id.isPresent()) return id.get();
            throw new IllegalStateException("Keycloak created user but id cannot be determined for email=" + email);
        } catch (Exception e) {
            throw new IllegalStateException("Keycloak createUserWithEmailPassword failed", e);
        }
    }

    private Optional<String> findUserIdByEmail(String email) {
        try {
            String url = adminBaseUrl() + "/users?email=" + url(email);
            HttpRequest req = baseRequest(URI.create(url)).GET().build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) return Optional.empty();
            JsonNode arr = objectMapper.readTree(resp.body());
            if (!arr.isArray() || arr.isEmpty()) return Optional.empty();
            return Optional.of(arr.get(0).path("id").asText());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private void removeRealmRole(String userId, String roleName) {
        try {
            String url = adminBaseUrl() + "/users/" + userId + "/role-mappings/realm/" + url(roleName);
            HttpRequest req = baseRequest(URI.create(url)).DELETE().build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                if (resp.statusCode() != 204) {
                    throw new IllegalStateException("Keycloak remove role failed: " + resp.statusCode());
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Keycloak removeRealmRole failed", e);
        }
    }

    private HttpRequest.Builder baseRequest(URI uri) throws IOException, InterruptedException {
        String token = getAdminToken();
        return HttpRequest.newBuilder(uri)
                .header("Authorization", "Bearer " + token);
    }

    private static String url(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}

