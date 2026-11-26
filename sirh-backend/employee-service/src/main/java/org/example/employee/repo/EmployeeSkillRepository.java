package org.example.employee.repo;

import java.util.List;
import org.example.employee.model.EmployeeSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface EmployeeSkillRepository extends JpaRepository<EmployeeSkill, String> {
    List<EmployeeSkill> findByEmployeeId(String employeeId);

    @Transactional
    void deleteByEmployeeId(String employeeId);
}





