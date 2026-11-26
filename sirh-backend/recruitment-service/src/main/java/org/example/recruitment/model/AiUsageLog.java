package org.example.recruitment.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_usage_log")
public class AiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;
    private String endpoint;
    private String question;
    private String answer;
    private Integer inputTokens;
    private Integer outputTokens;
    private Integer costCents;
    private LocalDateTime createdAt = LocalDateTime.now();

    public AiUsageLog() {}

    public AiUsageLog(String userId, String endpoint, String question, String answer) {
        this.userId = userId;
        this.endpoint = endpoint;
        this.question = question;
        this.answer = answer;
        // Calcul approximatif des tokens (1 token ≈ 4 caractères)
        this.inputTokens = question != null ? question.length() / 4 : 0;
        this.outputTokens = answer != null ? answer.length() / 4 : 0;
        // Coût approximatif (0.0001$ par token)
        this.costCents = (this.inputTokens + this.outputTokens) * 1;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public Integer getInputTokens() { return inputTokens; }
    public void setInputTokens(Integer inputTokens) { this.inputTokens = inputTokens; }

    public Integer getOutputTokens() { return outputTokens; }
    public void setOutputTokens(Integer outputTokens) { this.outputTokens = outputTokens; }

    public Integer getCostCents() { return costCents; }
    public void setCostCents(Integer costCents) { this.costCents = costCents; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}