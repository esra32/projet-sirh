package org.example.recruitment.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "job_offer_id")
    private JobOffer jobOffer;

    private String applicantEmail;
    private String applicantName;
    
    @Column(columnDefinition = "TEXT")
    private String coverLetter;
    
    @Column(columnDefinition = "TEXT")
    private String cvUrl;
    
    @Enumerated(EnumType.STRING)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Lob
    @Column(columnDefinition = "LONGBLOB")
    private byte[] cvFile;
    private String cvFileName;

    @Lob
    @Column(columnDefinition = "LONGBLOB")
    private byte[] letterMotivationPdf;
    private String letterMotivationFileName;

    private LocalDate appliedDate;

    private Integer matchScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", columnDefinition = "VARCHAR(20)")
    private ApplicationSource source = ApplicationSource.INTERNAL;

    @Column(columnDefinition = "TEXT")
    private String candidateProfileJson; // profil enrichi Gemini (JSON sérialisé)

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "application_skills",
        joinColumns = @JoinColumn(name = "application_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private Set<Skill> skills = new HashSet<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public byte[] getLetterMotivationPdf() { return letterMotivationPdf; }
    public void setLetterMotivationPdf(byte[] letterMotivationPdf) { this.letterMotivationPdf = letterMotivationPdf; }
    public String getLetterMotivationFileName() { return letterMotivationFileName; }
    public void setLetterMotivationFileName(String letterMotivationFileName) { this.letterMotivationFileName = letterMotivationFileName; }
    public JobOffer getJobOffer() { return jobOffer; }
    public void setJobOffer(JobOffer jobOffer) { this.jobOffer = jobOffer; }
    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String applicantEmail) { this.applicantEmail = applicantEmail; }
    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String applicantName) { this.applicantName = applicantName; }
    public String getCoverLetter() { return coverLetter; }
    public void setCoverLetter(String coverLetter) { this.coverLetter = coverLetter; }
    public String getCvUrl() { return cvUrl; }
    public void setCvUrl(String cvUrl) { this.cvUrl = cvUrl; }
    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus status) { this.status = status; }
    public LocalDate getAppliedDate() { return appliedDate; }
    public void setAppliedDate(LocalDate appliedDate) { this.appliedDate = appliedDate; }
    public Set<Skill> getSkills() { return skills; }
    public void setSkills(Set<Skill> skills) { this.skills = skills; }

    public Integer getMatchScore() { return matchScore; }
    public void setMatchScore(Integer matchScore) { this.matchScore = matchScore; }

    public String getCandidateProfileJson() { return candidateProfileJson; }
    public void setCandidateProfileJson(String candidateProfileJson) { this.candidateProfileJson = candidateProfileJson; }

    public byte[] getCvFile() { return cvFile; }
    public void setCvFile(byte[] cvFile) { this.cvFile = cvFile; }
    public String getCvFileName() { return cvFileName; }
    public void setCvFileName(String cvFileName) { this.cvFileName = cvFileName; }

    public ApplicationSource getSource() { return source; }
    public void setSource(ApplicationSource source) { this.source = source; }
}
