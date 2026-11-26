package org.example.employee.repo;

import java.util.List;
import org.example.employee.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface EmployeeRepository extends JpaRepository<Employee, String> {
    List<Employee> findByLastNameContainingIgnoreCase(String lastName);

    /**
     * Loads all employees with their associations in a single JOIN FETCH query.
     * Used by OrgChartController to avoid LazyInitializationException.
     */
    @Query("SELECT DISTINCT e FROM Employee e " +
           "LEFT JOIN FETCH e.department " +
           "LEFT JOIN FETCH e.position " +
           "LEFT JOIN FETCH e.service " +
           "LEFT JOIN FETCH e.manager")
    List<Employee> findAllWithRelations();

    @Query("SELECT e FROM Employee e WHERE LOWER(e.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(e.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(e.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Employee> searchByNameOrEmail(@Param("query") String query);

    List<Employee> findByDepartment_NameContainingIgnoreCase(String departmentName);

    java.util.Optional<Employee> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Sets manager_id for an employee (by email) only if it is currently NULL.
     * Uses native SQL to avoid any lazy-loading issue on detached entities.
     */
    @Modifying
    @Transactional
    @Query(value = "UPDATE employees SET manager_id = :managerId " +
                   "WHERE email = :email AND manager_id IS NULL",
           nativeQuery = true)
    int assignManagerIfNull(@Param("email") String email,
                            @Param("managerId") String managerId);

    @Modifying
    @Transactional
    @Query(value = "UPDATE employees SET department_id = :deptId, position_id = :posId " +
                   "WHERE email = :email",
           nativeQuery = true)
    void updateDepartmentAndPosition(@Param("email") String email,
                                     @Param("deptId") String deptId,
                                     @Param("posId") String posId);

    /** Counts active employees from the DWH dimension table (same source as Superset). */
    @Query(nativeQuery = true,
           value = "SELECT COUNT(*) FROM sirh_dwh.dim_employe WHERE is_parti = 0")
    long countActiveEmployees();
}
