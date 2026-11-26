package org.example.employee.dto;

public class ServiceUnitDTO {
    private String id;
    private String name;
    private String description;
    private String departmentId;
    private String departmentName;
    private String parentServiceId;
    private String parentServiceName;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDepartmentId() { return departmentId; }
    public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
    public String getParentServiceId() { return parentServiceId; }
    public void setParentServiceId(String parentServiceId) { this.parentServiceId = parentServiceId; }
    public String getParentServiceName() { return parentServiceName; }
    public void setParentServiceName(String parentServiceName) { this.parentServiceName = parentServiceName; }
}