package org.example.recruitment.dto;

public class SkillDTO {
    private String id;
    private String name;

    public SkillDTO() {}
    public SkillDTO(String id, String name) { this.id = id; this.name = name; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
