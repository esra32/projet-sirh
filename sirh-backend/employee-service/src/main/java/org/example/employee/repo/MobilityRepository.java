package org.example.employee.repo;

import org.example.employee.model.MobilityRequest;
import org.example.employee.model.MobilityStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MobilityRepository extends JpaRepository<MobilityRequest, String> {

    List<MobilityRequest> findByEmployee_Id(String employeeId);

    List<MobilityRequest> findByEmployee_Email(String email);

    List<MobilityRequest> findByStatus(MobilityStatus status);

    /** Toutes les demandes des employés dont le manager direct a cet email */
    List<MobilityRequest> findByEmployee_Manager_Email(String managerEmail);

    /** Supprime toutes les demandes d'un statut donné pour un employé (email) */
    void deleteByEmployee_EmailAndStatus(String email, MobilityStatus status);
}