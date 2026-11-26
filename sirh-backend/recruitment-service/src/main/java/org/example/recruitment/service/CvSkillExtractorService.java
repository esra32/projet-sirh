package org.example.recruitment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.example.recruitment.dto.CandidateProfileDTO;
import org.example.recruitment.model.Skill;
import org.example.recruitment.repo.SkillRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Intelligent CV Skill Extraction Service.
 * Scans cover letters and CV filenames for skill keywords,
 * then auto-maps them to existing Skill entities.
 */
@Service
public class CvSkillExtractorService {

    private static final Logger log = LoggerFactory.getLogger(CvSkillExtractorService.class);

    private final SkillRepository skillRepo;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${gemini.apiKey:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-3-flash}")
    private String geminiModel;

    // Keyword aliases → canonical skill name
    private static final Map<String, List<String>> SKILL_ALIASES = new LinkedHashMap<>();
    static {
        SKILL_ALIASES.put("Java",              List.of("java", "jdk", "jvm", "openjdk", "java17", "java11"));
        SKILL_ALIASES.put("Spring Boot",       List.of("spring", "spring boot", "springboot", "spring-boot", "spring framework"));
        SKILL_ALIASES.put("Angular",           List.of("angular", "angular17", "angular 17", "angularjs"));
        SKILL_ALIASES.put("TypeScript",        List.of("typescript", "ts", "type script"));
        SKILL_ALIASES.put("MongoDB",           List.of("mongodb", "mongo", "nosql"));
        SKILL_ALIASES.put("Docker",            List.of("docker", "conteneur", "container", "dockerfile"));
        SKILL_ALIASES.put("Kubernetes",        List.of("kubernetes", "k8s", "kube", "orchestration"));
        SKILL_ALIASES.put("Python",            List.of("python", "python3", "py", "pandas", "numpy", "jupyter"));
        SKILL_ALIASES.put("React",             List.of("react", "reactjs", "react.js", "react native"));
        SKILL_ALIASES.put("SQL",               List.of("sql", "mysql", "postgresql", "postgres", "oracle db", "base de données"));
        SKILL_ALIASES.put("Figma",             List.of("figma", "sketch", "adobe xd"));
        SKILL_ALIASES.put("Git",               List.of("git", "github", "gitlab", "bitbucket", "version control"));
        SKILL_ALIASES.put("CI/CD",             List.of("ci/cd", "cicd", "jenkins", "github actions", "pipeline", "devops"));
        SKILL_ALIASES.put("Communication",     List.of("communication", "rédaction", "présentation", "prise de parole"));
        SKILL_ALIASES.put("Power BI",          List.of("power bi", "powerbi", "tableau", "business intelligence", "bi"));
        SKILL_ALIASES.put("Machine Learning",  List.of("machine learning", "ml", "deep learning", "ia", "intelligence artificielle", "tensorflow", "scikit"));
        SKILL_ALIASES.put("UX Design",         List.of("ux", "ux design", "user experience", "wireframe", "prototype"));
        SKILL_ALIASES.put("Scrum",             List.of("scrum", "agile", "kanban", "sprint", "méthodologie agile"));
        SKILL_ALIASES.put("Gestion de projet", List.of("gestion de projet", "project management", "chef de projet", "planification"));
        SKILL_ALIASES.put("Recrutement",       List.of("recrutement", "sourcing", "talent acquisition", "entretien", "onboarding"));
    }

    public CvSkillExtractorService(SkillRepository skillRepo, ObjectMapper objectMapper) {
        this.skillRepo = skillRepo;
        this.objectMapper = objectMapper;
    }

