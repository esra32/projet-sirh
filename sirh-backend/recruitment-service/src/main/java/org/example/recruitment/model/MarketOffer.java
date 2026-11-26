package org.example.recruitment.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "market_offers")
public class MarketOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String title;
    private String company;
    private String city;
    private Double salaryMin;
    private Double salaryMax;

    @Column(columnDefinition = "TEXT")
    private String skills;

    private String source = "adzuna";
    private String country = "fr";
    private String keyword;

    private LocalDateTime scrapedDate = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
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
    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = skills; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public LocalDateTime getScrapedDate() { return scrapedDate; }
    public void setScrapedDate(LocalDateTime scrapedDate) { this.scrapedDate = scrapedDate; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}