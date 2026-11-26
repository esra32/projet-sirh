package org.example.recruitment.dto;

import java.time.LocalDate;
import java.util.List;
import org.example.recruitment.model.ApplicationSource;
import org.example.recruitment.model.ApplicationStatus;

public class ApplicationDTO {
    private String id;
    private String jobOfferId;
    private String jobOfferTitle;
    private String applicantEmail;
    private String applicantName;
    private String coverLetter;
    private String cvUrl;
    private String cvFileName;
    private ApplicationStatus status;
    private byte[] letterMotivationPdf;
    private String letterMotivationFileName;
    private LocalDate appliedDate;
    private List<SkillDTO> skills;
    // skill-matching score (0-100)
    private int matchScore;

    // profil enrichi extrait par Gemini
    private CandidateProfileDTO candidateProfile;

    private ApplicationSource source;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getJobOfferId() { return jobOfferId; }
    public void setJobOfferId(String jobOfferId) { this.jobOfferId = jobOfferId; }
    public byte[] getLetterMotivationPdf() { return letterMotivationPdf; }
    public void setLetterMotivationPdf(byte[] letterMotivationPdf) { this.letterMotivationPdf = letterMotivationPdf; }
    public String getLetterMotivationFileName() { return letterMotivationFileName; }
    public void setLetterMotivationFileName(String letterMotivationFileName) { this.letterMotivationFileName = letterMotivationFileName; }
    public String getJobOfferTitle() { return jobOfferTitle; }
    public void setJobOfferTitle(String jobOfferTitle) { this.jobOfferTitle = jobOfferTitle; }
    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String applicantEmail) { this.applicantEmail = applicantEmail; }
    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String applicantName) { this.applicantName = applicantName; }
    public String getCoverLetter() { return coverLetter; }
    public void setCoverLetter(String coverLetter) { this.coverLetter = coverLetter; }
    public String getCvUrl() { return cvUrl; }
    public void setCvUrl(String cvUrl) { this.cvUrl = cvUrl; }
    public String getCvFileName() { return cvFileName; }
    public void setCvFileName(String cvFileName) { this.cvFileName = cvFileName; }
    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus status) { this.status = status; }
    public LocalDate getAppliedDate() { return appliedDate; }
    public void setAppliedDate(LocalDate appliedDate) { this.appliedDate = appliedDate; }
    public List<SkillDTO> getSkills() { return skills; }
    public void setSkills(List<SkillDTO> skills) { this.skills = skills; }
    public int getMatchScore() { return matchScore; }
    public void setMatchScore(int matchScore) { this.matchScore = matchScore; }

    public CandidateProfileDTO getCandidateProfile() { return candidateProfile; }
    public void setCandidateProfile(CandidateProfileDTO candidateProfile) { this.candidateProfile = candidateProfile; }

    public ApplicationSource getSource() { return source; }
    public void setSource(ApplicationSource source) { this.source = source; }
}
