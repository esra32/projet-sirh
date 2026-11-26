package org.example.recruitment.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.example.recruitment.model.OfferStatus;

public class JobOfferDTO {
    private String id;
    private String title;
    private String description;
    private String department;
    private String location;
    private OfferStatus status;
    private LocalDate publishedDate;
    private LocalDate deadlineDate;
    private LocalDateTime createdAt;
    private List<SkillDTO> requiredSkills;
    private String createdByEmail;
    private String createdByName;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<SkillDTO> getRequiredSkills() { return requiredSkills; }
    public void setRequiredSkills(List<SkillDTO> requiredSkills) { this.requiredSkills = requiredSkills; }
    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }
    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
}
