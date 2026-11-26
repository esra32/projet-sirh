package org.example.employee.service;

import java.util.List;
import org.example.employee.dto.ServiceUnitDTO;
import org.example.employee.exception.ResourceNotFoundException;
import org.example.employee.model.ServiceUnit;
import org.example.employee.repo.DepartmentRepository;
import org.example.employee.repo.ServiceUnitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServiceUnitService {

    private final ServiceUnitRepository serviceRepo;
    private final DepartmentRepository departmentRepo;

    public ServiceUnitService(ServiceUnitRepository serviceRepo,
                               DepartmentRepository departmentRepo) {
        this.serviceRepo = serviceRepo;
        this.departmentRepo = departmentRepo;
    }

    public List<ServiceUnitDTO> findAll() {
        return serviceRepo.findAll().stream().map(this::toDto).toList();
    }

    public List<ServiceUnitDTO> findByDepartment(String departmentId) {
        return serviceRepo.findByDepartmentId(departmentId).stream().map(this::toDto).toList();
    }

    public ServiceUnitDTO findById(String id) {
        return toDto(serviceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", id)));
    }

    @Transactional
    public ServiceUnitDTO create(ServiceUnitDTO req) {
        ServiceUnit s = new ServiceUnit();
        return toDto(serviceRepo.save(applyRequest(s, req)));
    }

    @Transactional
    public ServiceUnitDTO update(String id, ServiceUnitDTO req) {
        ServiceUnit s = serviceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", id));
        return toDto(serviceRepo.save(applyRequest(s, req)));
    }

    @Transactional
    public void delete(String id) {
        if (!serviceRepo.existsById(id)) throw new ResourceNotFoundException("Service", id);
        serviceRepo.deleteById(id);
    }

    private ServiceUnit applyRequest(ServiceUnit s, ServiceUnitDTO req) {
        s.setName(req.getName());
        s.setDescription(req.getDescription());
        if (req.getDepartmentId() != null && !req.getDepartmentId().isBlank()) {
            s.setDepartment(departmentRepo.findById(req.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Département", req.getDepartmentId())));
        }
        if (req.getParentServiceId() != null && !req.getParentServiceId().isBlank()) {
            s.setParentService(serviceRepo.findById(req.getParentServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service parent", req.getParentServiceId())));
        } else {
            s.setParentService(null);
        }
        return s;
    }

    public ServiceUnitDTO toDto(ServiceUnit s) {
        ServiceUnitDTO dto = new ServiceUnitDTO();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setDescription(s.getDescription());
        if (s.getDepartment() != null) {
            dto.setDepartmentId(s.getDepartment().getId());
            dto.setDepartmentName(s.getDepartment().getName());
        }
        if (s.getParentService() != null) {
            dto.setParentServiceId(s.getParentService().getId());
            dto.setParentServiceName(s.getParentService().getName());
        }
        return dto;
    }
}