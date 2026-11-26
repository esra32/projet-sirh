package org.example.employee.dto;

import jakarta.validation.constraints.NotNull;
import org.example.employee.model.MobilityStatus;

public class MobilityStatusUpdateRequest {

    @NotNull
    private MobilityStatus status;

    private String hrComment;
    private String processedByEmail;

    public MobilityStatus getStatus() { return status; }
    public void setStatus(MobilityStatus status) { this.status = status; }

    public String getHrComment() { return hrComment; }
    public void setHrComment(String hrComment) { this.hrComment = hrComment; }

    public String getProcessedByEmail() { return processedByEmail; }
    public void setProcessedByEmail(String processedByEmail) { this.processedByEmail = processedByEmail; }
}