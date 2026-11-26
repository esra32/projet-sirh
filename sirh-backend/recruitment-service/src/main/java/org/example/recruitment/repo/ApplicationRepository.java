package org.example.recruitment.repo;

import java.util.List;
import org.example.recruitment.model.Application;
import org.example.recruitment.model.ApplicationSource;
import org.example.recruitment.model.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, String> {
    List<Application> findByJobOfferId(String jobOfferId);
    List<Application> findByApplicantEmail(String email);
    List<Application> findByStatus(ApplicationStatus status);
    List<Application> findBySource(ApplicationSource source);
    List<Application> findByJobOfferIdAndSource(String jobOfferId, ApplicationSource source);
}
