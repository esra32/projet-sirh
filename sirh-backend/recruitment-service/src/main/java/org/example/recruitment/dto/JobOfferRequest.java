package org.example.recruitment.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;
import org.example.recruitment.model.OfferStatus;

public class JobOfferRequest {
    @NotBlank private String title;
    private String description;
    private String department;
    private String location;
    private OfferStatus status;
    private LocalDate publishedDate;
    private LocalDate deadlineDate;
    private List<String> requiredSkillIds;
    private String createdByName;  // nom du manager qui crée l'offre
    private String createdByEmail; // email du manager qui crée l'offre

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public OfferStatus getStatus() { return status; }
    public void setStatus(OfferStatus status) { this.status = status; }
    public LocalDate getPublishedDate() { return publishedDate; }
    public void setPublishedDate(LocalDate publishedDate) { this.publishedDate = publishedDate; }
    public LocalDate getDeadlineDate() { return deadlineDate; }
    public void setDeadlineDate(LocalDate deadlineDate) { this.deadlineDate = deadlineDate; }
    public List<String> getRequiredSkillIds() { return requiredSkillIds; }
    public void setRequiredSkillIds(List<String> requiredSkillIds) { this.requiredSkillIds = requiredSkillIds; }
    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }
}
