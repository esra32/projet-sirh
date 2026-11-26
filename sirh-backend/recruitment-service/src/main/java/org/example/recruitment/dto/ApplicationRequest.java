package org.example.recruitment.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public class ApplicationRequest {

    @NotNull
    private String jobOfferId;

    @NotBlank
    @Email
    private String applicantEmail;

    @NotBlank
    private String applicantName;

    private String coverLetter;
    private String cvUrl;
    private String cvBase64;
    private String cvFileName;
    private LocalDate appliedDate;
    private List<String> skillIds;

    public String getJobOfferId() { return jobOfferId; }
    public void setJobOfferId(String jobOfferId) { this.jobOfferId = jobOfferId; }
    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String applicantEmail) { this.applicantEmail = applicantEmail; }
    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String applicantName) { this.applicantName = applicantName; }
    public String getCoverLetter() { return coverLetter; }
    public void setCoverLetter(String coverLetter) { this.coverLetter = coverLetter; }
    public String getCvUrl() { return cvUrl; }
    public void setCvUrl(String cvUrl) { this.cvUrl = cvUrl; }
    public String getCvBase64() { return cvBase64; }
    public void setCvBase64(String cvBase64) { this.cvBase64 = cvBase64; }
    public String getCvFileName() { return cvFileName; }
    public void setCvFileName(String cvFileName) { this.cvFileName = cvFileName; }
    public LocalDate getAppliedDate() { return appliedDate; }
    public void setAppliedDate(LocalDate appliedDate) { this.appliedDate = appliedDate; }
    public List<String> getSkillIds() { return skillIds; }
    public void setSkillIds(List<String> skillIds) { this.skillIds = skillIds; }
}
