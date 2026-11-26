package org.example.employee.dto;

import java.util.List;

/**
 * Nœud de l'organigramme hiérarchique.
 * children = subordonnés directs (relation managerId récursive).
 */
public class OrgNodeDTO {
    private String id;
    private String firstName;
    private String lastName;
    private String positionTitle;
    private String departmentName;
    private String departmentId;
    private String serviceName;
    private String serviceId;
    private String email;
    private String phone;
    private String contractType;
    private String managerId;
    private List<OrgNodeDTO> children;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
    public String getDepartmentId() { return departmentId; }
    public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    public String getServiceId() { return serviceId; }
    public void setServiceId(String serviceId) { this.serviceId = serviceId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getContractType() { return contractType; }
    public void setContractType(String contractType) { this.contractType = contractType; }
    public String getManagerId() { return managerId; }
    public void setManagerId(String managerId) { this.managerId = managerId; }
    public List<OrgNodeDTO> getChildren() { return children; }
    public void setChildren(List<OrgNodeDTO> children) { this.children = children; }
}