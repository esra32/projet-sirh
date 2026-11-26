package org.example.employee.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.example.employee.dto.PositionDTO;
import org.example.employee.service.PositionService;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/positions")
@Tag(name = "Positions")
@SecurityRequirement(name = "bearerAuth")
public class PositionController {

    private final PositionService service;

    public PositionController(PositionService service) {
        this.service = service;
    }

    @GetMapping
    public List<PositionDTO> list(@RequestParam(required = false) String departmentId) {
        // The original list method's departmentId filtering logic is moved to a new method.
        // This method will now only return all positions if departmentId is not handled here.
        // Based on the provided snippet, the intent is to introduce a new endpoint for department filtering.
        // Assuming the original list method should now just return all, or be removed/modified.
        // For now, keeping it as is, but the snippet implies a change here.
        if (departmentId != null) return service.findByDepartment(departmentId); // This line will likely need adjustment in service too
        return service.findAll();
    }

    @GetMapping("/department/{deptId}")
    public ResponseEntity<List<PositionDTO>> getByDepartment(@PathVariable String deptId) {
        return ResponseEntity.ok(service.findByDepartment(deptId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PositionDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<PositionDTO> create(@Valid @RequestBody PositionDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PositionDTO> update(@PathVariable String id, @Valid @RequestBody PositionDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
