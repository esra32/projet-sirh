package org.example.recruitment;

import org.example.recruitment.model.JobOffer;
import org.example.recruitment.model.OfferStatus;
import org.example.recruitment.repo.JobOfferRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class JobOfferRepositoryTest {

    @Autowired
    JobOfferRepository repo;

    @Test
    void savesAndFindsById() {
        JobOffer offer = new JobOffer();
        offer.setTitle("Dev Java");
        offer.setStatus(OfferStatus.DRAFT);
        JobOffer saved = repo.save(offer);
        assertThat(repo.findById(saved.getId())).isPresent();
    }

    @Test
    void findsByStatus() {
        JobOffer offer = new JobOffer();
        offer.setTitle("Data Analyst");
        offer.setStatus(OfferStatus.PUBLISHED);
        repo.save(offer);
        List<JobOffer> published = repo.findByStatus(OfferStatus.PUBLISHED);
        assertThat(published).isNotEmpty();
    }

    @Test
    void findsByDepartment() {
        JobOffer offer = new JobOffer();
        offer.setTitle("Dev Backend");
        offer.setDepartment("Informatique");
        offer.setStatus(OfferStatus.DRAFT);
        repo.save(offer);
        assertThat(repo.findByDepartmentContainingIgnoreCase("info")).isNotEmpty();
    }
}
