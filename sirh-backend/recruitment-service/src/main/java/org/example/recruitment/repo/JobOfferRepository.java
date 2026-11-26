package org.example.recruitment.repo;

import java.util.List;
import org.example.recruitment.model.JobOffer;
import org.example.recruitment.model.OfferStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobOfferRepository extends JpaRepository<JobOffer, String> {
    List<JobOffer> findByStatus(OfferStatus status);
    List<JobOffer> findByDepartmentContainingIgnoreCase(String department);
    List<JobOffer> findByCreatedByEmailIgnoreCase(String createdByEmail);
}
