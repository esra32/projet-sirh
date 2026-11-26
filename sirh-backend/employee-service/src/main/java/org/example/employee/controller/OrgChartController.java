package org.example.employee.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.example.employee.dto.OrgNodeDTO;
import org.example.employee.model.Employee;
import org.example.employee.repo.EmployeeRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Expose l'arbre hiérarchique de l'entreprise basé sur la relation
 * Employee.managerId (auto-référence).
 *
 * GET /api/orgchart/tree → liste des nœuds racine avec enfants imbriqués.
 */
@RestController
@RequestMapping("/api/orgchart")
@Tag(name = "OrgChart")
@SecurityRequirement(name = "bearerAuth")
public class OrgChartController {

    private final EmployeeRepository employeeRepo;

    public OrgChartController(EmployeeRepository employeeRepo) {
        this.employeeRepo = employeeRepo;
    }

    /**
     * Retourne l'arbre hiérarchique complet.
     * @Transactional(readOnly = true) keeps the Hibernate session open so that
     * any remaining LAZY proxies can be resolved during tree traversal.
     * The JOIN FETCH query already loads department, position, service and manager
     * eagerly — @Transactional is belt-and-suspenders.
     */
    @GetMapping("/tree")
    @Transactional(readOnly = true)
    public List<OrgNodeDTO> getTree() {
        List<Employee> all = employeeRepo.findAllWithRelations();
        return buildTree(all);
    }

    /**
     * Builds the org tree in O(n) using a parent→children map.
     * Each employee is visited exactly once.
     */
    private List<OrgNodeDTO> buildTree(List<Employee> all) {
        // Map nodeId → DTO (built once per employee)
        Map<String, OrgNodeDTO> dtoMap = new HashMap<>();
        for (Employee e : all) {
            dtoMap.put(e.getId(), toNode(e));
        }

        // Map parentId → list of children DTOs
        Map<String, List<OrgNodeDTO>> childrenMap = new HashMap<>();
        List<OrgNodeDTO> roots = new ArrayList<>();

        for (Employee e : all) {
            String mgId = e.getManager() != null ? e.getManager().getId() : null;
            OrgNodeDTO dto = dtoMap.get(e.getId());
            if (mgId == null) {
                roots.add(dto);
            } else {
                childrenMap.computeIfAbsent(mgId, k -> new ArrayList<>()).add(dto);
            }
        }

        // Assign children to each node
        for (Map.Entry<String, List<OrgNodeDTO>> entry : childrenMap.entrySet()) {
            OrgNodeDTO parent = dtoMap.get(entry.getKey());
            if (parent != null) {
                parent.setChildren(entry.getValue());
            }
        }

        return roots;
    }

    private OrgNodeDTO toNode(Employee e) {
        OrgNodeDTO n = new OrgNodeDTO();
        n.setId(e.getId());
        n.setFirstName(e.getFirstName());
        n.setLastName(e.getLastName());
        n.setEmail(e.getEmail());
        n.setPhone(e.getPhone());
        n.setContractType(e.getContractType() != null ? e.getContractType().name() : null);
        if (e.getPosition()   != null) n.setPositionTitle(e.getPosition().getTitle());
        if (e.getDepartment() != null) {
            n.setDepartmentName(e.getDepartment().getName());
            n.setDepartmentId(e.getDepartment().getId());
        }
        if (e.getService() != null) {
            n.setServiceName(e.getService().getName());
            n.setServiceId(e.getService().getId());
        }
        n.setManagerId(e.getManager() != null ? e.getManager().getId() : null);
        return n;
    }
}