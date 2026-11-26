package org.example.recruitment;

import org.example.recruitment.dto.JobOfferDTO;
import org.example.recruitment.dto.JobOfferRequest;
import org.example.recruitment.exception.ResourceNotFoundException;
import org.example.recruitment.model.JobOffer;
import org.example.recruitment.model.OfferStatus;
import org.example.recruitment.repo.JobOfferRepository;
import org.example.recruitment.repo.SkillRepository;
import org.example.recruitment.service.JobOfferService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobOfferServiceTest {

    @Mock JobOfferRepository offerRepo;
    @Mock SkillRepository skillRepo;
    @InjectMocks JobOfferService service;

    JobOffer offer;

    @BeforeEach
    void setUp() {
        offer = new JobOffer();
        offer.setId("JOB1");
        offer.setTitle("Dev Java Sr");
        offer.setStatus(OfferStatus.DRAFT);
        offer.setRequiredSkills(new HashSet<>());
    }

    @Test
    void findAllReturnsList() {
        when(offerRepo.findAll()).thenReturn(List.of(offer));
        assertThat(service.findAll()).hasSize(1);
    }

    @Test
    void findByIdNotFoundThrows() {
        when(offerRepo.findById("99")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.findById("99"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void publishSetsStatusAndDate() {
        when(offerRepo.findById("JOB1")).thenReturn(Optional.of(offer));
        when(offerRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        JobOfferDTO dto = service.publish("JOB1");
        assertThat(dto.getStatus()).isEqualTo(OfferStatus.PUBLISHED);
        assertThat(dto.getPublishedDate()).isNotNull();
    }

    @Test
    void createPersistsOffer() {
        when(offerRepo.save(any())).thenReturn(offer);
        JobOfferRequest req = new JobOfferRequest();
        req.setTitle("Dev Java Sr");
        JobOfferDTO dto = service.create(req);
        assertThat(dto.getTitle()).isEqualTo("Dev Java Sr");
    }
}
