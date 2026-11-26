# Guide — Chatbot IA moderne pour SIRH

## État actuel vs ce qui est possible

| Aspect | Actuel | Moderne |
|--------|--------|---------|
| Matching | Substring keywords | Embeddings sémantiques |
| Réponses | Texte brut | Structuré + markdown |
| Contexte | Par session (DB) | Mémoire longue durée |
| IA | Gemini API (frontend) | Gemini API (backend sécurisé) |
| Sécurité | Aucune (port 8083 direct) | JWT gateway ✅ (corrigé) |

---

## Option 1 — Améliorer le ChatService existant (recommandé pour la soutenance)

### Étape 1 : Déplacer Gemini côté backend

Créer `AiController.java` dans recruitment-service :

```java
@RestController
@RequestMapping("/api/ai")
@SecurityRequirement(name = "bearerAuth")
public class AiController {

    @Value("${gemini.apiKey:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Proxy sécurisé vers Gemini — la clé reste côté serveur
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> body) {
        String message = body.get("message");
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            String response = callGemini(message);
            return ResponseEntity.ok(Map.of("response", response));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("response", "Service IA temporairement indisponible."));
        }
    }

    /**
     * Génération de description de poste
     */
    @PostMapping("/generate-job-description")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER')")
    public ResponseEntity<Map<String, String>> generateJobDescription(@RequestBody Map<String, String> body) {
        String prompt = String.format(
            "Rédige une description de poste professionnelle en français pour : %s\n" +
            "Département : %s\nCompétences requises : %s\n" +
            "Format : titre, missions, profil recherché, avantages. Max 300 mots.",
            body.getOrDefault("title", ""),
            body.getOrDefault("department", ""),
            body.getOrDefault("requirements", "")
        );
        try {
            return ResponseEntity.ok(Map.of("description", callGemini(prompt)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Analyse de compatibilité candidat/poste
     */
    @PostMapping("/analyze-candidate")
    @PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER')")
    public ResponseEntity<Map<String, String>> analyzeCandidate(@RequestBody Map<String, String> body) {
        String prompt = String.format(
            "Analyse la compatibilité de ce candidat avec le poste.\n" +
            "Poste : %s\nCompétences requises : %s\n" +
            "Lettre de motivation : %s\n" +
            "Réponds en JSON : {\"score\": 0-100, \"points_forts\": [...], \"points_faibles\": [...], \"recommandation\": \"...\"}",
            body.getOrDefault("jobTitle", ""),
            body.getOrDefault("requirements", ""),
            body.getOrDefault("coverLetter", "")
        );
        try {
            return ResponseEntity.ok(Map.of("analysis", callGemini(prompt)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private String callGemini(String prompt) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                   + geminiModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text",
                    "Tu es ARIA, un assistant RH intelligent. Réponds toujours en français.\n\n" + prompt
                ))
            )),
            "generationConfig", Map.of("temperature", 0.7, "maxOutputTokens", 800)
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = objectMapper.readTree(response.body());
        return root.path("candidates").get(0)
                   .path("content").path("parts").get(0)
                   .path("text").asText();
    }
}
```

### Étape 2 : Ajouter la route gateway pour /api/ai

Dans `application.yml` (gateway), ajouter :
```yaml
- id: ai-service
  uri: http://localhost:8083
  predicates:
    - Path=/api/ai/**
  filters:
    - AuthJwtFilter
```

### Étape 3 : Mettre à jour le frontend Angular

Dans `ai.service.ts`, remplacer les appels directs à Gemini par des appels backend :

```typescript
// AVANT (exposait la clé API)
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(environment.geminiApiKey);

// APRÈS (sécurisé — clé côté serveur)
chat(message: string): Observable<string> {
  return this.http.post<{response: string}>('/api/ai/chat', { message })
    .pipe(map(r => r.response));
}

generateJobDescription(title: string, department: string, requirements: string): Observable<string> {
  return this.http.post<{description: string}>('/api/ai/generate-job-description',
    { title, department, requirements })
    .pipe(map(r => r.description));
}

analyzeCandidate(jobTitle: string, requirements: string, coverLetter: string): Observable<string> {
  return this.http.post<{analysis: string}>('/api/ai/analyze-candidate',
    { jobTitle, requirements, coverLetter })
    .pipe(map(r => r.analysis));
}
```

Supprimer de `package.json` :
```
"@google/generative-ai": "^0.24.1"
```

Supprimer de `environment.ts` :
```
geminiApiKey: '...'
```

---

## Option 2 — Chatbot sémantique avancé (pour après la soutenance)

Si tu veux aller plus loin après la soutenance :

### Technologie recommandée : LangChain4j (Java) + Gemini

```xml
<!-- pom.xml recruitment-service -->
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-google-ai-gemini</artifactId>
    <version>0.31.0</version>
</dependency>
```

### Fonctionnalités disponibles avec LangChain4j

1. **RAG (Retrieval Augmented Generation)** — Le chatbot lit les offres d'emploi réelles de ta base
2. **Mémoire de conversation** — Contexte sur toute la session utilisateur
3. **Tools / Function Calling** — Le chatbot peut appeler `searchJobOffers()`, `getApplicationStatus()`, etc.
4. **Streaming** — Réponses en temps réel caractère par caractère

### Architecture avec RAG

```
User message
    ↓
Embedding (Gemini embedding-001)
    ↓
Vector search dans les offres d'emploi (pgvector ou in-memory)
    ↓
Top-3 offres pertinentes injectées dans le prompt
    ↓
Gemini génère une réponse contextuelle
    ↓
User
```

---

## Idées de fonctionnalités chatbot pour la soutenance

1. **"Quelles offres correspondent à mon profil ?"**
   → Le bot liste les offres publiées dont les compétences requises matchent le profil de l'employé connecté

2. **"Quel est le statut de ma candidature pour le poste X ?"**
   → Le bot interroge ApplicationService et répond en langage naturel

3. **"Rédige ma lettre de motivation pour le poste Y"**
   → Gemini génère une lettre personnalisée basée sur le profil de l'employé

4. **"Combien d'employés sont dans le département IT ?"**
   → Le bot interroge EmployeeService via RestTemplate et répond

5. **"Quels sont les postes ouverts en Marketing ?"**
   → Recherche dans les offres PUBLISHED filtrées par département