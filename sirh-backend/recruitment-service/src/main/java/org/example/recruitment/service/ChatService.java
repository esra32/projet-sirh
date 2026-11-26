package org.example.recruitment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.recruitment.model.ChatMessage;
import org.example.recruitment.model.JobOffer;
import org.example.recruitment.model.OfferStatus;
import org.example.recruitment.repo.ChatMessageRepository;
import org.example.recruitment.repo.JobOfferRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatMessageRepository chatRepo;
    private final JobOfferRepository offerRepo;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${gemini.apiKey:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    // ── Réponses heuristiques (si Gemini absent) ──────────────────
    private static final Map<String, String> FAQ = new LinkedHashMap<>();

    // Mots génériques à exclure avant la recherche d'offres
    private static final String STOP_WORDS_REGEX =
        "\\b(offre|offres|poste|postes|emploi|travail|recrutement|opportunité|" +
        "cherche|je cherche|je veux|montre|liste|disponible|disponibles|" +
        "y a-t-il|est-ce qu|quels sont les|avez-vous|vous avez|" +
        "il y a|actuellement|en ce moment|pour moi)\\b";

    static {
        FAQ.put("bonjour|salut|hello|bonsoir",
            "Bonjour ! Je suis l'assistant RH SIRH 🤖\n\nJe peux vous aider avec :\n• 🔍 Rechercher des offres internes\n• 📋 Informations sur le processus de candidature\n• 📄 Questions sur les contrats (CDI, CDD, STAGE)\n• 🏢 Informations sur les départements\n• 📅 Délais et procédures RH\n\nQue puis-je faire pour vous ?");

        // candidature DOIT être avant offre/poste pour éviter le mauvais matching
        FAQ.put("candidature|postuler|comment candidater|soumettre",
            "📋 **Processus de candidature interne :**\n\n1. Consultez les offres publiées\n2. Cliquez sur \"Postuler\" sur l'offre souhaitée\n3. Remplissez le formulaire : lettre de motivation + CV\n4. Votre candidature est analysée automatiquement par l'IA\n5. Le manager vous contacte pour un entretien si votre profil correspond\n\n💡 Astuce : plus votre lettre de motivation est détaillée, meilleur sera votre score de matching !");

        FAQ.put("offre|poste|emploi|travail|recrutement|opportunité",
            "Je vais chercher les offres disponibles pour vous. Précisez un domaine ou une compétence pour affiner la recherche !\nExemple : \"offres Java\", \"postes marketing\", \"offres CDI\"");

        FAQ.put("cdi|cdd|stage|contrat|type de contrat",
            "📄 **Types de contrats dans notre SIRH :**\n\n• **CDI** (Contrat à Durée Indéterminée) : contrat permanent, pas de date de fin\n• **CDD** (Contrat à Durée Déterminée) : contrat temporaire avec date de fin définie\n• **STAGE** : contrat pour étudiants ou personnes en formation\n\nVous cherchez un type de contrat spécifique ? Je peux filtrer les offres pour vous.");

        FAQ.put("score|matching|adéquation|ia|intelligence artificielle",
            "🤖 **Comment fonctionne le score de matching IA ?**\n\nNotre système analyse automatiquement :\n• Vos compétences vs compétences requises du poste\n• Vos années d'expérience mentionnées\n• La richesse de votre lettre de motivation\n\n**Score :**\n• 🟢 80-100% : Excellent profil\n• 🟡 50-79% : Bon profil\n• 🔴 0-49% : Profil à renforcer\n\nPlus vous mentionnez vos compétences clairement, plus le score est précis !");

        FAQ.put("département|service|équipe|division",
            "🏢 **Départements dans notre organisation :**\n\n• Informatique / IT\n• Marketing & Communication\n• Ressources Humaines\n• Finance & Comptabilité\n• Commercial & Ventes\n• Design & UX\n• Direction Générale\n\nQuel département vous intéresse ? Je peux chercher les offres correspondantes.");

        FAQ.put("délai|durée|combien de temps|quand|résultat",
            "📅 **Délais du processus de recrutement interne :**\n\n1. Dépôt candidature → Examen : **2-5 jours ouvrés**\n2. Examen → Entretien : **3-7 jours ouvrés**\n3. Entretien → Décision finale : **3-5 jours ouvrés**\n\nVous pouvez suivre votre candidature en temps réel dans votre espace employé.");

        FAQ.put("entretien|interview|préparation|préparer",
            "🎯 **Conseils pour préparer votre entretien :**\n\n• Relisez la description du poste et les compétences requises\n• Préparez des exemples concrets de vos réalisations\n• Renseignez-vous sur le département cible\n• Préparez 3-5 questions à poser au manager\n• Arrivez avec votre CV à jour\n\n💡 Notre système génère des questions d'entretien personnalisées pour chaque candidat !");

        FAQ.put("profil|compétence|skill|cv|améliorer",
            "💼 **Comment améliorer votre profil :**\n\n• Mettez à jour votre CV régulièrement\n• Détaillez vos compétences techniques dans la lettre de motivation\n• Mentionnez clairement vos années d'expérience\n• Listez vos certifications et formations\n• Soyez précis sur les technologies maîtrisées\n\n🤖 Notre IA Gemini analyse votre profil automatiquement à chaque candidature !");

        FAQ.put("refus|rejeté|candidature refusée|pas retenu",
            "😔 **Votre candidature a été refusée ?**\n\nNe vous découragez pas ! Quelques conseils :\n• Consultez les autres offres disponibles\n• Enrichissez votre lettre de motivation avec plus de détails\n• Développez les compétences manquantes\n• Signalez votre intérêt au manager pour les prochaines opportunités\n\nJe peux vous aider à trouver d'autres offres correspondant mieux à votre profil actuel.");

        FAQ.put("mobilité|mutation|changement|évoluer|évolution",
            "🚀 **Mobilité interne — Comment ça marche ?**\n\nNotre SIRH facilite la mobilité interne :\n1. Consultez les offres publiées par les managers\n2. Postulez directement depuis votre espace employé\n3. Votre profil est analysé automatiquement\n4. Le manager examine votre candidature\n5. En cas d'acceptation, votre contrat est mis à jour\n\n💡 La mobilité interne est prioritaire sur le recrutement externe !");

        FAQ.put("aide|help|que peux-tu|fonctionnalité|menu",
            "🤖 **Je peux vous aider avec :**\n\n🔍 **Recherche** : \"cherche offres Java\", \"postes marketing CDI\"\n📋 **Candidature** : comment postuler, délais, processus\n📄 **Contrats** : CDI, CDD, STAGE — différences et avantages\n🏢 **Départements** : quels services recrutent\n🎯 **Matching IA** : comment fonctionne le score\n💼 **Profil** : conseils pour améliorer votre candidature\n📅 **Délais** : combien de temps pour une réponse\n🚀 **Mobilité** : processus de mobilité interne\n\nPosez-moi n'importe quelle question !");
    }

    public ChatService(ChatMessageRepository chatRepo, JobOfferRepository offerRepo,
                       ObjectMapper objectMapper) {
        this.chatRepo = chatRepo;
        this.offerRepo = offerRepo;
        this.objectMapper = objectMapper;
    }

    public List<ChatMessage> getHistory(String sessionId) {
        return chatRepo.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    public ChatMessage processMessage(String sessionId, String userMessage) {
        chatRepo.save(new ChatMessage(sessionId, "USER", userMessage));

        String response;
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            response = processWithGemini(sessionId, userMessage);
        } else {
            response = processWithHeuristics(userMessage);
        }

        return chatRepo.save(new ChatMessage(sessionId, "BOT", response));
    }

    // ══════════════════════════════════════════════════════════════
    // MODE GEMINI — Chatbot intelligent avec contexte RH
    // ══════════════════════════════════════════════════════════════

    private String processWithGemini(String sessionId, String userMessage) {
        try {
            // Récupérer l'historique pour le contexte conversationnel
            List<ChatMessage> history = chatRepo.findBySessionIdOrderByTimestampAsc(sessionId);

            // Construire le contexte des offres publiées
            String offersContext = buildOffersContext();

            // Construire le système prompt
            String systemPrompt = "Tu es l'assistant RH virtuel du SIRH (Système d'Information des Ressources Humaines).\n"
                + "Tu aides les employés à trouver des opportunités internes, à comprendre le processus de recrutement,\n"
                + "et à répondre à leurs questions RH.\n\n"
                + "RÈGLES IMPORTANTES :\n"
                + "- Réponds toujours en français\n"
                + "- Sois concis, professionnel et bienveillant\n"
                + "- Utilise des emojis pour rendre les réponses plus lisibles\n"
                + "- Si l'employé cherche des offres, utilise le contexte ci-dessous\n"
                + "- Si tu ne sais pas, dis-le honnêtement et propose une alternative\n"
                + "- Maximum 300 mots par réponse\n\n"
                + "OFFRES D'EMPLOI INTERNES ACTUELLEMENT PUBLIÉES :\n"
                + offersContext + "\n\n"
                + "SUJETS QUE TU MAITRISES :\n"
                + "- Recherche et matching d'offres internes\n"
                + "- Processus de candidature (comment postuler, délais, étapes)\n"
                + "- Types de contrats (CDI, CDD, STAGE)\n"
                + "- Score de matching IA (comment il est calculé)\n"
                + "- Préparation aux entretiens\n"
                + "- Mobilité interne\n"
                + "- Amélioration du profil candidat\n"
                + "- Informations sur les départements\n";

            // Construire l'historique de conversation pour Gemini
            List<Map<String, Object>> contents = new ArrayList<>();

            // Ajouter le system prompt comme premier message user/model
            contents.add(Map.of("role", "user",
                "parts", List.of(Map.of("text", systemPrompt + "\nCompris ? Présente-toi brièvement."))));
            contents.add(Map.of("role", "model",
                "parts", List.of(Map.of("text", "Compris ! Je suis l'assistant RH SIRH, prêt à vous aider."))));

            // Ajouter l'historique (max 10 derniers messages)
            int start = Math.max(0, history.size() - 11);
            for (int i = start; i < history.size() - 1; i++) {
                ChatMessage msg = history.get(i);
                String role = msg.getSender().equals("USER") ? "user" : "model";
                contents.add(Map.of("role", role,
                    "parts", List.of(Map.of("text", msg.getContent()))));
            }

            // Message actuel
            contents.add(Map.of("role", "user",
                "parts", List.of(Map.of("text", userMessage))));

            // Appel Gemini
            Map<String, Object> body = new HashMap<>();
            body.put("contents", contents);
            body.put("generationConfig", Map.of(
                "temperature", 0.7,
                "maxOutputTokens", 400
            ));

            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + geminiModel + ":generateContent?key=" + geminiApiKey;

            String requestJson = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

            HttpResponse<String> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                var root = objectMapper.readTree(response.body());
                String text = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText("");
                if (!text.isBlank()) return text.trim();
            }

        } catch (Exception e) {
            log.warn("Gemini chat failed, falling back to heuristics: {}", e.getMessage());
        }

        return processWithHeuristics(userMessage);
    }

    // ══════════════════════════════════════════════════════════════
    // MODE HEURISTIQUE — Réponses sans Gemini
    // ══════════════════════════════════════════════════════════════

    private String processWithHeuristics(String userMessage) {
        String lower = userMessage.toLowerCase().trim();

        // 1. Chercher dans la FAQ (candidature est avant offre — ordre important)
        for (Map.Entry<String, String> entry : FAQ.entrySet()) {
            String[] keywords = entry.getKey().split("\\|");
            for (String kw : keywords) {
                if (lower.contains(kw)) {
                    // Si c'est une question générique sur les offres, lancer la recherche
                    if (kw.equals("offre") || kw.equals("poste") || kw.equals("emploi")
                            || kw.equals("travail") || kw.equals("recrutement") || kw.equals("opportunité")) {
                        return searchOffersResponse(lower);
                    }
                    return entry.getValue();
                }
            }
        }

        // 2. Recherche d'offres par compétence/département (sur mots-clés extraits)
        String keyword = extractKeyword(lower);
        if (!keyword.isBlank()) {
            List<JobOffer> matches = searchOffers(keyword);
            if (!matches.isEmpty()) {
                return formatOffersResponse(matches);
            }
        }

        // 3. Réponse par défaut
        return "🤔 Je n'ai pas bien compris votre question.\n\n"
            + "Voici ce que je peux faire pour vous :\n"
            + "• Tapez **\"offres\"** pour voir les postes disponibles\n"
            + "• Tapez **\"candidature\"** pour le processus de recrutement\n"
            + "• Tapez **\"aide\"** pour voir toutes mes fonctionnalités\n\n"
            + "Ou posez-moi une question comme : *\"Je cherche un poste Java\"*";
    }

    private String searchOffersResponse(String query) {
        // Extraire les mots-clés significatifs en supprimant les stop words
        String keyword = extractKeyword(query);

        List<JobOffer> matches = keyword.isBlank() ? List.of() : searchOffers(keyword);
        if (matches.isEmpty()) {
            List<JobOffer> all = offerRepo.findByStatus(OfferStatus.PUBLISHED);
            if (all.isEmpty()) {
                return "📋 Aucune offre n'est publiée en ce moment.\nRevenez bientôt, de nouvelles opportunités arrivent régulièrement !";
            }
            String hint = keyword.isBlank()
                ? "**Dernières offres disponibles (top 5) :**"
                : "🔍 Pas d'offre trouvée pour *\"" + keyword + "\"*.\n\n**Dernières offres disponibles :**";
            return hint + "\n" + formatOffersResponse(all.stream().limit(5).collect(Collectors.toList()))
                + (all.size() > 5 ? "\n\n💬 " + (all.size() - 5) + " autre(s) offre(s) disponible(s). Précisez un domaine pour affiner !" : "");
        }
        return formatOffersResponse(matches);
    }

    /** Supprime les stop words français et retourne le mot-clé de recherche réel. */
    private String extractKeyword(String query) {
        return query.replaceAll(STOP_WORDS_REGEX, " ")
                    .replaceAll("\\s{2,}", " ")
                    .trim();
    }

    private List<JobOffer> searchOffers(String keyword) {
        if (keyword.isBlank()) return List.of();
        List<JobOffer> published = offerRepo.findByStatus(OfferStatus.PUBLISHED);
        return published.stream()
            .filter(offer -> {
                String title = offer.getTitle() != null ? offer.getTitle().toLowerCase() : "";
                String dept  = offer.getDepartment() != null ? offer.getDepartment().toLowerCase() : "";
                String desc  = offer.getDescription() != null ? offer.getDescription().toLowerCase() : "";
                boolean skillMatch = offer.getRequiredSkills().stream()
                    .anyMatch(s -> {
                        String sName = s.getName().toLowerCase();
                        return keyword.contains(sName) || sName.contains(keyword);
                    });
                return title.contains(keyword) || dept.contains(keyword)
                    || desc.contains(keyword) || skillMatch
                    || keyword.contains(title) || keyword.contains(dept);
            })
            .limit(5)
            .collect(Collectors.toList());
    }

    private String formatOffersResponse(List<JobOffer> offers) {
        if (offers.isEmpty()) return "Aucune offre disponible pour le moment.";

        // Sécurité : jamais plus de 5 offres dans une réponse chat
        List<JobOffer> display = offers.size() > 5 ? offers.subList(0, 5) : offers;

        StringBuilder sb = new StringBuilder();
        sb.append("🎯 **").append(display.size()).append(" offre(s) trouvée(s) :**\n\n");
        for (int i = 0; i < display.size(); i++) {
            JobOffer o = display.get(i);
            sb.append(i + 1).append(". **").append(o.getTitle()).append("**\n");
            if (o.getDepartment() != null) sb.append("   🏢 ").append(o.getDepartment()).append("\n");
            if (o.getLocation()   != null) sb.append("   📍 ").append(o.getLocation()).append("\n");
            if (o.getDeadlineDate() != null) sb.append("   📅 Jusqu'au ").append(o.getDeadlineDate()).append("\n");
            if (!o.getRequiredSkills().isEmpty()) {
                String skills = o.getRequiredSkills().stream()
                    .map(s -> s.getName()).limit(4).collect(Collectors.joining(", "));
                sb.append("   🛠 ").append(skills).append("\n");
            }
            sb.append("\n");
        }
        sb.append("💡 Cliquez sur \"Postuler\" dans votre espace employé pour candidater !");
        return sb.toString();
    }

    private String buildOffersContext() {
        List<JobOffer> offers = offerRepo.findByStatus(OfferStatus.PUBLISHED);
        if (offers.isEmpty()) return "Aucune offre publiée en ce moment.";

        // Limité à 10 offres pour ne pas saturer le contexte Gemini
        return offers.stream().limit(10).map(o -> {
            String skills = o.getRequiredSkills().stream()
                .map(s -> s.getName()).collect(Collectors.joining(", "));
            return String.format("- %s | Département: %s | Lieu: %s | Compétences: %s | Date limite: %s",
                o.getTitle(),
                o.getDepartment() != null ? o.getDepartment() : "N/A",
                o.getLocation()   != null ? o.getLocation()   : "N/A",
                skills.isEmpty()  ? "Non précisées" : skills,
                o.getDeadlineDate() != null ? o.getDeadlineDate().toString() : "N/A");
        }).collect(Collectors.joining("\n"));
    }
}