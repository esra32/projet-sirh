package org.example.employee.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.example.employee.dto.ServiceUnitDTO;
import org.example.employee.service.ServiceUnitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/services")
@Tag(name = "Services")
@SecurityRequirement(name = "bearerAuth")
public class ServiceUnitController {

    private final ServiceUnitService service;

    public ServiceUnitController(ServiceUnitService service) {
        this.service = service;
    }

    @GetMapping
    public List<ServiceUnitDTO> list(@RequestParam(required = false) String departmentId) {
        if (departmentId != null && !departmentId.isBlank()) {
            return service.findByDepartment(departmentId);
        }
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceUnitDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ServiceUnitDTO> create(@RequestBody ServiceUnitDTO req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<ServiceUnitDTO> update(@PathVariable String id, @RequestBody ServiceUnitDTO req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}