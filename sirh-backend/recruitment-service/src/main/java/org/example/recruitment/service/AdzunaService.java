package org.example.recruitment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.recruitment.dto.ComparisonResultDTO;
import org.example.recruitment.dto.MarketOfferDTO;
import org.example.recruitment.dto.MarketStatsDTO;
import org.example.recruitment.model.MarketOffer;
import org.example.recruitment.repo.MarketOfferRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdzunaService {

    private static final Logger log = LoggerFactory.getLogger(AdzunaService.class);

    private final MarketOfferRepository repo;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${adzuna.app_id:}")
    private String appId;

    @Value("${adzuna.app_key:}")
    private String appKey;

    @Value("${adzuna.country:fr}")
    private String country;

    @Value("${gemini.apiKey:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    public AdzunaService(MarketOfferRepository repo, ObjectMapper objectMapper) {
        this.repo = repo;
        this.objectMapper = objectMapper;
    }

    // ─── Synchronisation Adzuna ──────────────────────────────────────────────

    public int syncFromAdzuna(String keyword) {
        int imported = 0;
        try {
            String url = "https://api.adzuna.com/v1/api/jobs/" + country + "/search/1"
                    + "?app_id=" + appId
                    + "&app_key=" + appKey
                    + "&results_per_page=20"
                    + "&what=" + keyword.replace(" ", "%20")
                    + "&content-type=application/json";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Adzuna API error: status {}", response.statusCode());
                return 0;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode results = root.path("results");

            for (JsonNode node : results) {
                String title   = node.path("title").asText("");
                String company = node.path("company").path("display_name").asText("");

                if (repo.existsByTitleAndCompany(title, company)) continue;

                MarketOffer offer = new MarketOffer();
                offer.setTitle(title);
                offer.setCompany(company);
                offer.setCity(extractCity(node.path("location").path("display_name").asText("")));
                offer.setSalaryMin(node.has("salary_min") ? node.path("salary_min").asDouble() : null);
                offer.setSalaryMax(node.has("salary_max") ? node.path("salary_max").asDouble() : null);
                offer.setDescription(node.path("description").asText(""));
                offer.setSource("adzuna");
                offer.setCountry(country);
                offer.setKeyword(keyword);
                offer.setScrapedDate(LocalDateTime.now());

                // Extraction des compétences via Gemini si clé disponible
                List<String> skills = extractSkillsFromDescription(offer.getDescription());
                offer.setSkills(objectMapper.writeValueAsString(skills));

                repo.save(offer);
                imported++;
            }

        } catch (Exception e) {
            log.error("Erreur lors de la synchronisation Adzuna: {}", e.getMessage());
        }
        return imported;
    }

    // ─── Mots-clés pour extraction heuristique ──────────────────────────────

    private static final List<String> SKILL_KEYWORDS = List.of(
        "Java", "Python", "JavaScript", "TypeScript", "SQL", "Angular", "React", "Vue.js",
        "Spring Boot", "Spring", "Node.js", "Docker", "Kubernetes", "Git", "CI/CD",
        "Linux", "AWS", "Azure", "GCP", "Terraform", "Ansible", "Jenkins",
        "Power BI", "Tableau", "Spark", "Kafka", "Airflow", "dbt", "Hadoop",
        "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn",
        "Data Science", "NLP", "Computer Vision", "LLM",
        "REST", "API", "Microservices", "GraphQL", "MongoDB", "PostgreSQL", "MySQL",
        "Redis", "Elasticsearch", "Figma", "UX", "Scrum", "Agile", "JIRA",
        "C#", "C++", "Golang", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
        "HTML", "CSS", "SASS", "Webpack", "Jest", "JUnit", "Selenium",
        "SAP", "Salesforce", "Excel", "Power Automate", "Dynamics 365",
        "OWASP", "Cybersécurité", "Sécurité informatique", "Penetration Testing",
        "Recrutement", "SIRH", "Paie", "Gestion de projet", "Communication"
    );

    // ─── Gemini : extraction de compétences (avec fallback heuristique) ──────

    private List<String> extractSkillsFromDescription(String description) {
        if (description == null || description.isBlank()) return List.of();

        // Gemini si clé disponible
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                String prompt = "Analyse cette offre d'emploi et extrais uniquement les compétences techniques demandées. "
                        + "Réponds uniquement en JSON avec ce format exact : {\"skills\": [\"skill1\", \"skill2\"]}. "
                        + "Maximum 10 compétences.\n\n" + description;

                String raw = callGemini(prompt, 300);
                if (raw != null && !raw.isBlank()) {
                    JsonNode json = objectMapper.readTree(raw);
                    List<String> skills = new ArrayList<>();
                    json.path("skills").forEach(s -> skills.add(s.asText()));
                    if (!skills.isEmpty()) return skills;
                }
            } catch (Exception e) {
                log.warn("Gemini extraction échouée, fallback heuristique: {}", e.getMessage());
            }
        }

        // Fallback heuristique : recherche par mots-clés
        String lower = description.toLowerCase();
        return SKILL_KEYWORDS.stream()
                .filter(skill -> lower.contains(skill.toLowerCase()))
                .limit(10)
                .collect(Collectors.toList());
    }

    // ─── Compétences marché pour un mot-clé donné (liaison offre ↔ Adzuna) ──

    public Map<String, Object> getSkillsByKeyword(String keyword) {
        List<String> skillsJsonList = repo.findSkillsJsonByKeyword(keyword);
        long count = repo.countByKeyword(keyword);

        Map<String, Integer> freq = new HashMap<>();
        for (String skillsJson : skillsJsonList) {
            try {
                objectMapper.readTree(skillsJson).forEach(s -> freq.merge(s.asText(), 1, Integer::sum));
            } catch (Exception ignored) {}
        }

        List<String> topSkills = freq.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(12)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("keyword", keyword);
        result.put("skills", topSkills);
        result.put("marketOfferCount", count);
        result.put("hasData", count > 0);
        return result;
    }

    // ─── Lecture des offres ──────────────────────────────────────────────────

    public long clearAllOffers() {
        long count = repo.count();
        repo.deleteAll();
        return count;
    }

    /**
     * Retourne une page d'offres (serveur-side).
     )* @param page numéro de page (0-based)
     * @param size nombre d'offres par page (max 50)
     */
    public Map<String, Object> getOffersPage(int page, int size) {
        int safeSize = Math.min(size, 50);   // jamais plus de 50 par requête
        Page<MarketOffer> pageResult = repo.findAllByOrderByScrapedDateDesc(
                PageRequest.of(page, safeSize));
        List<MarketOfferDTO> content = pageResult.getContent()
                .stream().map(this::toDto).collect(Collectors.toList());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", content);
        response.put("page", page);
        response.put("size", safeSize);
        response.put("totalElements", pageResult.getTotalElements());
        response.put("totalPages", pageResult.getTotalPages());
        return response;
    }

    // ─── Statistiques marché ─────────────────────────────────────────────────

    public MarketStatsDTO getStats() {
        MarketStatsDTO stats = new MarketStatsDTO();
        stats.setTotalOffers((long) repo.count());

        // Salaire moyen par titre
        Map<String, Double> salaryByTitle = new LinkedHashMap<>();
        repo.findAvgSalaryByTitle().forEach(row ->
                salaryByTitle.put((String) row[0], (Double) row[1]));
        stats.setSalaryByTitle(salaryByTitle);

        // Distribution par ville
        Map<String, Long> cities = new LinkedHashMap<>();
        repo.findCountByCity().forEach(row ->
                cities.put((String) row[0], (Long) row[1]));
        stats.setCitiesDistribution(cities);

        // Top 10 compétences
        stats.setTopSkills(computeTopSkills(10));

        return stats;
    }

    // ─── Comparaison salaire interne vs marché ───────────────────────────────

    public ComparisonResultDTO compare(String title, double internalSalary) {
        List<Object[]> rows = repo.findAvgSalaryByTitle();
        OptionalDouble marketAvgOpt = rows.stream()
                .filter(r -> ((String) r[0]).toLowerCase().contains(title.toLowerCase()))
                .mapToDouble(r -> (Double) r[1])
                .findFirst();

        ComparisonResultDTO result = new ComparisonResultDTO();
        result.setTitle(title);
        result.setInternalSalary(internalSalary);

        if (marketAvgOpt.isEmpty()) {
            result.setMarketAverage(null);
            result.setAlert(false);
            result.setRecommendation("Pas assez de données marché pour ce poste.");
            return result;
        }

        double marketAvg = marketAvgOpt.getAsDouble();
        double diff = internalSalary - marketAvg;
        double pct = marketAvg > 0 ? (diff / marketAvg) * 100 : 0;

        result.setMarketAverage(marketAvg);
        result.setDifference(diff);
        result.setPercentage(Math.round(pct * 10.0) / 10.0);
        result.setAlert(pct < -15);

        if (pct < -20) {
            result.setRecommendation("Salaire très en dessous du marché (-" + Math.abs(Math.round(pct)) + "%). Révision urgente recommandée.");
        } else if (pct < -15) {
            result.setRecommendation("Salaire en dessous du marché (-" + Math.abs(Math.round(pct)) + "%). Risque de départ élevé.");
        } else if (pct < 0) {
            result.setRecommendation("Légèrement sous le marché. Surveiller lors de la prochaine revue salariale.");
        } else {
            result.setRecommendation("Salaire aligné avec le marché. Bonne compétitivité.");
        }

        return result;
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    private List<String> computeTopSkills(int limit) {
        Map<String, Integer> freq = new HashMap<>();
        // Charge uniquement la colonne skills (JSON) — pas les entités complètes
        repo.findAllSkillsJson().forEach(skillsJson -> {
            try {
                JsonNode arr = objectMapper.readTree(skillsJson);
                arr.forEach(s -> freq.merge(s.asText(), 1, Integer::sum));
            } catch (Exception ignored) {}
        });
        return freq.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(limit)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    private String extractCity(String locationDisplay) {
        if (locationDisplay == null || locationDisplay.isBlank()) return "Inconnue";
        String[] parts = locationDisplay.split(",");
        return parts[0].trim();
    }

    private MarketOfferDTO toDto(MarketOffer m) {
        MarketOfferDTO dto = new MarketOfferDTO();
        dto.setId(m.getId());
        dto.setTitle(m.getTitle());
        dto.setCompany(m.getCompany());
        dto.setCity(m.getCity());
        dto.setSalaryMin(m.getSalaryMin());
        dto.setSalaryMax(m.getSalaryMax());
        dto.setSource(m.getSource());
        dto.setKeyword(m.getKeyword());
        dto.setScrapedDate(m.getScrapedDate());
        dto.setDescription(m.getDescription());

        if (m.getSkills() != null && !m.getSkills().isBlank()) {
            try {
                JsonNode arr = objectMapper.readTree(m.getSkills());
                List<String> skills = new ArrayList<>();
                arr.forEach(s -> skills.add(s.asText()));
                dto.setSkills(skills);
            } catch (Exception e) {
                dto.setSkills(List.of());
            }
        } else {
            dto.setSkills(List.of());
        }
        return dto;
    }

    // ─── Appel Gemini (même pattern que CvSkillExtractorService) ────────────

    private String callGemini(String prompt, int maxTokens) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + geminiModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", prompt))
        )));
        body.put("generationConfig", Map.of(
                "temperature", 0.2,
                "maxOutputTokens", maxTokens
        ));

        String requestJson = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("Gemini API returned status {}", response.statusCode());
            return null;
        }

        JsonNode root = objectMapper.readTree(response.body());
        String text = root.path("candidates").isArray() && root.path("candidates").size() > 0
                ? root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText()
                : "";

        return text.trim()
                .replaceAll("(?s)^```[a-zA-Z]*\\s*", "")
                .replaceAll("(?s)```\\s*$", "")
                .trim();
    }
}







