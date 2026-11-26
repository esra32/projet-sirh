package org.example.gateway.filter;

import io.jsonwebtoken.Claims;
import org.example.gateway.security.JwtValidator;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Gateway filter that validates the Bearer JWT and forwards the
 * X-Auth-User / X-Auth-Roles headers downstream.
 */
@Component
public class AuthJwtFilter extends AbstractGatewayFilterFactory<AuthJwtFilter.Config> {

    private final JwtValidator jwtValidator;

    public AuthJwtFilter(JwtValidator jwtValidator) {
        super(Config.class);
        this.jwtValidator = jwtValidator;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return unauthorized(exchange);
            }
            String token = authHeader.substring(7);
            if (!jwtValidator.isValid(token)) {
                return unauthorized(exchange);
            }
            Claims claims = jwtValidator.validateAndExtract(token);
            var roles = jwtValidator.extractRoles(token);
            // Forward identity downstream
            ServerWebExchange mutated = exchange.mutate()
                    .request(r -> r.header("X-Auth-User", claims.getSubject())
                            .header("X-Auth-Roles", String.join(",", roles)))
                    .build();
            return chain.filter(mutated);
        };
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    public static class Config {}
}
