package org.example.employee.service;

import java.util.List;
import org.example.employee.dto.DepartmentDTO;
import org.example.employee.exception.ResourceNotFoundException;
import org.example.employee.model.Department;
import org.example.employee.repo.DepartmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DepartmentService {

    private final DepartmentRepository repo;

    public DepartmentService(DepartmentRepository repo) {
        this.repo = repo;
    }

    public List<DepartmentDTO> findAll() {
        return repo.findAll().stream().map(this::toDto).toList();
    }

    public DepartmentDTO findById(String id) {
        return toDto(repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Département", id)));
    }

    @Transactional
    public DepartmentDTO create(DepartmentDTO dto) {
        if (repo.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Un département avec ce nom existe déjà");
        }
        Department dept = new Department();
        dept.setName(dto.getName());
        dept.setDescription(dto.getDescription());
        return toDto(repo.save(dept));
    }

    @Transactional
    public DepartmentDTO update(String id, DepartmentDTO dto) {
        Department dept = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Département", id));
        dept.setName(dto.getName());
        dept.setDescription(dto.getDescription());
        return toDto(repo.save(dept));
    }

    @Transactional
    public void delete(String id) {
        if (!repo.existsById(id)) {
            throw new ResourceNotFoundException("Département", id);
        }
        repo.deleteById(id);
    }

    public DepartmentDTO toDto(Department d) {
        DepartmentDTO dto = new DepartmentDTO();
        dto.setId(d.getId());
        dto.setName(d.getName());
        dto.setDescription(d.getDescription());
        return dto;
    }
}
