package org.example.employee.repo;

import java.util.List;
import org.example.employee.model.Position;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PositionRepository extends JpaRepository<Position, String> {
    List<Position> findByDepartmentId(String departmentId);
}
