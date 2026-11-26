package org.example.auth.service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.example.auth.dto.AuthResponse;
import org.example.auth.dto.LoginRequest;
import org.example.auth.dto.RegisterRequest;
import org.example.auth.dto.UserDto;
import org.example.auth.model.Role;
import org.example.auth.model.User;
import org.example.auth.keycloak.KeycloakAdminClient;
import org.example.auth.repo.UserRepository;
import org.example.auth.security.JwtValidator;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final org.example.auth.service.CustomUserDetailsService userDetailsService;
    private final KeycloakAdminClient keycloakAdminClient;
    private final JwtValidator jwtValidator;

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            org.example.auth.service.CustomUserDetailsService userDetailsService,
            KeycloakAdminClient keycloakAdminClient,
            JwtValidator jwtValidator) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.keycloakAdminClient = keycloakAdminClient;
        this.jwtValidator = jwtValidator;
    }


    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email deja utilise");
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // Public self-registration is restricted to EMPLOYEE only.
        // Elevated roles (MANAGER / HR_ADMIN) are granted only by HR admin workflows.
        Set<Role> roles = Set.of(Role.EMPLOYEE);

        user.setRoles(roles);
        User saved = userRepository.save(user);

        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", roles);
        String access = jwtService.generateAccessToken(saved.getEmail(), claims);
        String refresh = jwtService.generateRefreshToken(saved.getEmail());

        AuthResponse response = new AuthResponse();
        response.setAccessToken(access);
        response.setRefreshToken(refresh);
        response.setRoles(roles);
        return response;
    }

    public void registerKeycloakEmployee(RegisterRequest request) {
        if (!keycloakAdminClient.isConfigured()) {
            throw new IllegalStateException("Keycloak admin not configured");
        }
        String userId = keycloakAdminClient.createUserWithEmailPassword(request.getEmail(), request.getPassword(), true);
        keycloakAdminClient.setUserRealmRolesSingle(userId, Role.EMPLOYEE);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        var roles = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getRoles).orElse(Set.of());

        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", roles);
        String access = jwtService.generateAccessToken(userDetails.getUsername(), claims);
        String refresh = jwtService.generateRefreshToken(userDetails.getUsername());

        AuthResponse response = new AuthResponse();
        response.setAccessToken(access);
        response.setRefreshToken(refresh);
        response.setRoles(roles);
        return response;
    }

    public AuthResponse refresh(String refreshToken) {
        String username = jwtService.extractUsername(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.isTokenValid(refreshToken, username)) {
            throw new IllegalArgumentException("Refresh token invalide");
        }
        var roles = userRepository.findByEmail(username).map(User::getRoles).orElse(Set.of());
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", roles);
        String access = jwtService.generateAccessToken(username, claims);
        String newRefresh = jwtService.generateRefreshToken(username);
        AuthResponse response = new AuthResponse();
        response.setAccessToken(access);
        response.setRefreshToken(newRefresh);
        response.setRoles(roles);
        return response;
    }

    public AuthResponse exchangeKeycloakToken(String token) {
        if (!jwtValidator.isValid(token)) {
            throw new IllegalArgumentException("Invalid Keycloak token");
        }
        String email = jwtValidator.extractUsername(token);

        // Map Keycloak realm roles → internal roles (for new users)
        List<String> keycloakRoles = jwtValidator.extractRoles(token);
        Set<Role> mappedRoles = keycloakRoles.stream()
                .map(r -> r.trim().toUpperCase().replace("ROLE_", ""))
                .filter(r -> {
                    try { Role.valueOf(r); return true; } catch (IllegalArgumentException ex) { return false; }
                })
                .map(Role::valueOf)
                .collect(Collectors.toSet());
        if (mappedRoles.isEmpty()) mappedRoles = Set.of(Role.EMPLOYEE);

        final Set<Role> rolesForNewUser = mappedRoles;
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setRoles(rolesForNewUser);
            return userRepository.save(newUser);
        });

        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", user.getRoles());
        String access = jwtService.generateAccessToken(user.getEmail(), claims);
        String refresh = jwtService.generateRefreshToken(user.getEmail());

        AuthResponse res = new AuthResponse();
        res.setAccessToken(access);
        res.setRefreshToken(refresh);
        res.setRoles(user.getRoles());
        return res;
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> new UserDto(
                        u.getId(),
                        u.getEmail(),
                        u.getRoles().stream().map(Role::name).collect(Collectors.toSet())))
                .collect(Collectors.toList());
    }

    public UserDto updateUserRoles(String userId, Set<Role> newRoles) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable: " + userId));
        user.setRoles(new HashSet<>(newRoles));
        User saved = userRepository.save(user);
        return new UserDto(saved.getId(), saved.getEmail(),
                saved.getRoles().stream().map(Role.class::cast).map(Enum::name).collect(Collectors.toSet()));
    }

    public void deleteUser(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new UsernameNotFoundException("Utilisateur introuvable: " + userId);
        }
        userRepository.deleteById(userId);
    }
}
