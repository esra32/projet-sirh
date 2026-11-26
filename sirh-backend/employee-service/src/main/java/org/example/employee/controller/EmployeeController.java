package org.example.employee.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.example.employee.dto.EmployeeDTO;
import org.example.employee.dto.EmployeeRequest;
import org.example.employee.dto.EmployeeSkillDTO;
import org.example.employee.service.EmployeeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/employees")
@Tag(name = "Employees")
@SecurityRequirement(name = "bearerAuth")
public class EmployeeController {

    private final EmployeeService service;

    public EmployeeController(EmployeeService service) {
        this.service = service;
    }

    @GetMapping
    public List<EmployeeDTO> list(@RequestParam(required = false) String search,
                                  @RequestParam(required = false) String department) {
        if (search != null && !search.isBlank()) return service.search(search);
        if (department != null && !department.isBlank()) return service.findByDepartment(department);
        return service.findAll();
    }

    @GetMapping("/me")
    public ResponseEntity<EmployeeDTO> me(java.security.Principal principal) {
        return ResponseEntity.ok(service.findOrCreateByEmail(principal.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<EmployeeDTO> create(@Valid @RequestBody EmployeeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER')")
    public ResponseEntity<EmployeeDTO> update(@PathVariable String id, @Valid @RequestBody EmployeeRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count/active")
    public ResponseEntity<Map<String, Long>> countActive() {
        return ResponseEntity.ok(Map.of("count", service.countActiveEmployees()));
    }

    @GetMapping("/{id}/skills")
    public ResponseEntity<List<EmployeeSkillDTO>> getSkills(@PathVariable String id) {
        return ResponseEntity.ok(service.getSkills(id));
    }

    @PutMapping("/{id}/skills")
    public ResponseEntity<List<EmployeeSkillDTO>> updateSkills(
            @PathVariable String id,
            @RequestBody List<EmployeeSkillDTO> skills) {
        return ResponseEntity.ok(service.updateSkills(id, skills));
    }
}
