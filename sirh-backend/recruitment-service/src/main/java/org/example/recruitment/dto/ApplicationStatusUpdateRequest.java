package org.example.recruitment.dto;

import org.example.recruitment.model.ApplicationStatus;

public class ApplicationStatusUpdateRequest {
    private ApplicationStatus status;
    private String interviewDate;         // ex: "2026-04-20 à 10h00"
    private String interviewLocation;     // ex: "Salle B2" ou "https://meet.google.com/..."
    private String interviewerName;       // ex: "Mme Leila Ben Ali"
    private String interviewInstructions; // ex: "Apportez votre CV, préparez une présentation 5min"
    private String rejectionReason;       // obligatoire si REJECTED

    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus status) { this.status = status; }
    public String getInterviewDate() { return interviewDate; }
    public void setInterviewDate(String interviewDate) { this.interviewDate = interviewDate; }
    public String getInterviewLocation() { return interviewLocation; }
    public void setInterviewLocation(String interviewLocation) { this.interviewLocation = interviewLocation; }
    public String getInterviewerName() { return interviewerName; }
    public void setInterviewerName(String interviewerName) { this.interviewerName = interviewerName; }
    public String getInterviewInstructions() { return interviewInstructions; }
    public void setInterviewInstructions(String interviewInstructions) { this.interviewInstructions = interviewInstructions; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
}