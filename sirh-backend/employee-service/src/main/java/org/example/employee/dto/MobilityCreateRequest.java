package org.example.employee.dto;

import jakarta.validation.constraints.NotBlank;

public class MobilityCreateRequest {

    @NotBlank
    private String employeeId;

    private String targetDepartment;
    private String targetPosition;

    @NotBlank
    private String reason;

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getTargetDepartment() { return targetDepartment; }
    public void setTargetDepartment(String targetDepartment) { this.targetDepartment = targetDepartment; }

    public String getTargetPosition() { return targetPosition; }
    public void setTargetPosition(String targetPosition) { this.targetPosition = targetPosition; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}