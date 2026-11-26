package org.example.recruitment.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.example.recruitment.dto.ApplicationDTO;
import org.example.recruitment.dto.ApplicationRequest;
import org.example.recruitment.dto.ApplicationStatusUpdateRequest;
import org.example.recruitment.model.ApplicationSource;
import org.example.recruitment.service.ApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/applications")
@Tag(name = "Applications")
@SecurityRequirement(name = "bearerAuth")
public class ApplicationController {

    private final ApplicationService service;

    public ApplicationController(ApplicationService service) { this.service = service; }

    @GetMapping
    public List<ApplicationDTO> list(@RequestParam(required = false) String offerId,
                                     @RequestParam(required = false) String email,
                                     @RequestParam(required = false) ApplicationSource source) {
        if (offerId != null && source != null) return service.findByOfferAndSource(offerId, source);
        if (offerId != null) return service.findByOffer(offerId);
        if (email != null && !email.isBlank()) return service.findByApplicant(email);
        if (source != null) return service.findBySource(source);
        return service.findAll();
    }

    // ── Endpoint public (sans JWT) — candidats externes ─────────────────────

    @Operation(summary = "Soumettre une candidature externe (sans authentification)")
    @PostMapping("/public")
    public ResponseEntity<ApplicationDTO> applyExternal(@Valid @RequestBody ApplicationRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.applyExternal(req));
    }

    @Operation(summary = "Lister les offres publiées (accès public pour le formulaire externe)")
    @GetMapping("/public/offers")
    public List<org.example.recruitment.dto.JobOfferDTO> getPublishedOffers() {
        return service.getPublishedOffersForPublic();
    }

    @GetMapping("/{id}")
    public ApplicationDTO getById(@PathVariable String id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<ApplicationDTO> apply(@Valid @RequestBody ApplicationRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.apply(req));
    }

    @PutMapping("/{id}/status")
    public ApplicationDTO updateStatus(@PathVariable String id,
                                       @RequestBody ApplicationStatusUpdateRequest req) {
        return service.updateStatus(id, req);
    }

    @GetMapping("/match/{offerId}")
    public List<ApplicationDTO> matchForOffer(@PathVariable String offerId) {
        return service.matchForOffer(offerId);
    }

    @GetMapping("/{id}/cv")
    public ResponseEntity<byte[]> downloadCv(@PathVariable String id) {
        ApplicationDTO app = service.findById(id);
        byte[] file = service.getCvBytes(id);
        if (file == null) return ResponseEntity.notFound().build();
        
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header("Content-Disposition", "attachment; filename=\"" + app.getCvFileName() + "\"")
                .body(file);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Option 2 — Génère 5 questions d'entretien personnalisées via Gemini
     * pour une candidature donnée (offre + profil candidat).
     */
    @GetMapping("/{id}/interview-questions")
    public ResponseEntity<java.util.Map<String, Object>> getInterviewQuestions(@PathVariable String id) {
        java.util.List<String> questions = service.generateInterviewQuestions(id);
        return ResponseEntity.ok(java.util.Map.of(
            "applicationId", id,
            "questions", questions
        ));
    }
}
