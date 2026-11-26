package org.example.recruitment.service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.example.recruitment.dto.ApplicationDTO;
import org.example.recruitment.dto.ApplicationRequest;
import org.example.recruitment.dto.SkillDTO;
import org.example.recruitment.exception.ResourceNotFoundException;
import org.example.recruitment.model.Application;
import org.example.recruitment.model.ApplicationSource;
import org.example.recruitment.model.ApplicationStatus;
import org.example.recruitment.model.JobOffer;
import org.example.recruitment.model.Skill;
import org.example.recruitment.repo.ApplicationRepository;
import org.example.recruitment.repo.JobOfferRepository;
import org.example.recruitment.repo.SkillRepository;
import org.example.recruitment.dto.ApplicationStatusUpdateRequest;
import org.example.recruitment.model.NotificationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.Map;

@Service
public class ApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationService.class);

    private final ApplicationRepository appRepo;
    private final JobOfferRepository offerRepo;
    private final SkillRepository skillRepo;
    private final CvSkillExtractorService cvExtractor;
    private final NotificationService notificationService;
    private final EmailService emailService;

    public ApplicationService(ApplicationRepository appRepo,
                               JobOfferRepository offerRepo,
                               SkillRepository skillRepo,
                               CvSkillExtractorService cvExtractor,
                               NotificationService notificationService,
                               EmailService emailService) {
        this.appRepo = appRepo;
        this.offerRepo = offerRepo;
        this.skillRepo = skillRepo;
        this.cvExtractor = cvExtractor;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public List<ApplicationDTO> findAll() {
        return appRepo.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationDTO> findByOffer(String offerId) {
        return appRepo.findByJobOfferId(offerId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationDTO> findByApplicant(String email) {
        return appRepo.findByApplicantEmail(email).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ApplicationDTO findById(String id) {
        return toDto(appRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature", id)));
    }

    @Transactional(readOnly = true)
    public List<org.example.recruitment.dto.JobOfferDTO> getPublishedOffersForPublic() {
        return offerRepo.findByStatus(org.example.recruitment.model.OfferStatus.PUBLISHED)
                .stream()
                .map(o -> {
                    org.example.recruitment.dto.JobOfferDTO dto = new org.example.recruitment.dto.JobOfferDTO();
                    dto.setId(o.getId());
                    dto.setTitle(o.getTitle());
                    dto.setDepartment(o.getDepartment());
                    dto.setLocation(o.getLocation());
                    dto.setDeadlineDate(o.getDeadlineDate());
                    dto.setDescription(o.getDescription());
                    dto.setStatus(o.getStatus());
                    return dto;
                }).toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationDTO> findBySource(ApplicationSource source) {
        return appRepo.findBySource(source).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationDTO> findByOfferAndSource(String offerId, ApplicationSource source) {
        return appRepo.findByJobOfferIdAndSource(offerId, source).stream().map(this::toDto).toList();
    }

    @Transactional
    public ApplicationDTO applyExternal(ApplicationRequest req) {
        req.toString(); // validation
        ApplicationDTO dto = apply(req);
        // Mettre à jour la source en EXTERNAL
        Application app = appRepo.findById(dto.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidature", dto.getId()));
        app.setSource(ApplicationSource.EXTERNAL);
        appRepo.save(app);
        dto.setSource(ApplicationSource.EXTERNAL);
        return dto;
    }

    @Transactional
    public ApplicationDTO apply(ApplicationRequest req) {
        JobOffer offer = offerRepo.findById(req.getJobOfferId())
                .orElseThrow(() -> new ResourceNotFoundException("Offre", req.getJobOfferId()));

        Application app = new Application();
        app.setJobOffer(offer);
        app.setApplicantEmail(req.getApplicantEmail());
        app.setApplicantName(req.getApplicantName());
        app.setCoverLetter(req.getCoverLetter());
        app.setCvUrl(req.getCvUrl());
        app.setAppliedDate(req.getAppliedDate() != null ? req.getAppliedDate() : java.time.LocalDate.now());

        if (req.getSkillIds() != null && !req.getSkillIds().isEmpty()) {
            Set<Skill> skills = req.getSkillIds().stream()
                    .map(sid -> skillRepo.findById(sid)
                            .orElseThrow(() -> new ResourceNotFoundException("Compétence", sid)))
                    .collect(Collectors.toSet());
            app.setSkills(skills);
        } else {
            // ✨ Intelligent auto-extraction: scan cover letter + CV filename for skill keywords
            Set<Skill> autoSkills = cvExtractor.extractSkills(req.getCoverLetter(), req.getCvFileName());
            if (!autoSkills.isEmpty()) {
                app.setSkills(autoSkills);
            }
        }

        if (req.getCvBase64() != null && !req.getCvBase64().isEmpty()) {
            app.setCvFile(java.util.Base64.getDecoder().decode(req.getCvBase64()));
            app.setCvFileName(req.getCvFileName());
        }

        // Compute and persist smart score before saving
        int score = cvExtractor.computeSmartScore(app.getSkills(), offer.getRequiredSkills(), app.getCoverLetter());
        app.setMatchScore(score);

        // Extract and persist enriched candidate profile via Gemini
        try {
            org.example.recruitment.dto.CandidateProfileDTO profile =
                cvExtractor.extractCandidateProfile(req.getCoverLetter(), req.getCvFileName());
            if (profile != null) {
                app.setCandidateProfileJson(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(profile));
            }
        } catch (Exception e) {
            // Non-blocking — profile enrichment failure does not block the application
        }

        Application saved = appRepo.save(app);

        // 🔔 Notification + 📧 Email : candidature reçue (non-bloquant)
        String postTitle = offer.getTitle();
        try {
            notificationService.create(
                saved.getApplicantEmail(),
                NotificationType.APPLICATION_RECEIVED,
                "Candidature reçue",
                "Votre candidature pour le poste \"" + postTitle + "\" a bien été enregistrée.",
                Map.of("poste", postTitle, "offerId", offer.getId())
            );
            emailService.sendApplicationReceived(saved.getApplicantEmail(), saved.getApplicantName(), postTitle);
            notificationService.create(
                "admin@hr.sirh.com",
                NotificationType.NEW_APPLICATION,
                "Nouvelle candidature",
                saved.getApplicantName() + " a postulé au poste \"" + postTitle + "\".",
                Map.of("poste", postTitle, "candidat", saved.getApplicantName(), "appId", saved.getId())
            );
        } catch (Exception e) {
            log.warn("⚠️ Notifications candidature non envoyées ({}) : {}", saved.getId(), e.getMessage());
        }

        return toDto(saved);
    }

    @Transactional
    public ApplicationDTO updateStatus(String id, ApplicationStatusUpdateRequest req) {
        Application app = appRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature", id));

        ApplicationStatus status = req.getStatus();
        app.setStatus(status);
        Application saved = appRepo.save(app);

        String postTitle = app.getJobOffer().getTitle();
        String candidateName = app.getApplicantName();
        String candidateEmail = app.getApplicantEmail();
        String department = app.getJobOffer().getDepartment();
        // Email du manager ayant créé l'offre (dynamique)
        String managerEmail = app.getJobOffer().getCreatedByEmail() != null
            ? app.getJobOffer().getCreatedByEmail()
            : "manager@mgr.sirh.com";

        Map<String, String> meta = new HashMap<>();
        meta.put("poste", postTitle);
        meta.put("appId", id);

        try {
            switch (status) {
                case INTERVIEW_SCHEDULED -> {
                    String date = req.getInterviewDate();
                    String location = req.getInterviewLocation();
                    String interviewer = req.getInterviewerName();
                    String instructions = req.getInterviewInstructions();
                    if (date != null) meta.put("interviewDate", date);
                    if (location != null) meta.put("interviewLocation", location);
                    if (interviewer != null) meta.put("interviewerName", interviewer);
                    if (instructions != null) meta.put("interviewInstructions", instructions);

                    emailService.sendInterviewScheduled(candidateEmail, candidateName, postTitle, date, location, interviewer, instructions);
                    notificationService.create(candidateEmail, NotificationType.INTERVIEW_SCHEDULED,
                        "Entretien planifié",
                        "Vous êtes convoqué(e) en entretien pour le poste \"" + postTitle + "\"" +
                        (date != null ? " le " + date : "") +
                        (location != null ? " — " + location : "") + ".",
                        meta);
                    notificationService.create("admin@hr.sirh.com", NotificationType.EMAIL_SENT_CONFIRMATION,
                        "Email de convocation envoyé",
                        "L'email de convocation a été envoyé à " + candidateName + " pour le poste \"" + postTitle + "\".",
                        meta);
                    notificationService.create(managerEmail, NotificationType.INTERVIEW_IN_DEPT,
                        "Entretien planifié dans votre département",
                        "Un entretien est planifié pour " + candidateName + " au poste \"" + postTitle + "\"" +
                        (department != null ? " (" + department + ")" : "") +
                        (date != null ? " le " + date : "") + ".",
                        meta);
                }
                case ACCEPTED -> {
                    emailService.sendApplicationAccepted(candidateEmail, candidateName, postTitle);
                    notificationService.create(candidateEmail, NotificationType.APPLICATION_ACCEPTED,
                        "Candidature acceptée",
                        "Félicitations ! Votre candidature pour le poste \"" + postTitle + "\" a été retenue.",
                        meta);
                    notificationService.create(managerEmail, NotificationType.CANDIDATE_ACCEPTED_IN_DEPT,
                        "Candidat accepté dans votre département",
                        candidateName + " a été accepté(e) pour le poste \"" + postTitle + "\"" +
                        (department != null ? " dans le département " + department : "") + ".",
                        meta);
                }
                case REJECTED -> {
                    String reason = req.getRejectionReason();
                    if (reason != null) meta.put("rejectionReason", reason);
                    emailService.sendApplicationRejected(candidateEmail, candidateName, postTitle, reason);
                    notificationService.create(candidateEmail, NotificationType.APPLICATION_REJECTED,
                        "Résultat de votre candidature",
                        "Votre candidature pour le poste \"" + postTitle + "\" n'a pas été retenue." +
                        (reason != null && !reason.isBlank() ? " Motif : " + reason : ""),
                        meta);
                    // Notifier le RH que l'email de refus a été envoyé
                    notificationService.create("admin@hr.sirh.com", NotificationType.EMAIL_SENT_CONFIRMATION,
                        "Email de refus envoyé",
                        "L'email de refus a été envoyé à " + candidateName + " pour le poste \"" + postTitle + "\"." +
                        (reason != null && !reason.isBlank() ? " Motif : " + reason : ""),
                        meta);
                }
                default -> {}
            }
        } catch (Exception e) {
            log.warn("⚠️ Notifications statut candidature non envoyées ({} → {}) : {}", id, status, e.getMessage());
        }

        return toDto(saved);
    }

    @Transactional
    public void delete(String id) {
        if (!appRepo.existsById(id)) throw new ResourceNotFoundException("Candidature", id);
        appRepo.deleteById(id);
    }

    /**
     * Returns applications for an offer ranked by skill-match score (descending).
     * Score = (matching skills count / required skills count) * 100
     */
    public List<ApplicationDTO> matchForOffer(String offerId) {
        JobOffer offer = offerRepo.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offre", offerId));
 
        Set<String> requiredIds = offer.getRequiredSkills().stream()
                .map(Skill::getId).collect(Collectors.toSet());
 
        return appRepo.findByJobOfferId(offerId).stream()
                .map(app -> {
                    ApplicationDTO dto = toDto(app);
                    if (!requiredIds.isEmpty()) {
                        long matched = app.getSkills().stream()
                                .map(Skill::getId)
                                .filter(requiredIds::contains)
                                .count();
                        dto.setMatchScore((int) (matched * 100 / requiredIds.size()));
                    }
                    return dto;
                })
                .sorted((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()))
                .toList();
    }

    @Transactional(readOnly = true)
    public byte[] getCvBytes(String id) {
        return appRepo.findById(id).map(Application::getCvFile).orElse(null);
    }

    public ApplicationDTO toDto(Application a) {
        ApplicationDTO dto = new ApplicationDTO();
        dto.setId(a.getId());
        dto.setJobOfferId(a.getJobOffer().getId());
        dto.setJobOfferTitle(a.getJobOffer().getTitle());
        dto.setApplicantEmail(a.getApplicantEmail());
        dto.setApplicantName(a.getApplicantName());
        dto.setCoverLetter(a.getCoverLetter());
        dto.setCvUrl(a.getCvUrl());
        dto.setStatus(a.getStatus());
        dto.setAppliedDate(a.getAppliedDate());
        dto.setCvFileName(a.getCvFileName());
        dto.setSkills(a.getSkills().stream()
                .map(s -> new SkillDTO(s.getId(), s.getName())).toList());
        dto.setMatchScore(a.getMatchScore() != null ? a.getMatchScore() : 0);
        dto.setSource(a.getSource());

        // Désérialiser le profil enrichi
        if (a.getCandidateProfileJson() != null && !a.getCandidateProfileJson().isBlank()) {
            try {
                org.example.recruitment.dto.CandidateProfileDTO profile =
                    new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(a.getCandidateProfileJson(),
                                   org.example.recruitment.dto.CandidateProfileDTO.class);
                dto.setCandidateProfile(profile);
            } catch (Exception ignored) {}
        }

        return dto;
    }

    // ═══════════════════════════════════════════════════════════════
    // Option 2 — Générer questions d'entretien
    // ═══════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public java.util.List<String> generateInterviewQuestions(String applicationId) {
        Application app = appRepo.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature", applicationId));

        java.util.List<String> requiredSkillNames = app.getJobOffer().getRequiredSkills()
                .stream().map(Skill::getName).toList();

        return cvExtractor.generateInterviewQuestions(
                app.getJobOffer().getTitle(),
                app.getJobOffer().getDescription(),
                app.getApplicantName(),
                app.getCoverLetter(),
                requiredSkillNames
        );
    }
}