    /**
     * Extracts matching skill IDs from free text (cover letter + CV filename).
     * Returns a Set of Skill entities found in the database that match the text.
     */
    public Set<Skill> extractSkills(String coverLetter, String cvFileName) {
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                Set<Skill> geminiSkills = extractSkillsViaGemini(coverLetter, cvFileName);
                if (geminiSkills != null && !geminiSkills.isEmpty()) {
                    log.info("Gemini extracted {} skills", geminiSkills.size());
                    return geminiSkills;
                }
            } catch (Exception e) {
                log.warn("Gemini skill extraction failed, falling back to heuristics: {}", e.getMessage());
            }
        }

        String corpus = buildCorpus(coverLetter, cvFileName);
        
        Set<String> matchedNames = new LinkedHashSet<>();
        for (Map.Entry<String, List<String>> entry : SKILL_ALIASES.entrySet()) {
            for (String alias : entry.getValue()) {
                if (corpus.contains(alias.toLowerCase())) {
                    matchedNames.add(entry.getKey());
                    break; // One alias match is enough for this skill
                }
            }
        }

        if (matchedNames.isEmpty()) {
            log.debug("Heuristic extraction found no matching skills in corpus");
            return Set.of();
        }
        log.info("Heuristic extraction matched skills: {}", matchedNames);

        return matchedNames.stream()
                .map(name -> skillRepo.findByName(name).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<Skill> extractSkillsViaGemini(String coverLetter, String cvFileName) throws IOException, InterruptedException {
        String canonicalSkills = String.join(", ", SKILL_ALIASES.keySet());
        String lc = coverLetter == null ? "" : coverLetter;
        String fn = cvFileName == null ? "" : cvFileName;

        String prompt = ""
            + "You are an HR assistant. Extract skills from the following text.\n"
            + "Return ONLY valid JSON with this shape:\n"
            + "{\"skills\":[<array of canonical skill names>]}\n"
            + "Rules:\n"
            + "- Use ONLY these canonical skill names: " + canonicalSkills + ".\n"
            + "- If none are found, return {\"skills\":[]}.\n"
            + "- Do not include markdown or extra keys.\n"
            + "\n"
            + "Cover letter:\n" + lc + "\n"
            + "CV filename:\n" + fn + "\n";

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + geminiModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", prompt))
        )));
        body.put("generationConfig", Map.of(
                "temperature", 0.2,
                "maxOutputTokens", 200
        ));

        String requestJson = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            return Set.of();
        }

        JsonNode root = objectMapper.readTree(response.body());
        String modelText = root.path("candidates").isArray() && root.path("candidates").size() > 0
                ? root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText()
                : "";

        String normalized = modelText == null ? "" : modelText.trim();
        normalized = normalized.replaceAll("^```[a-zA-Z]*", "").replaceAll("```$", "").trim();

        JsonNode json = objectMapper.readTree(normalized);
        JsonNode skillsNode = json.path("skills");
        if (!skillsNode.isArray()) return Set.of();

        Set<String> names = new LinkedHashSet<>();
        for (JsonNode node : skillsNode) {
            String name = node.asText();
            if (name != null && !name.isBlank()) {
                names.add(name.trim());
            }
        }

        if (names.isEmpty()) return Set.of();

        return names.stream()
                .map(name -> skillRepo.findByName(name).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    /**
     * Returns a confidence score (0-100) for how well an application matches
     * a set of required skill IDs.
     */
    public int computeMatchScore(Set<Skill> candidateSkills, Set<Skill> requiredSkills) {
        if (requiredSkills == null || requiredSkills.isEmpty()) return 0;
        if (candidateSkills == null || candidateSkills.isEmpty()) return 0;

        Set<String> requiredIds = requiredSkills.stream().map(Skill::getId).collect(Collectors.toSet());
        long matched = candidateSkills.stream()
                .map(Skill::getId)
                .filter(requiredIds::contains)
                .count();
        return (int) (matched * 100 / requiredIds.size());
    }

    /**
     * Smart score adds contextual bonuses for experienced profiles and role relevance.
     * Keeps total in [0, 100].
     */
    public int computeSmartScore(Set<Skill> candidateSkills, Set<Skill> requiredSkills, String coverLetter) {
        int base = computeMatchScore(candidateSkills, requiredSkills);
        int bonus = estimateExperienceBonus(coverLetter);
        int confidenceBonus = candidateSkills != null && candidateSkills.size() >= 4 ? 5 : 0;
        return Math.min(100, base + bonus + confidenceBonus);
    }

    private String buildCorpus(String coverLetter, String cvFileName) {
        StringBuilder sb = new StringBuilder();
        if (coverLetter != null) sb.append(coverLetter.toLowerCase()).append(" ");
        if (cvFileName != null) {
            // Extract meaningful words from filename: "CV_Java_Angular_2024.pdf" → "cv java angular 2024"
            String cleaned = cvFileName.replaceAll("[_\\-.]", " ").toLowerCase();
            sb.append(cleaned);
        }
        return sb.toString();
    }

    // ═══════════════════════════════════════════════════════════════
    // OPTION 1 — Extraction profil enrichi (compétences + niveau + formation + langues + soft skills + résumé)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Extrait un profil candidat complet via Gemini.
     * Retourne null si Gemini n'est pas configuré ou échoue.
     */
    public CandidateProfileDTO extractCandidateProfile(String coverLetter, String cvFileName) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return buildHeuristicProfile(coverLetter, cvFileName);
        }
        try {
            return extractProfileViaGemini(coverLetter, cvFileName);
        } catch (Exception e) {
            log.warn("Gemini profile extraction failed, using heuristics: {}", e.getMessage());
            return buildHeuristicProfile(coverLetter, cvFileName);
        }
    }

    private CandidateProfileDTO extractProfileViaGemini(String coverLetter, String cvFileName)
            throws IOException, InterruptedException {

        String lc = coverLetter == null ? "" : coverLetter;
        String fn = cvFileName  == null ? "" : cvFileName;

        String prompt = "Tu es un assistant RH expert. Analyse la lettre de motivation et le nom du CV ci-dessous.\n"
            + "Retourne UNIQUEMENT un JSON valide avec cette structure exacte :\n"
            + "{\n"
            + "  \"competences\": [\"Java\", \"Spring Boot\"],\n"
            + "  \"annees_experience\": 5,\n"
            + "  \"niveau\": \"Confirmé\",\n"
            + "  \"formation\": \"Ingénieur Informatique\",\n"
            + "  \"langues\": [\"Français\", \"Anglais\"],\n"
            + "  \"soft_skills\": [\"Leadership\", \"Travail en équipe\"],\n"
            + "  \"resume_profil\": \"Résumé narratif court du profil candidat en 2-3 phrases.\"\n"
            + "}\n"
            + "Règles :\n"
            + "- niveau doit être : Junior (0-2 ans), Confirmé (3-5 ans) ou Senior (6+ ans)\n"
            + "- Si une information est absente, utilise une valeur vide [] ou 0\n"
            + "- Ne retourne aucun markdown ni texte hors JSON\n\n"
            + "Lettre de motivation :\n" + lc + "\n"
            + "Nom du CV : " + fn + "\n";

        String responseText = callGemini(prompt, 500);
        if (responseText == null || responseText.isBlank()) return buildHeuristicProfile(coverLetter, cvFileName);

        JsonNode json = objectMapper.readTree(responseText);

        CandidateProfileDTO profile = new CandidateProfileDTO();

        // competences
        List<String> competences = new java.util.ArrayList<>();
        json.path("competences").forEach(n -> competences.add(n.asText()));
        profile.setCompetences(competences);

        // annees_experience
        profile.setAnneesExperience(json.path("annees_experience").asInt(0));

        // niveau
        profile.setNiveau(json.path("niveau").asText("Non précisé"));

        // formation
        profile.setFormation(json.path("formation").asText("Non précisé"));

        // langues
        List<String> langues = new java.util.ArrayList<>();
        json.path("langues").forEach(n -> langues.add(n.asText()));
        profile.setLangues(langues);

        // soft_skills
        List<String> softSkills = new java.util.ArrayList<>();
        json.path("soft_skills").forEach(n -> softSkills.add(n.asText()));
        profile.setSoftSkills(softSkills);

        // resume_profil
        profile.setResumeProfil(json.path("resume_profil").asText(""));

        log.info("Gemini profile extracted: niveau={}, exp={}ans, competences={}",
                profile.getNiveau(), profile.getAnneesExperience(), profile.getCompetences());
        return profile;
    }

    private CandidateProfileDTO buildHeuristicProfile(String coverLetter, String cvFileName) {
        CandidateProfileDTO profile = new CandidateProfileDTO();
        Set<Skill> skills = extractSkills(coverLetter, cvFileName);
        profile.setCompetences(skills.stream().map(Skill::getName).toList());
        int exp = estimateExperience(coverLetter);
        profile.setAnneesExperience(exp);
        profile.setNiveau(exp >= 6 ? "Senior" : exp >= 3 ? "Confirmé" : "Junior");
        profile.setLangues(List.of());
        profile.setSoftSkills(List.of());
        profile.setFormation("Non précisé");
        profile.setResumeProfil("Profil extrait automatiquement.");
        return profile;
    }

    private int estimateExperience(String coverLetter) {
        if (coverLetter == null || coverLetter.isBlank()) return 0;
        Pattern p = Pattern.compile("(\\d{1,2})\\s*(ans|years)");
        Matcher m = p.matcher(coverLetter.toLowerCase());
        int max = 0;
        while (m.find()) {
            try { max = Math.max(max, Integer.parseInt(m.group(1))); }
            catch (NumberFormatException ignored) {}
        }
        return max;
    }

    // ═══════════════════════════════════════════════════════════════
    // OPTION 2 — Génération de questions d'entretien personnalisées
    // ═══════════════════════════════════════════════════════════════

    /**
     * Génère 5 questions d'entretien personnalisées basées sur l'offre + le profil candidat.
     */
    public List<String> generateInterviewQuestions(String jobTitle, String jobDescription,
                                                    String candidateName, String coverLetter,
                                                    List<String> requiredSkills) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return defaultInterviewQuestions(jobTitle);
        }
        try {
            return generateQuestionsViaGemini(jobTitle, jobDescription, candidateName, coverLetter, requiredSkills);
        } catch (Exception e) {
            log.warn("Gemini interview questions generation failed: {}", e.getMessage());
            return defaultInterviewQuestions(jobTitle);
        }
    }

    private List<String> generateQuestionsViaGemini(String jobTitle, String jobDescription,
                                                      String candidateName, String coverLetter,
                                                      List<String> requiredSkills)
            throws IOException, InterruptedException {

        String skills = requiredSkills == null ? "" : String.join(", ", requiredSkills);
        String lc     = coverLetter    == null ? "" : coverLetter;
        String desc   = jobDescription == null ? "" : jobDescription;

        String prompt = "Tu es un recruteur RH expert. Génère 5 questions d'entretien pertinentes et personnalisées.\n"
            + "Poste : " + jobTitle + "\n"
            + "Compétences requises : " + skills + "\n"
            + "Description du poste : " + desc + "\n"
            + "Lettre de motivation du candidat : " + lc + "\n\n"
            + "Règles :\n"
            + "- Questions variées : 2 techniques, 1 comportementale, 1 situationnelle, 1 motivation\n"
            + "- Questions précises et adaptées au poste et au profil du candidat\n"
            + "- Retourne UNIQUEMENT un JSON : {\"questions\": [\"Q1\", \"Q2\", \"Q3\", \"Q4\", \"Q5\"]}\n"
            + "- Aucun markdown, aucun texte hors JSON\n";

        String responseText = callGemini(prompt, 600);
        if (responseText == null || responseText.isBlank()) return defaultInterviewQuestions(jobTitle);

        JsonNode json = objectMapper.readTree(responseText);
        List<String> questions = new java.util.ArrayList<>();
        json.path("questions").forEach(n -> questions.add(n.asText()));

        if (questions.isEmpty()) return defaultInterviewQuestions(jobTitle);
        log.info("Gemini generated {} interview questions for '{}'", questions.size(), jobTitle);
        return questions;
    }

    private List<String> defaultInterviewQuestions(String jobTitle) {
        return List.of(
            "Pouvez-vous décrire votre expérience la plus significative en lien avec ce poste : " + jobTitle + " ?",
            "Quelles sont vos principales compétences techniques pour ce rôle ?",
            "Décrivez une situation difficile que vous avez rencontrée et comment vous l'avez résolue.",
            "Pourquoi souhaitez-vous évoluer vers ce poste en interne ?",
            "Comment envisagez-vous votre contribution à l'équipe dans les 6 premiers mois ?"
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // Méthode Gemini commune (évite la duplication)
    // ═══════════════════════════════════════════════════════════════

    private String callGemini(String prompt, int maxTokens) throws IOException, InterruptedException {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + geminiModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", prompt))
        )));
        body.put("generationConfig", Map.of(
                "temperature", 0.3,
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

        // Nettoyer le markdown éventuel
        return text.trim()
                   .replaceAll("(?s)^```[a-zA-Z]*\\s*", "")
                   .replaceAll("(?s)```\\s*$", "")
                   .trim();
    }

    private int estimateExperienceBonus(String coverLetter) {
        if (coverLetter == null || coverLetter.isBlank()) {
            return 0;
        }
        String normalized = coverLetter.toLowerCase();
        Pattern yearsPattern = Pattern.compile("(\\d{1,2})\\s*(ans|years)");
        Matcher matcher = yearsPattern.matcher(normalized);
        int maxYears = 0;
        while (matcher.find()) {
            try {
                int years = Integer.parseInt(matcher.group(1));
                maxYears = Math.max(maxYears, years);
            } catch (NumberFormatException ignored) {
                // Ignore malformed year values
            }
        }
        if (maxYears >= 8) return 12;
        if (maxYears >= 5) return 8;
        if (maxYears >= 3) return 5;
        if (maxYears >= 1) return 2;
        return 0;
    }
}
