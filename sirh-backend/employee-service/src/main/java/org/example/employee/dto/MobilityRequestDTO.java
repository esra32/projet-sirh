package org.example.employee.dto;

import org.example.employee.model.MobilityStatus;
import java.time.LocalDate;

public class MobilityRequestDTO {

    private String id;
    private String employeeId;
    private String employeeName;
    private String employeeEmail;
    private String currentDepartment;
    private String currentPosition;
    private String targetDepartment;
    private String targetPosition;
    private String reason;
    private MobilityStatus status;
    private LocalDate requestDate;
    private LocalDate processedDate;
    private String processedByEmail;
    private String hrComment;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getEmployeeEmail() { return employeeEmail; }
    public void setEmployeeEmail(String employeeEmail) { this.employeeEmail = employeeEmail; }

    public String getCurrentDepartment() { return currentDepartment; }
    public void setCurrentDepartment(String currentDepartment) { this.currentDepartment = currentDepartment; }

    public String getCurrentPosition() { return currentPosition; }
    public void setCurrentPosition(String currentPosition) { this.currentPosition = currentPosition; }

    public String getTargetDepartment() { return targetDepartment; }
    public void setTargetDepartment(String targetDepartment) { this.targetDepartment = targetDepartment; }

    public String getTargetPosition() { return targetPosition; }
    public void setTargetPosition(String targetPosition) { this.targetPosition = targetPosition; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public MobilityStatus getStatus() { return status; }
    public void setStatus(MobilityStatus status) { this.status = status; }

    public LocalDate getRequestDate() { return requestDate; }
    public void setRequestDate(LocalDate requestDate) { this.requestDate = requestDate; }

    public LocalDate getProcessedDate() { return processedDate; }
    public void setProcessedDate(LocalDate processedDate) { this.processedDate = processedDate; }

    public String getProcessedByEmail() { return processedByEmail; }
    public void setProcessedByEmail(String processedByEmail) { this.processedByEmail = processedByEmail; }

    public String getHrComment() { return hrComment; }
    public void setHrComment(String hrComment) { this.hrComment = hrComment; }
}