package org.example.recruitment.dto;

import java.time.LocalDateTime;
import java.util.List;

public class MarketOfferDTO {
    private String id;
    private String title;
    private String company;
    private String city;
    private Double salaryMin;
    private Double salaryMax;
    private List<String> skills;
    private String source;
    private String keyword;
    private LocalDateTime scrapedDate;
    private String description;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public Double getSalaryMin() { return salaryMin; }
    public void setSalaryMin(Double salaryMin) { this.salaryMin = salaryMin; }
    public Double getSalaryMax() { return salaryMax; }
    public void setSalaryMax(Double salaryMax) { this.salaryMax = salaryMax; }
    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public LocalDateTime getScrapedDate() { return scrapedDate; }
    public void setScrapedDate(LocalDateTime scrapedDate) { this.scrapedDate = scrapedDate; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}