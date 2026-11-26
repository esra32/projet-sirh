package org.example.recruitment.controller;

import org.example.recruitment.dto.NotificationDTO;
import org.example.recruitment.model.NotificationType;
import org.example.recruitment.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    /**
     * GET /api/notifications
     * Retourne l'historique complet des notifications de l'utilisateur connecté.
     *
     * Filtres optionnels :
     *   ?type=APPLICATION_RECEIVED   — filtrer par type de notification
     *   ?isRead=false                — filtrer par statut lu/non lu
     */
    @GetMapping
    public List<NotificationDTO> getMyNotifications(
            @AuthenticationPrincipal String email,
            @RequestParam(required = false) NotificationType type,
            @RequestParam(required = false) Boolean isRead) {
        return service.getByUser(email, type, isRead);
    }

    /** GET /api/notifications/unread-count */
    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount(@AuthenticationPrincipal String email) {
        return Map.of("count", service.countUnread(email));
    }

    /** PUT /api/notifications/{id}/read — Marquer une notification comme lue */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable String id) {
        service.markRead(id);
        return ResponseEntity.ok().build();
    }

    /**
     * PUT /api/notifications/mark-all-read
     * Marque TOUTES les notifications non lues de l'utilisateur comme lues.
     * Le statut est persisté en base via une requête UPDATE directe (pas en mémoire).
     */
    @PutMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal String email) {
        service.markAllRead(email);
        return ResponseEntity.ok().build();
    }

    /** DELETE /api/notifications/{id} — Supprimer une notification */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/notifications/internal
     * Endpoint interne inter-services (employee-service → recruitment-service).
     * Permet de créer des notifications mobilité sans JWT.
     */
    @PostMapping("/internal")
    public ResponseEntity<Void> createInternal(@RequestBody InternalNotificationRequest req) {
        try {
            NotificationType type = NotificationType.valueOf(req.getType());
            service.create(req.getUserEmail(), type, req.getTitle(), req.getMessage(),
                    req.getMetadata() != null ? req.getMetadata() : java.util.Map.of());
        } catch (Exception e) {
            // Non bloquant — ne jamais faire échouer l'appelant
        }
        return ResponseEntity.ok().build();
    }

    /** DTO interne — classe standard pour compatibilité maximale avec Jackson */
    static class InternalNotificationRequest {
        private String userEmail;
        private String type;
        private String title;
        private String message;
        private java.util.Map<String, String> metadata;

        public InternalNotificationRequest() {}

        public String getUserEmail() { return userEmail; }
        public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public java.util.Map<String, String> getMetadata() { return metadata; }
        public void setMetadata(java.util.Map<String, String> metadata) { this.metadata = metadata; }
    }
}