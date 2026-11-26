package org.example.employee.dto;

import org.example.employee.model.SkillLevel;

public class EmployeeSkillDTO {
    private String id;
    private String skillName;
    private SkillLevel level;

    public EmployeeSkillDTO() {}

    public EmployeeSkillDTO(String id, String skillName, SkillLevel level) {
        this.id = id;
        this.skillName = skillName;
        this.level = level;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSkillName() { return skillName; }
    public void setSkillName(String skillName) { this.skillName = skillName; }

    public SkillLevel getLevel() { return level; }
    public void setLevel(SkillLevel level) { this.level = level; }
}