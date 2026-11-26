package org.example.recruitment.repo;

import org.example.recruitment.model.Notification;
import org.example.recruitment.model.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {

    List<Notification> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    List<Notification> findByUserEmailAndTypeOrderByCreatedAtDesc(String userEmail, NotificationType type);

    List<Notification> findByUserEmailAndIsReadOrderByCreatedAtDesc(String userEmail, boolean isRead);

    List<Notification> findByUserEmailAndTypeAndIsReadOrderByCreatedAtDesc(String userEmail, NotificationType type, boolean isRead);

    long countByUserEmailAndIsReadFalse(String userEmail);

    /** Bulk mark-as-read — évite de charger toutes les notifications en mémoire */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.userEmail = :email AND n.isRead = false")
    int markAllReadByEmail(@Param("email") String email, @Param("readAt") LocalDateTime readAt);
}