package org.example.recruitment.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.example.recruitment.dto.JobOfferDTO;
import org.example.recruitment.dto.JobOfferRequest;
import org.example.recruitment.service.JobOfferService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RequestMapping("/api/job-offers")
@Tag(name = "Job Offers")
@SecurityRequirement(name = "bearerAuth")
public class JobOfferController {

    private final JobOfferService service;

    public JobOfferController(JobOfferService service) { this.service = service; }

    @GetMapping
    public List<JobOfferDTO> list(@RequestParam(required = false) String status,
                                  @RequestParam(required = false) String department,
                                  @RequestParam(required = false) String createdByEmail) {
        if ("PUBLISHED".equalsIgnoreCase(status)) return service.findPublished();
        if (department != null && !department.isBlank()) return service.findByDepartment(department);
        if (createdByEmail != null && !createdByEmail.isBlank()) return service.findByCreatedByEmail(createdByEmail);
        return service.findAll();
    }

    @GetMapping("/{id}")
    public JobOfferDTO getById(@PathVariable String id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<JobOfferDTO> create(@Valid @RequestBody JobOfferRequest req,
                                              @AuthenticationPrincipal String authenticatedEmail) {
        // Priorité : email du token (sécurité) > email du body (frontend)
        if (authenticatedEmail != null && !authenticatedEmail.isBlank()) {
            req.setCreatedByEmail(authenticatedEmail);
            if (req.getCreatedByName() == null || req.getCreatedByName().isBlank()) {
                req.setCreatedByName(authenticatedEmail.split("@")[0]);
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    public JobOfferDTO update(@PathVariable String id, @Valid @RequestBody JobOfferRequest req) {
        return service.update(id, req);
    }

    @PostMapping("/{id}/publish")
    public JobOfferDTO publish(@PathVariable String id) {
        return service.publish(id);
    }

    @PostMapping("/{id}/close")
    public JobOfferDTO close(@PathVariable String id) {
        return service.close(id);
    }

    /** RH refuse une offre en attente de validation */
    @PostMapping("/{id}/refuse")
    public JobOfferDTO refuse(@PathVariable String id,
                              @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return service.refuseOffer(id, reason);
    }

    /** RH : récupère les offres en attente de validation */
    @GetMapping("/pending-validation")
    public List<JobOfferDTO> pendingValidation() {
        return service.findPendingValidation();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
