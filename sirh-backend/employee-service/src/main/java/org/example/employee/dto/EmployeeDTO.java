package org.example.employee.dto;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.example.employee.model.ContractType;

public class EmployeeDTO {
    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private String city;
    private Integer salary;
    private LocalDate hireDate;
    private DepartmentDTO department;
    private PositionDTO position;
    private ContractType contractType;
    private LocalDate dateDepart;
    private String motifDepart;
    private Boolean isParti;
    private String serviceId;
    private String serviceName;
    private String managerId;
    private String managerName;
    private List<EmployeeSkillDTO> skills = new ArrayList<>();

    public EmployeeDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public Integer getSalary() { return salary; }
    public void setSalary(Integer salary) { this.salary = salary; }
    public LocalDate getHireDate() { return hireDate; }
    public void setHireDate(LocalDate hireDate) { this.hireDate = hireDate; }
    public DepartmentDTO getDepartment() { return department; }
    public void setDepartment(DepartmentDTO department) { this.department = department; }
    public PositionDTO getPosition() { return position; }
    public void setPosition(PositionDTO position) { this.position = position; }
    public ContractType getContractType() { return contractType; }
    public void setContractType(ContractType contractType) { this.contractType = contractType; }
    public LocalDate getDateDepart() { return dateDepart; }
    public void setDateDepart(LocalDate dateDepart) { this.dateDepart = dateDepart; }
    public String getMotifDepart() { return motifDepart; }
    public void setMotifDepart(String motifDepart) { this.motifDepart = motifDepart; }
    public Boolean getIsParti() { return isParti; }
    public void setIsParti(Boolean isParti) { this.isParti = isParti; }
    public String getServiceId() { return serviceId; }
    public void setServiceId(String serviceId) { this.serviceId = serviceId; }
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    public String getManagerId() { return managerId; }
    public void setManagerId(String managerId) { this.managerId = managerId; }
    public String getManagerName() { return managerName; }
    public void setManagerName(String managerName) { this.managerName = managerName; }
    public List<EmployeeSkillDTO> getSkills() { return skills; }
    public void setSkills(List<EmployeeSkillDTO> skills) { this.skills = skills; }
}
