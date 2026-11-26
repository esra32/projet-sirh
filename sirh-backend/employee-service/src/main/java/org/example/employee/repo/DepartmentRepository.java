package org.example.employee.repo;

import java.util.Optional;
import org.example.employee.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, String> {
    Optional<Department> findByName(String name);
    boolean existsByName(String name);
}
