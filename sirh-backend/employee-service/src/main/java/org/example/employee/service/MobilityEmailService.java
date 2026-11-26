package org.example.employee.service;

import org.example.employee.model.MobilityRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Envoi d'emails liés aux demandes de mobilité.
 * Si aucune config SMTP n'est fournie → simulation dans les logs (mode démo/PFE).
 */
@Service
public class MobilityEmailService {

    private static final Logger log = LoggerFactory.getLogger(MobilityEmailService.class);

    private final JavaMailSender mailSender;
    private final boolean mailEnabled;

    @Value("${spring.mail.from:noreply@sirh.com}")
    private String from;

    public MobilityEmailService(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${spring.mail.host:}") String mailHost) {
        this.mailSender = mailSender;
        this.mailEnabled = mailSender != null && !mailHost.isBlank();
    }

    /** Notifie le manager qu'un membre de son équipe a soumis une demande. */
    public void notifyManager(MobilityRequest req, String managerEmail) {
        String empName = req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName();
        String target = (req.getTargetDepartment() != null ? req.getTargetDepartment() : "non précisé")
                + (req.getTargetPosition() != null ? " / " + req.getTargetPosition() : "");
        send(managerEmail,
            "Nouvelle demande de mobilité — " + empName,
            html("Demande de mobilité à valider 📋",
                "Bonjour,",
                "<strong>" + empName + "</strong> a soumis une demande de mobilité interne vers : <strong>"
                + target + "</strong>.<br><br>"
                + "Motif : <em>" + req.getReason() + "</em><br><br>"
                + "Connectez-vous à votre espace Manager pour valider ou refuser cette demande."));
    }

    /** Notifie le RH qu'une nouvelle demande a été soumise. */
    public void notifyHr(MobilityRequest req, String hrEmail) {
        String empName = req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName();
        send(hrEmail,
            "Nouvelle demande de mobilité — " + empName,
            html("Nouvelle demande de mobilité 🔔",
                "Bonjour,",
                "Une nouvelle demande de mobilité a été soumise par <strong>" + empName
                + "</strong> (" + req.getEmployee().getEmail() + ").<br><br>"
                + "Département cible : <strong>" + (req.getTargetDepartment() != null ? req.getTargetDepartment() : "—") + "</strong><br>"
                + "Poste cible : <strong>" + (req.getTargetPosition() != null ? req.getTargetPosition() : "—") + "</strong><br><br>"
                + "Connectez-vous à votre espace RH pour traiter cette demande."));
    }

    /** Notifie le manager que sa validation est transmise au RH. */
    public void notifyManagerApproved(MobilityRequest req, String managerEmail) {
        String empName = req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName();
        send(managerEmail,
            "Demande de mobilité transmise au RH — " + empName,
            html("Validation transmise ✅",
                "Bonjour,",
                "Votre validation pour la demande de mobilité de <strong>" + empName
                + "</strong> a été transmise au service RH pour décision finale."));
    }

    /** Notifie l'employé de la décision finale (approuvé ou refusé). */
    public void notifyEmployee(MobilityRequest req) {
        boolean approved = req.getStatus().name().equals("APPROVED");
        String empName = req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName();
        String title = approved ? "Demande de mobilité approuvée ✅" : "Demande de mobilité refusée";
        String message = approved
            ? "Votre demande de mobilité interne a été <strong>approuvée</strong> par le service RH."
            : "Votre demande de mobilité interne n'a pas été retenue."
              + (req.getHrComment() != null && !req.getHrComment().isBlank()
                 ? "<br><br>Motif : <em>" + req.getHrComment() + "</em>" : "");
        send(req.getEmployee().getEmail(), title,
            html(title, "Bonjour " + empName + ",", message));
    }

    private void send(String to, String subject, String html) {
        if (!mailEnabled || mailSender == null) {
            log.info("📧 [EMAIL MOBILITÉ SIMULÉ] À: {} | Objet: {}", to, subject);
            return;
        }
        try {
            var msg = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("📧 Email mobilité envoyé à {}", to);
        } catch (Exception e) {
            log.error("Erreur envoi email mobilité à {}: {}", to, e.getMessage());
        }
    }

    private String html(String title, String greeting, String body) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto'>"
            + "<div style='background:linear-gradient(135deg,#4DA3FF,#6EE7B7);padding:2rem;border-radius:12px 12px 0 0'>"
            + "<h2 style='color:white;margin:0'>" + title + "</h2></div>"
            + "<div style='padding:2rem;background:#fff;border:1px solid #e5e7eb;border-radius:0 0 12px 12px'>"
            + "<p>" + greeting + "</p><p>" + body + "</p>"
            + "<p style='color:#9ca3af;font-size:0.85rem;margin-top:2rem'>SIRH — Système d'Information RH</p>"
            + "</div></div>";
    }
}