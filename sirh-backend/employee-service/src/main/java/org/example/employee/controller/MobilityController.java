package org.example.employee.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.example.employee.dto.MobilityCreateRequest;
import org.example.employee.dto.MobilityRequestDTO;
import org.example.employee.dto.MobilityStatusUpdateRequest;
import org.example.employee.model.MobilityStatus;
import org.example.employee.service.MobilityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mobility")
@Tag(name = "Mobility")
@SecurityRequirement(name = "bearerAuth")
public class MobilityController {

    private final MobilityService service;

    public MobilityController(MobilityService service) {
        this.service = service;
    }

    /** Employé soumet une demande de mobilité */
    @PostMapping
    public ResponseEntity<MobilityRequestDTO> create(@Valid @RequestBody MobilityCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    /** RH voit toutes les demandes (filtre optionnel par statut) */
    @GetMapping
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public List<MobilityRequestDTO> findAll(@RequestParam(required = false) MobilityStatus status) {
        if (status != null) return service.findByStatus(status);
        return service.findAll();
    }

    /** Employé voit ses propres demandes via son email */
    @GetMapping("/my")
    public List<MobilityRequestDTO> myRequests(@RequestParam String email) {
        return service.findByEmployeeEmail(email);
    }

    /** RH voit les demandes d'un employé spécifique */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER')")
    public List<MobilityRequestDTO> byEmployee(@PathVariable String employeeId) {
        return service.findByEmployee(employeeId);
    }

    /** Manager voit les demandes PENDING/MANAGER_APPROVED de son équipe */
    @GetMapping("/team")
    @PreAuthorize("hasAuthority('MANAGER') or hasAuthority('HR_ADMIN')")
    public List<MobilityRequestDTO> teamRequests(@RequestParam String managerEmail) {
        return service.findByManagerEmail(managerEmail);
    }

    /**
     * Met à jour le statut d'une demande.
     * - MANAGER : peut seulement passer à MANAGER_APPROVED ou REJECTED (validation de son équipe)
     * - HR_ADMIN : peut passer à tous les statuts (APPROVED, REJECTED)
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER')")
    public ResponseEntity<MobilityRequestDTO> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody MobilityStatusUpdateRequest req) {
        // Un manager ne peut pas approuver définitivement — seulement valider ou rejeter
        boolean isManagerOnly = !isHrAdmin();
        if (isManagerOnly && req.getStatus() == MobilityStatus.APPROVED) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(service.updateStatus(id, req));
    }

    private boolean isHrAdmin() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("HR_ADMIN"));
    }

    /** Supprime une demande de mobilité (accessible à tout utilisateur authentifié) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** RH purge toutes les demandes REJECTED d'un employé (utile pour réinitialiser la carence) */
    @DeleteMapping("/rejected")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<Void> deleteRejected(@RequestParam String employeeEmail) {
        service.deleteRejected(employeeEmail);
        return ResponseEntity.noContent().build();
    }
}