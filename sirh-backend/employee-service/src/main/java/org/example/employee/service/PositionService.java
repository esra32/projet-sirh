package org.example.employee.service;

import java.util.List;
import org.example.employee.dto.PositionDTO;
import org.example.employee.exception.ResourceNotFoundException;
import org.example.employee.model.Position;
import org.example.employee.repo.DepartmentRepository;
import org.example.employee.repo.PositionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PositionService {

    private final PositionRepository positionRepo;
    private final DepartmentRepository departmentRepo;

    public PositionService(PositionRepository positionRepo, DepartmentRepository departmentRepo) {
        this.positionRepo = positionRepo;
        this.departmentRepo = departmentRepo;
    }

    public List<PositionDTO> findAll() {
        return positionRepo.findAll().stream().map(this::toDto).toList();
    }

    public List<PositionDTO> findByDepartment(String deptId) {
        return positionRepo.findByDepartmentId(deptId).stream().map(this::toDto).toList();
    }

    public PositionDTO findById(String id) {
        return toDto(positionRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Poste", id)));
    }

    @Transactional
    public PositionDTO create(PositionDTO dto) {
        Position p = new Position();
        p.setTitle(dto.getTitle());
        p.setDescription(dto.getDescription());
        if (dto.getDepartmentId() != null) {
            p.setDepartment(departmentRepo.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Département", dto.getDepartmentId())));
        }
        return toDto(positionRepo.save(p));
    }

    @Transactional
    public PositionDTO update(String id, PositionDTO dto) {
        Position p = positionRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Poste", id));
        p.setTitle(dto.getTitle());
        p.setDescription(dto.getDescription());
        if (dto.getDepartmentId() != null) {
            p.setDepartment(departmentRepo.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Département", dto.getDepartmentId())));
        }
        return toDto(positionRepo.save(p));
    }

    @Transactional
    public void delete(String id) {
        if (!positionRepo.existsById(id)) throw new ResourceNotFoundException("Poste", id);
        positionRepo.deleteById(id);
    }

    public PositionDTO toDto(Position p) {
        PositionDTO dto = new PositionDTO();
        dto.setId(p.getId());
        dto.setTitle(p.getTitle());
        dto.setDescription(p.getDescription());
        if (p.getDepartment() != null) dto.setDepartmentId(p.getDepartment().getId());
        return dto;
    }
}
