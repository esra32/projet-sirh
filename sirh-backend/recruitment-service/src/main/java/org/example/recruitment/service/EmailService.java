package org.example.recruitment.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Service d'envoi d'emails HTML.
 * Si aucune configuration SMTP n'est fournie, les emails sont
 * loggués dans la console (mode démo/PFE).
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final boolean mailEnabled;

    @Value("${spring.mail.from:noreply@sirh.com}")
    private String fromEmail;

    public EmailService(
            @org.springframework.beans.factory.annotation.Autowired(required = false)
            JavaMailSender mailSender,
            @Value("${spring.mail.host:}") String mailHost) {
        this.mailSender = mailSender;
        this.mailEnabled = mailSender != null && !mailHost.isBlank();
    }

    public void send(String to, String subject, String htmlBody) {
        if (!mailEnabled || mailSender == null) {
            log.info("📧 [EMAIL SIMULÉ] À: {} | Objet: {}", to, subject);
            return;
        }
        try {
            var msg = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("📧 Email envoyé à {}", to);
        } catch (Exception e) {
            log.error("Erreur envoi email à {}: {}", to, e.getMessage());
        }
    }

    // ── Templates HTML ──────────────────────────────────────────────

    public void sendApplicationReceived(String to, String candidateName, String postTitle) {
        String subject = "Votre candidature a été reçue — " + postTitle;
        String body = template(
            "Candidature reçue ✅",
            "Bonjour " + candidateName + ",",
            "Nous avons bien reçu votre candidature pour le poste de <strong>" + postTitle + "</strong>.<br><br>" +
            "Votre dossier est en cours d'examen. Vous serez informé(e) de la suite dès que possible.<br><br>" +
            "Merci pour votre intérêt.",
            "#16A34A"
        );
        send(to, subject, body);
    }

    public void sendInterviewScheduled(String to, String candidateName, String postTitle,
                                        String date, String location, String interviewer,
                                        String instructions) {
        String subject = "Convocation à un entretien — " + postTitle;
        String instructionsHtml = (instructions != null && !instructions.isBlank())
            ? "<tr style='background:#F9FAFB'><td style='padding:8px;font-weight:bold;color:#374151'>📋 Instructions</td>" +
              "<td style='padding:8px'>" + instructions + "</td></tr>"
            : "";
        String body = template(
            "Entretien planifié 📅",
            "Bonjour " + candidateName + ",",
            "Félicitations ! Nous avons le plaisir de vous convoquer à un entretien pour le poste de " +
            "<strong>" + postTitle + "</strong>.<br><br>" +
            "<table style='border-collapse:collapse;width:100%'>" +
            "<tr><td style='padding:8px;font-weight:bold;color:#374151'>📅 Date &amp; Heure</td>" +
            "<td style='padding:8px'>" + (date != null ? date : "À confirmer") + "</td></tr>" +
            "<tr style='background:#F9FAFB'><td style='padding:8px;font-weight:bold;color:#374151'>📍 Lieu</td>" +
            "<td style='padding:8px'>" + (location != null ? location : "À confirmer") + "</td></tr>" +
            "<tr><td style='padding:8px;font-weight:bold;color:#374151'>👤 Interlocuteur</td>" +
            "<td style='padding:8px'>" + (interviewer != null ? interviewer : "Équipe RH") + "</td></tr>" +
            instructionsHtml +
            "<tr><td style='padding:8px;font-weight:bold;color:#374151'>📞 Contact RH</td>" +
            "<td style='padding:8px'><a href='mailto:" + fromEmail + "'>" + fromEmail + "</a></td></tr>" +
            "</table><br>" +
            "Merci de confirmer votre présence en répondant à cet email.<br><br>" +
            "En cas d'empêchement, contactez-nous au plus tôt.",
            "#1E3A8A"
        );
        send(to, subject, body);
    }

    public void sendApplicationAccepted(String to, String candidateName, String postTitle) {
        String subject = "Félicitations — Votre candidature est retenue ! 🎉";
        String body = template(
            "Candidature acceptée 🎉",
            "Bonjour " + candidateName + ",",
            "Nous avons le grand plaisir de vous informer que votre candidature pour le poste de " +
            "<strong>" + postTitle + "</strong> a été <strong>retenue</strong>.<br><br>" +
            "Un membre de l'équipe RH vous contactera prochainement pour vous communiquer " +
            "les prochaines étapes (date de prise de poste, documents à fournir, etc.).<br><br>" +
            "Bienvenue dans votre nouveau rôle !",
            "#16A34A"
        );
        send(to, subject, body);
    }

    public void sendApplicationRejected(String to, String candidateName, String postTitle, String reason) {
        String subject = "Résultat de votre candidature — " + postTitle;
        String reasonHtml = (reason != null && !reason.isBlank())
            ? "<br><br><strong>Motif :</strong><br><em style='color:#6B7280'>" + reason + "</em>"
            : "";
        String body = template(
            "Résultat de candidature",
            "Bonjour " + candidateName + ",",
            "Nous vous remercions de l'intérêt que vous portez à notre organisation et du temps " +
            "consacré à votre candidature pour le poste de <strong>" + postTitle + "</strong>.<br><br>" +
            "Après examen attentif de votre dossier, nous avons le regret de vous informer que " +
            "votre candidature n'a pas été retenue pour ce poste." + reasonHtml + "<br><br>" +
            "Nous vous encourageons à postuler à d'autres offres correspondant à votre profil.",
            "#DC2626"
        );
        send(to, subject, body);
    }

    public void sendOfferPendingValidation(String to, String managerName, String postTitle, String department) {
        String subject = "Nouvelle offre en attente de validation — " + postTitle;
        String body = template(
            "Offre à valider 📋",
            "Bonjour,",
            "Le manager <strong>" + managerName + "</strong> a soumis une nouvelle offre d'emploi " +
            "en attente de votre validation :<br><br>" +
            "<strong>Poste :</strong> " + postTitle + "<br>" +
            "<strong>Département :</strong> " + department + "<br><br>" +
            "Connectez-vous à votre espace RH pour l'examiner et la valider ou la refuser.",
            "#1E3A8A"
        );
        send(to, subject, body);
    }

    public void sendOfferValidated(String to, String postTitle) {
        String subject = "Votre offre a été validée et publiée — " + postTitle;
        String body = template(
            "Offre publiée ✅",
            "Bonjour,",
            "Votre offre d'emploi <strong>" + postTitle + "</strong> a été validée par le département RH " +
            "et est maintenant <strong>publiée</strong> sur la plateforme.<br><br>" +
            "Les candidats peuvent désormais y postuler.",
            "#16A34A"
        );
        send(to, subject, body);
    }

    public void sendOfferRefused(String to, String postTitle, String reason) {
        String reasonHtml = (reason != null && !reason.isBlank())
            ? "<br><br><strong>Motif :</strong><br><em style='color:#6B7280'>" + reason + "</em>"
            : "";
        String subject = "Votre offre n'a pas été validée — " + postTitle;
        String body = template(
            "Offre refusée",
            "Bonjour,",
            "Votre offre d'emploi <strong>" + postTitle + "</strong> n'a pas été validée par l'équipe RH." +
            reasonHtml + "<br><br>Vous pouvez la modifier et la soumettre à nouveau.",
            "#DC2626"
        );
        send(to, subject, body);
    }

    private String template(String heading, String greeting, String content, String accentColor) {
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#F8FAFC;font-family:Segoe UI,sans-serif'>" +
            "<div style='max-width:580px;margin:40px auto;background:#fff;border-radius:16px;" +
            "border:1px solid #E5E7EB;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)'>" +
            "<div style='background:linear-gradient(135deg,#0F172A," + accentColor + ");padding:28px 32px'>" +
            "<span style='color:#fff;font-size:1.1rem;font-weight:800;letter-spacing:0.05em'>● SIRH</span>" +
            "</div>" +
            "<div style='padding:32px'>" +
            "<h2 style='margin:0 0 16px;color:#0F172A;font-size:1.3rem'>" + heading + "</h2>" +
            "<p style='margin:0 0 12px;color:#374151'>" + greeting + "</p>" +
            "<p style='margin:0;color:#374151;line-height:1.7'>" + content + "</p>" +
            "</div>" +
            "<div style='padding:16px 32px;background:#F8FAFC;border-top:1px solid #E5E7EB;" +
            "color:#9CA3AF;font-size:0.75rem'>© 2026 SIRH — Système d'Information RH</div>" +
            "</div></body></html>";
    }
}