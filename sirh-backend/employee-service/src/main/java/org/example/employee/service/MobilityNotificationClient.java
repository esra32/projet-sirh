package org.example.employee.service;

import org.example.employee.model.MobilityRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Client inter-services : crée des notifications dans recruitment-service
 * pour que les événements mobilité apparaissent dans la cloche de l'interface.
 */
@Service
public class MobilityNotificationClient {

    private static final Logger log = LoggerFactory.getLogger(MobilityNotificationClient.class);

    private final RestTemplate restTemplate;
    private final String notifUrl;

    public MobilityNotificationClient(
            RestTemplate restTemplate,
            @Value("${recruitment.service.url:http://localhost:8083}") String recruitmentUrl) {
        this.restTemplate = restTemplate;
        this.notifUrl = recruitmentUrl + "/api/notifications/internal";
    }

    /** Notifie le manager qu'une demande attend sa validation */
    public void notifyManagerPending(MobilityRequest req, String managerEmail) {
        String empName = req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName();
        post(managerEmail, "MOBILITY_REQUEST_SUBMITTED",
            "Demande de mobilité en attente",
            empName + " a soumis une demande de mobilité interne.",
            Map.of("employeeId", req.getEmployee().getId(), "requestId", req.getId()));
    }

    /** Notifie le RH d'une nouvelle demande */
    public void notifyHrNewRequest(MobilityRequest req, String hrEmail) {
        String empName = req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName();
        post(hrEmail, "MOBILITY_REQUEST_SUBMITTED",
            "Nouvelle demande de mobilité",
            empName + " a soumis une demande de mobilité.",
            Map.of("requestId", req.getId()));
    }

    /** Notifie le RH qu'un manager a validé une demande */
    public void notifyHrManagerValidated(MobilityRequest req, String hrEmail) {
        String empName = req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName();
        post(hrEmail, "MOBILITY_MANAGER_VALIDATED",
            "Mobilité validée par le manager",
            "La demande de mobilité de " + empName + " a été validée par son manager. En attente de votre décision.",
            Map.of("requestId", req.getId()));
    }

    /** Notifie l'employé que sa demande est approuvée */
    public void notifyEmployeeApproved(MobilityRequest req) {
        post(req.getEmployee().getEmail(), "MOBILITY_APPROVED",
            "Demande de mobilité approuvée ✅",
            "Votre demande de mobilité interne a été approuvée par le service RH.",
            Map.of("requestId", req.getId()));
    }

    /** Notifie l'employé que sa demande est refusée */
    public void notifyEmployeeRejected(MobilityRequest req) {
        String comment = req.getHrComment() != null && !req.getHrComment().isBlank()
            ? " Motif : " + req.getHrComment() : "";
        post(req.getEmployee().getEmail(), "MOBILITY_REJECTED",
            "Demande de mobilité non retenue",
            "Votre demande de mobilité interne n'a pas été retenue." + comment,
            Map.of("requestId", req.getId()));
    }

    private void post(String userEmail, String type, String title, String message, Map<String, String> meta) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                "userEmail", userEmail,
                "type",      type,
                "title",     title,
                "message",   message,
                "metadata",  meta
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(notifUrl, entity, Void.class);
            log.info("🔔 Notification mobilité envoyée à {} ({})", userEmail, type);
        } catch (Exception e) {
            log.warn("Notification mobilité non envoyée à {} : {}", userEmail, e.getMessage());
        }
    }
}