package org.example.recruitment.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.recruitment.dto.ComparisonResultDTO;
import org.example.recruitment.dto.MarketOfferDTO;
import org.example.recruitment.dto.MarketStatsDTO;
import org.example.recruitment.service.AdzunaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/market")
@Tag(name = "Market Intelligence")
@SecurityRequirement(name = "bearerAuth")
public class MarketIntelligenceController {

    private final AdzunaService adzunaService;

    public MarketIntelligenceController(AdzunaService adzunaService) {
        this.adzunaService = adzunaService;
    }

    /**
     * Synchronise les offres depuis Adzuna pour un mot-clé donné.
     * GET /api/market/sync?keyword=DataAnalyst
     */
    @GetMapping("/sync")
    public ResponseEntity<Map<String, Object>> sync(@RequestParam String keyword) {
        int count = adzunaService.syncFromAdzuna(keyword);
        return ResponseEntity.ok(Map.of(
                "imported", count,
                "keyword", keyword,
                "message", count + " offres importées depuis Adzuna pour : " + keyword
        ));
    }

    /**
     * Retourne une page d'offres marché (server-side pagination).
     * GET /api/market/offers?page=0&size=10
     */
    @GetMapping("/offers")
    public Map<String, Object> getOffers(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return adzunaService.getOffersPage(page, size);
    }

    /**
     * Statistiques globales du marché.
     * GET /api/market/stats
     */
    @GetMapping("/stats")
    public MarketStatsDTO getStats() {
        return adzunaService.getStats();
    }

    /**
     * Compare un salaire interne avec la moyenne du marché.
     * GET /api/market/compare?title=DataAnalyst&internalSalary=1800
     */
    @GetMapping("/compare")
    public ComparisonResultDTO compare(
            @RequestParam String title,
            @RequestParam double internalSalary) {
        return adzunaService.compare(title, internalSalary);
    }

    /**
     * Retourne les compétences marché filtrées par mot-clé (ex: "DevOps").
     * Utilisé pour la liaison offre ↔ Adzuna dans la shortlist externe.
     * GET /api/market/skills?keyword=DevOps
     */
    @GetMapping("/skills")
    public Map<String, Object> getSkillsByKeyword(@RequestParam String keyword) {
        return adzunaService.getSkillsByKeyword(keyword);
    }

    /**
     * Vide toutes les offres marché (pour re-synchroniser proprement).
     * DELETE /api/market/offers
     */
    @DeleteMapping("/offers")
    public ResponseEntity<Map<String, Object>> clearOffers() {
        long count = adzunaService.clearAllOffers();
        return ResponseEntity.ok(Map.of("deleted", count, "message", count + " offres supprimées."));
    }
}