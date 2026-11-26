package org.example.recruitment.dto;

import java.util.List;
import java.util.Map;

public class MarketStatsDTO {
    private Map<String, Double> salaryByTitle;
    private List<String> topSkills;
    private Long totalOffers;
    private Map<String, Long> citiesDistribution;

    public Map<String, Double> getSalaryByTitle() { return salaryByTitle; }
    public void setSalaryByTitle(Map<String, Double> salaryByTitle) { this.salaryByTitle = salaryByTitle; }
    public List<String> getTopSkills() { return topSkills; }
    public void setTopSkills(List<String> topSkills) { this.topSkills = topSkills; }
    public Long getTotalOffers() { return totalOffers; }
    public void setTotalOffers(Long totalOffers) { this.totalOffers = totalOffers; }
    public Map<String, Long> getCitiesDistribution() { return citiesDistribution; }
    public void setCitiesDistribution(Map<String, Long> citiesDistribution) { this.citiesDistribution = citiesDistribution; }
}