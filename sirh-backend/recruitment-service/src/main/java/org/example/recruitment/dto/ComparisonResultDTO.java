package org.example.recruitment.dto;

public class ComparisonResultDTO {
    private String title;
    private Double marketAverage;
    private Double internalSalary;
    private Double difference;
    private Double percentage;
    private boolean alert;
    private String recommendation;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Double getMarketAverage() { return marketAverage; }
    public void setMarketAverage(Double marketAverage) { this.marketAverage = marketAverage; }
    public Double getInternalSalary() { return internalSalary; }
    public void setInternalSalary(Double internalSalary) { this.internalSalary = internalSalary; }
    public Double getDifference() { return difference; }
    public void setDifference(Double difference) { this.difference = difference; }
    public Double getPercentage() { return percentage; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }
    public boolean isAlert() { return alert; }
    public void setAlert(boolean alert) { this.alert = alert; }
    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
}