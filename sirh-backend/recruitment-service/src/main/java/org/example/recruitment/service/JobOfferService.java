package org.example.recruitment.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.example.recruitment.dto.JobOfferDTO;
import org.example.recruitment.dto.JobOfferRequest;
import org.example.recruitment.dto.SkillDTO;
import org.example.recruitment.exception.ResourceNotFoundException;
import org.example.recruitment.model.JobOffer;
import org.example.recruitment.model.OfferStatus;
import org.example.recruitment.model.Skill;
import org.example.recruitment.repo.JobOfferRepository;
import org.example.recruitment.repo.SkillRepository;
import org.example.recruitment.model.NotificationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;

@Service
public class JobOfferService {

    private static final Logger log = LoggerFactory.getLogger(JobOfferService.class);

    private final JobOfferRepository offerRepo;
    private final SkillRepository skillRepo;
    private final NotificationService notificationService;
    private final EmailService emailService;

    public JobOfferService(JobOfferRepository offerRepo, SkillRepository skillRepo,
                           NotificationService notificationService, EmailService emailService) {
        this.offerRepo = offerRepo;
        this.skillRepo = skillRepo;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    public List<JobOfferDTO> findAll() {
        return offerRepo.findAll().stream().map(this::toDto).toList();
    }

    public List<JobOfferDTO> findPublished() {
        return offerRepo.findByStatus(OfferStatus.PUBLISHED).stream().map(this::toDto).toList();
    }

    public List<JobOfferDTO> findPendingValidation() {
        return offerRepo.findByStatus(OfferStatus.PENDING_VALIDATION).stream().map(this::toDto).toList();
    }

    public List<JobOfferDTO> findByDepartment(String department) {
        return offerRepo.findByDepartmentContainingIgnoreCase(department).stream().map(this::toDto).toList();
    }

    public List<JobOfferDTO> findByCreatedByEmail(String email) {
        return offerRepo.findByCreatedByEmailIgnoreCase(email).stream().map(this::toDto).toList();
    }

    public JobOfferDTO findById(String id) {
        return toDto(offerRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offre", id)));
    }

    @Transactional
    public JobOfferDTO create(JobOfferRequest req) {
        JobOffer offer = new JobOffer();
        fillOffer(offer, req);
        // Manager soumet → statut PENDING_VALIDATION automatiquement
        offer.setStatus(OfferStatus.PENDING_VALIDATION);
        if (req.getCreatedByEmail() != null) offer.setCreatedByEmail(req.getCreatedByEmail().toLowerCase());
        if (req.getCreatedByName()  != null) offer.setCreatedByName(req.getCreatedByName());
        JobOfferDTO saved = toDto(offerRepo.save(offer));

        // Notifier le RH (non-bloquant : ne doit pas annuler la création de l'offre)
        try {
            String offerId     = saved.getId()         != null ? saved.getId()         : "";
            String poste       = saved.getTitle()      != null ? saved.getTitle()      : "";
            String department  = saved.getDepartment() != null ? saved.getDepartment() : "";
            String managerName = req.getCreatedByName() != null ? req.getCreatedByName() : "Manager";

            Map<String, String> meta = new java.util.HashMap<>();
            meta.put("offerId",    offerId);
            meta.put("poste",      poste);
            meta.put("department", department);

            notificationService.create("admin@hr.sirh.com", NotificationType.OFFER_PENDING_VALIDATION,
                "Nouvelle offre à valider",
                "Le manager " + managerName + " a soumis une offre \"" + poste + "\" en attente de validation.",
                meta);
            emailService.sendOfferPendingValidation("admin@hr.sirh.com", managerName, poste, department);
        } catch (Exception e) {
            log.warn("⚠️ Notification RH non envoyée (offre {}) : {}", saved.getId(), e.getMessage());
        }

        return saved;
    }

    @Transactional
    public JobOfferDTO update(String id, JobOfferRequest req) {
        JobOffer offer = offerRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offre", id));
        fillOffer(offer, req);
        return toDto(offerRepo.save(offer));
    }

    /** RH valide et publie l'offre */
    @Transactional
    public JobOfferDTO publish(String id) {
        JobOffer offer = offerRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offre", id));
        String managerEmail = offer.getCreatedByEmail() != null ? offer.getCreatedByEmail() : "manager@mgr.sirh.com";
        offer.setStatus(OfferStatus.PUBLISHED);
        offer.setPublishedDate(LocalDate.now());
        JobOfferDTO saved = toDto(offerRepo.save(offer));

        try {
            String poste = saved.getTitle() != null ? saved.getTitle() : "";
            Map<String, String> meta = new java.util.HashMap<>();
            meta.put("offerId", id);
            meta.put("poste",   poste);
            notificationService.create(managerEmail, NotificationType.OFFER_VALIDATED,
                "Offre validée et publiée ✅",
                "Votre offre \"" + poste + "\" a été validée par le RH et est maintenant publiée.",
                meta);
            emailService.sendOfferValidated(managerEmail, poste);
        } catch (Exception e) {
            log.warn("⚠️ Notification manager non envoyée (validation offre {}) : {}", id, e.getMessage());
        }

        return saved;
    }

    /** RH refuse l'offre */
    @Transactional
    public JobOfferDTO refuseOffer(String id, String reason) {
        JobOffer offer = offerRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offre", id));
        String managerEmail = offer.getCreatedByEmail() != null ? offer.getCreatedByEmail() : "manager@mgr.sirh.com";
        offer.setStatus(OfferStatus.CANCELLED);
        JobOfferDTO saved = toDto(offerRepo.save(offer));

        try {
            String poste  = saved.getTitle() != null ? saved.getTitle() : "";
            String motif  = reason != null ? reason : "";
            Map<String, String> meta = new java.util.HashMap<>();
            meta.put("offerId", id);
            meta.put("poste",   poste);
            meta.put("reason",  motif);
            notificationService.create(managerEmail, NotificationType.OFFER_REFUSED,
                "Offre refusée par le RH",
                "Votre offre \"" + poste + "\" a été refusée." +
                (!motif.isBlank() ? " Motif : " + motif : ""),
                meta);
            emailService.sendOfferRefused(managerEmail, poste, reason);
        } catch (Exception e) {
            log.warn("⚠️ Notification manager non envoyée (refus offre {}) : {}", id, e.getMessage());
        }

        return saved;
    }

    @Transactional
    public JobOfferDTO close(String id) {
        JobOffer offer = offerRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offre", id));
        offer.setStatus(OfferStatus.CLOSED);
        return toDto(offerRepo.save(offer));
    }

    @Transactional
    public void delete(String id) {
        if (!offerRepo.existsById(id)) throw new ResourceNotFoundException("Offre", id);
        offerRepo.deleteById(id);
    }

    private void fillOffer(JobOffer offer, JobOfferRequest req) {
        offer.setTitle(req.getTitle());
        offer.setDescription(req.getDescription());
        offer.setDepartment(req.getDepartment());
        offer.setLocation(req.getLocation());
        if (req.getStatus() != null) offer.setStatus(req.getStatus());
        offer.setPublishedDate(req.getPublishedDate());
        offer.setDeadlineDate(req.getDeadlineDate());
        if (req.getRequiredSkillIds() != null) {
            Set<Skill> skills = req.getRequiredSkillIds().stream()
                    .map(sid -> skillRepo.findById(sid)
                            .orElseThrow(() -> new ResourceNotFoundException("Compétence", sid)))
                    .collect(Collectors.toSet());
            offer.setRequiredSkills(skills);
        }
    }

    public JobOfferDTO toDto(JobOffer o) {
        JobOfferDTO dto = new JobOfferDTO();
        dto.setId(o.getId());
        dto.setTitle(o.getTitle());
        dto.setDescription(o.getDescription());
        dto.setDepartment(o.getDepartment());
        dto.setLocation(o.getLocation());
        dto.setStatus(o.getStatus());
        dto.setPublishedDate(o.getPublishedDate());
        dto.setDeadlineDate(o.getDeadlineDate());
        dto.setCreatedAt(o.getCreatedAt());
        dto.setCreatedByEmail(o.getCreatedByEmail());
        dto.setCreatedByName(o.getCreatedByName());
        dto.setRequiredSkills(o.getRequiredSkills().stream()
                .map(s -> new SkillDTO(s.getId(), s.getName())).toList());
        return dto;
    }
}
