package org.example.employee.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.employee.dto.MobilityPolicyDTO;
import org.example.employee.service.MobilityPolicyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mobility/policy")
@Tag(name = "Mobility Policy")
@SecurityRequirement(name = "bearerAuth")
public class MobilityPolicyController {

    private final MobilityPolicyService service;

    public MobilityPolicyController(MobilityPolicyService service) {
        this.service = service;
    }

    /** Tout le monde peut lire la politique (pour valider en frontend) */
    @GetMapping
    public ResponseEntity<MobilityPolicyDTO> get() {
        return ResponseEntity.ok(service.get());
    }

    /** Seul le RH Admin peut modifier la politique */
    @PutMapping
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<MobilityPolicyDTO> save(@RequestBody MobilityPolicyDTO dto) {
        return ResponseEntity.ok(service.save(dto));
    }
}