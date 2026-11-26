package org.example.recruitment.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.example.recruitment.model.AiUsageLog;
import org.example.recruitment.model.ChatMessage;
import org.example.recruitment.repo.AiUsageLogRepository;
import org.example.recruitment.service.ChatService;
import org.example.recruitment.service.RateLimitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@SecurityRequirement(name = "bearerAuth")
public class AiChatController {

    private final ChatService chatService;
    private final RateLimitService rateLimitService;
    private final AiUsageLogRepository aiUsageLogRepository;

    public AiChatController(ChatService chatService,
                           RateLimitService rateLimitService,
                           AiUsageLogRepository aiUsageLogRepository) {
        this.chatService = chatService;
        this.rateLimitService = rateLimitService;
        this.aiUsageLogRepository = aiUsageLogRepository;
    }

    @GetMapping("/{sessionId}")
    @PreAuthorize("hasAnyAuthority('EMPLOYEE','MANAGER','HR_ADMIN')")
    public ResponseEntity<List<ChatMessage>> getHistory(@PathVariable String sessionId) {
        return ResponseEntity.ok(chatService.getHistory(sessionId));
    }

    @PostMapping("/{sessionId}")
    @PreAuthorize("hasAnyAuthority('EMPLOYEE','MANAGER','HR_ADMIN')")
    public ResponseEntity<?> sendMessage(
            @PathVariable String sessionId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String userId) {

        String message = body.get("message");
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }

        // 1. Rate limiting check
        if (!rateLimitService.tryAcquire(userId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Rate limit exceeded. Max 10 requests per hour."));
        }

        // 2. Process the message
        ChatMessage response = chatService.processMessage(sessionId, message);

        // 3. Log the AI usage
        AiUsageLog log = new AiUsageLog(userId, "chat", message, response.getContent());
        aiUsageLogRepository.save(log);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/rate-limit")
    @PreAuthorize("hasAnyAuthority('EMPLOYEE','MANAGER','HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> getRateLimitStatus(@AuthenticationPrincipal String userId) {
        int remaining = rateLimitService.getRemainingRequests(userId);
        return ResponseEntity.ok(Map.of(
            "remainingRequests", remaining,
            "maxRequestsPerHour", 10
        ));
    }
}
