package org.example.employee.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "mobility_requests")
public class MobilityRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    private String currentDepartment;
    private String currentPosition;

    private String targetDepartment;
    private String targetPosition;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    private MobilityStatus status = MobilityStatus.PENDING;

    private LocalDate requestDate = LocalDate.now();
    private LocalDate processedDate;

    private String processedByEmail;

    @Column(columnDefinition = "TEXT")
    private String hrComment;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

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