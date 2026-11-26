package org.example.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final Key secretKey;
    private final long accessValidityMs;
    private final long refreshValidityMs;

    public JwtService(
            @Value("${app.security.jwt.secret:change-me-secret-change-me-secret}") String secret,
            @Value("${app.security.jwt.access-validity-ms:900000}") long accessValidityMs,
            @Value("${app.security.jwt.refresh-validity-ms:259200000}") long refreshValidityMs
    ) {
        // ensure 256-bit key
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.accessValidityMs = accessValidityMs;
        this.refreshValidityMs = refreshValidityMs;
    }

    public String generateAccessToken(String subject, Map<String, Object> claims) {
        return buildToken(subject, claims, accessValidityMs);
    }

    public String generateRefreshToken(String subject) {
        return buildToken(subject, Map.of("type", "refresh"), refreshValidityMs);
    }

    public boolean isTokenValid(String token, String subject) {
        return subject.equals(extractUsername(token)) && !isTokenExpired(token);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return resolver.apply(claims);
    }

    private boolean isTokenExpired(String token) {
        Date expiration = extractClaim(token, Claims::getExpiration);
        return expiration.before(new Date());
    }

    private String buildToken(String subject, Map<String, Object> claims, long validityMs) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusMillis(validityMs)))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }
}
