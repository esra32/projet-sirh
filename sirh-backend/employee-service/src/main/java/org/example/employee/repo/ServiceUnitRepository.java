package org.example.employee.repo;

import java.util.List;
import org.example.employee.model.ServiceUnit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceUnitRepository extends JpaRepository<ServiceUnit, String> {
    List<ServiceUnit> findByDepartmentId(String departmentId);
    List<ServiceUnit> findByParentServiceId(String parentServiceId);
    List<ServiceUnit> findByParentServiceIsNull();
    boolean existsByNameAndDepartmentId(String name, String departmentId);
}