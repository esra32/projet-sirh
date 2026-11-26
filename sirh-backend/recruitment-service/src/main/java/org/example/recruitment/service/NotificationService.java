package org.example.recruitment.service;

import org.example.recruitment.dto.NotificationDTO;
import org.example.recruitment.model.Notification;
import org.example.recruitment.model.NotificationType;
import org.example.recruitment.repo.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final NotificationRepository repo;

    public NotificationService(NotificationRepository repo) {
        this.repo = repo;
    }

    /** Crée et sauvegarde une notification dans sa propre transaction.
     *  Propagation.REQUIRES_NEW garantit que l'échec ne pollue pas la transaction appelante. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void create(String userEmail, NotificationType type, String title, String message, Map<String, String> meta) {
        Notification n = new Notification();
        n.setUserEmail(userEmail.toLowerCase());
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        if (meta != null && !meta.isEmpty()) {
            try {
                n.setMetadata(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(meta));
            } catch (Exception ignored) {}
        }
        repo.save(n);
        log.info("🔔 Notification créée [{}] → {}", type, userEmail);
    }

    /** Récupère toutes les notifications d'un utilisateur (historique complet).
     *  Filtres optionnels : type et isRead. */
    @Transactional(readOnly = true)
    public List<NotificationDTO> getByUser(String userEmail, NotificationType type, Boolean isRead) {
        String email = userEmail.toLowerCase();
        List<Notification> notifications;
        if (type != null && isRead != null) {
            notifications = repo.findByUserEmailAndTypeAndIsReadOrderByCreatedAtDesc(email, type, isRead);
        } else if (type != null) {
            notifications = repo.findByUserEmailAndTypeOrderByCreatedAtDesc(email, type);
        } else if (isRead != null) {
            notifications = repo.findByUserEmailAndIsReadOrderByCreatedAtDesc(email, isRead);
        } else {
            notifications = repo.findByUserEmailOrderByCreatedAtDesc(email);
        }
        return notifications.stream().map(this::toDto).toList();
    }

    /** Nombre de notifications non lues */
    public long countUnread(String userEmail) {
        return repo.countByUserEmailAndIsReadFalse(userEmail.toLowerCase());
    }

    /** Marquer une notification comme lue */
    @Transactional
    public void markRead(String id) {
        repo.findById(id).ifPresent(n -> {
            n.setRead(true);
            n.setReadAt(LocalDateTime.now());
            repo.save(n);
        });
    }

    /** Marquer toutes les notifications d'un utilisateur comme lues.
     *  Utilise une requête bulk UPDATE pour garantir la persistance en base. */
    @Transactional
    public void markAllRead(String userEmail) {
        int updated = repo.markAllReadByEmail(userEmail.toLowerCase(), LocalDateTime.now());
        log.info("✅ {} notification(s) marquée(s) comme lue(s) pour {}", updated, userEmail);
    }

    /** Supprimer une notification */
    @Transactional
    public void delete(String id) {
        if (repo.existsById(id)) {
            repo.deleteById(id);
        }
    }

    private NotificationDTO toDto(Notification n) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(n.getId());
        dto.setUserEmail(n.getUserEmail());
        dto.setType(n.getType());
        dto.setTitle(n.getTitle());
        dto.setMessage(n.getMessage());
        dto.setRead(n.isRead());
        dto.setReadAt(n.getReadAt());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setMetadata(n.getMetadata());
        return dto;
    }
}