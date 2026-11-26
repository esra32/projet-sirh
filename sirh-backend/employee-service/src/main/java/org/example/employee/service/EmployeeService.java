package org.example.employee.service;

import java.util.List;
import org.example.employee.dto.DepartmentDTO;
import org.example.employee.dto.EmployeeDTO;
import org.example.employee.dto.EmployeeRequest;
import org.example.employee.dto.EmployeeSkillDTO;
import org.example.employee.dto.PositionDTO;
import org.example.employee.exception.ResourceNotFoundException;
import org.example.employee.model.Employee;
import org.example.employee.model.EmployeeSkill;
import org.example.employee.repo.DepartmentRepository;
import org.example.employee.repo.EmployeeRepository;
import org.example.employee.repo.EmployeeSkillRepository;
import org.example.employee.repo.PositionRepository;
import org.example.employee.repo.ServiceUnitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepo;
    private final DepartmentRepository departmentRepo;
    private final PositionRepository positionRepo;
    private final ServiceUnitRepository serviceRepo;
    private final EmployeeSkillRepository skillRepo;

    public EmployeeService(EmployeeRepository employeeRepo,
                           DepartmentRepository departmentRepo,
                           PositionRepository positionRepo,
                           ServiceUnitRepository serviceRepo,
                           EmployeeSkillRepository skillRepo) {
        this.employeeRepo = employeeRepo;
        this.departmentRepo = departmentRepo;
        this.positionRepo = positionRepo;
        this.serviceRepo = serviceRepo;
        this.skillRepo = skillRepo;
    }

    public List<EmployeeDTO> findAll() {
        return employeeRepo.findAllWithRelations().stream().map(this::toDto).toList();
    }

    public long countActiveEmployees() {
        return employeeRepo.countActiveEmployees();
    }

    public EmployeeDTO findById(String id) {
        return toDto(employeeRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employé", id)));
    }

    public List<EmployeeDTO> search(String query) {
        if (query != null && query.contains("@")) {
            return employeeRepo.findByEmail(query)
                    .map(e -> List.of(toDto(e)))
                    .orElse(List.of());
        }
        return employeeRepo.searchByNameOrEmail(query)
                .stream().map(this::toDto).toList();
    }

    public List<EmployeeDTO> findByDepartment(String deptName) {
        return employeeRepo.findByDepartment_NameContainingIgnoreCase(deptName)
                .stream().map(this::toDto).toList();
    }

    /**
     * Retourne la fiche employé de l'utilisateur connecté (par email).
     * Si aucune fiche n'existe (cas d'un compte fraîchement inscrit côté auth-service),
     * une fiche minimale est créée automatiquement — l'employé/RH complète ensuite
     * le reste (département, poste, contrat…). Évite le « profil vide » après inscription.
     */
    @Transactional
    public EmployeeDTO findOrCreateByEmail(String email) {
        Employee emp = employeeRepo.findByEmail(email).orElseGet(() -> {
            Employee e = new Employee();
            e.setEmail(email);
            String[] name = deriveNameFromEmail(email);
            e.setFirstName(name[0]);
            e.setLastName(name[1]);
            return employeeRepo.save(e);
        });
        return toDto(emp);
    }

    /** Dérive un prénom/nom lisible depuis la partie locale de l'email (avant @). */
    private String[] deriveNameFromEmail(String email) {
        String local = (email != null && email.contains("@"))
                ? email.substring(0, email.indexOf('@'))
                : (email == null ? "" : email);
        String[] tokens = local.split("[._\\-]+");
        String first = tokens.length > 0 && !tokens[0].isBlank() ? capitalize(tokens[0]) : "Nouvel";
        String last  = tokens.length > 1 && !tokens[1].isBlank() ? capitalize(tokens[1]) : "Utilisateur";
        return new String[]{first, last};
    }

    private String capitalize(String s) {
        return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
    }

    @Transactional
    public EmployeeDTO create(EmployeeRequest req) {
        if (employeeRepo.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email déjà utilisé par un autre employé");
        }
        Employee emp = fromRequest(new Employee(), req);
        return toDto(employeeRepo.save(emp));
    }

    @Transactional
    public EmployeeDTO update(String id, EmployeeRequest req) {
        Employee emp = employeeRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employé", id));
        return toDto(employeeRepo.save(fromRequest(emp, req)));
    }

    @Transactional
    public void delete(String id) {
        if (!employeeRepo.existsById(id)) throw new ResourceNotFoundException("Employé", id);
        employeeRepo.deleteById(id);
    }

    @Transactional
    public List<EmployeeSkillDTO> updateSkills(String id, List<EmployeeSkillDTO> skillDtos) {
        Employee emp = employeeRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employé", id));
        skillRepo.deleteByEmployeeId(id);
        List<EmployeeSkill> saved = skillDtos.stream().map(dto -> {
            EmployeeSkill s = new EmployeeSkill(emp, dto.getSkillName(), dto.getLevel());
            return skillRepo.save(s);
        }).toList();
        return saved.stream()
                .map(s -> new EmployeeSkillDTO(s.getId(), s.getSkillName(), s.getLevel()))
                .toList();
    }

    public List<EmployeeSkillDTO> getSkills(String id) {
        if (!employeeRepo.existsById(id)) throw new ResourceNotFoundException("Employé", id);
        return skillRepo.findByEmployeeId(id).stream()
                .map(s -> new EmployeeSkillDTO(s.getId(), s.getSkillName(), s.getLevel()))
                .toList();
    }

    private Employee fromRequest(Employee emp, EmployeeRequest req) {
        emp.setFirstName(req.getFirstName());
        emp.setLastName(req.getLastName());
        emp.setEmail(req.getEmail());
        emp.setPhone(req.getPhone());
        emp.setAddress(req.getAddress());
        emp.setCity(req.getCity());
        emp.setSalary(req.getSalary());
        emp.setHireDate(req.getHireDate());
        emp.setContractType(req.getContractType());
        if (req.getDepartmentId() != null) {
            emp.setDepartment(departmentRepo.findById(req.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Département", req.getDepartmentId())));
        }
        if (req.getPositionId() != null) {
            emp.setPosition(positionRepo.findById(req.getPositionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Poste", req.getPositionId())));
        }
        // Service (optionnel)
        if (req.getServiceId() != null && !req.getServiceId().isBlank()) {
            emp.setService(serviceRepo.findById(req.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service", req.getServiceId())));
        } else {
            emp.setService(null);
        }
        // Manager direct (optionnel — self-reference)
        if (req.getManagerId() != null && !req.getManagerId().isBlank()) {
            emp.setManager(employeeRepo.findById(req.getManagerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Manager", req.getManagerId())));
        } else {
            emp.setManager(null);
        }
        return emp;
    }

    public EmployeeDTO toDto(Employee e) {
        EmployeeDTO dto = new EmployeeDTO();
        dto.setId(e.getId());
        dto.setFirstName(e.getFirstName());
        dto.setLastName(e.getLastName());
        dto.setEmail(e.getEmail());
        dto.setPhone(e.getPhone());
        dto.setAddress(e.getAddress());
        dto.setCity(e.getCity());
        dto.setSalary(e.getSalary());
        dto.setHireDate(e.getHireDate());
        dto.setContractType(e.getContractType());
        dto.setDateDepart(e.getDateDepart());
        dto.setMotifDepart(e.getMotifDepart());
        dto.setIsParti(e.getDateDepart() != null);
        if (e.getDepartment() != null) {
            DepartmentDTO d = new DepartmentDTO();
            d.setId(e.getDepartment().getId());
            d.setName(e.getDepartment().getName());
            dto.setDepartment(d);
        }
        if (e.getPosition() != null) {
            PositionDTO p = new PositionDTO();
            p.setId(e.getPosition().getId());
            p.setTitle(e.getPosition().getTitle());
            dto.setPosition(p);
        }
        if (e.getService() != null) {
            dto.setServiceId(e.getService().getId());
            dto.setServiceName(e.getService().getName());
        }
        if (e.getManager() != null) {
            dto.setManagerId(e.getManager().getId());
            dto.setManagerName(e.getManager().getFirstName() + " " + e.getManager().getLastName());
        }
        dto.setSkills(e.getSkills().stream()
                .map(s -> new EmployeeSkillDTO(s.getId(), s.getSkillName(), s.getLevel()))
                .toList());
        return dto;
    }
}