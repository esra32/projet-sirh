package org.example.employee.repo;

import org.example.employee.model.MobilityPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MobilityPolicyRepository extends JpaRepository<MobilityPolicy, String> {
}