package org.example.employee.dto;

import jakarta.validation.constraints.NotBlank;

public class DepartmentDTO {
    private String id;
    @NotBlank private String name;
    private String description;
    private String managerEmployeeId;
    private String managerName;

    public DepartmentDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getManagerEmployeeId() { return managerEmployeeId; }
    public void setManagerEmployeeId(String managerEmployeeId) { this.managerEmployeeId = managerEmployeeId; }
    public String getManagerName() { return managerName; }
    public void setManagerName(String managerName) { this.managerName = managerName; }
}
