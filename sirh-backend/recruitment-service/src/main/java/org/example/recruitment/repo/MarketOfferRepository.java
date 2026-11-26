package org.example.recruitment.repo;

import org.example.recruitment.model.MarketOffer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface MarketOfferRepository extends JpaRepository<MarketOffer, String> {

    List<MarketOffer> findByKeywordIgnoreCase(String keyword);

    List<MarketOffer> findByCityContainingIgnoreCase(String city);

    List<MarketOffer> findAllByOrderByScrapedDateDesc();

    /** Pagination serveur — retourne uniquement la page demandée depuis la DB */
    Page<MarketOffer> findAllByOrderByScrapedDateDesc(Pageable pageable);

    boolean existsByTitleAndCompany(String title, String company);

    @Query("SELECT m.title, AVG((COALESCE(m.salaryMin, 0) + COALESCE(m.salaryMax, 0)) / 2) " +
           "FROM MarketOffer m WHERE m.salaryMin IS NOT NULL OR m.salaryMax IS NOT NULL " +
           "GROUP BY m.title ORDER BY COUNT(m.title) DESC")
    List<Object[]> findAvgSalaryByTitle();

    @Query("SELECT m.city, COUNT(m) FROM MarketOffer m WHERE m.city IS NOT NULL GROUP BY m.city ORDER BY COUNT(m) DESC")
    List<Object[]> findCountByCity();

    /** Retourne uniquement les colonnes skills (JSON) pour calcul des top compétences — évite de charger toutes les entités. */
    @Query("SELECT m.skills FROM MarketOffer m WHERE m.skills IS NOT NULL AND m.skills != ''")
    List<String> findAllSkillsJson();

    /** Retourne les skills JSON filtrés par mot-clé (pour la liaison offre ↔ marché). */
    @Query("SELECT m.skills FROM MarketOffer m WHERE m.skills IS NOT NULL AND m.skills != '' AND LOWER(m.keyword) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<String> findSkillsJsonByKeyword(@org.springframework.data.repository.query.Param("keyword") String keyword);

    /** Nombre d'offres Adzuna pour un mot-clé donné. */
    @Query("SELECT COUNT(m) FROM MarketOffer m WHERE LOWER(m.keyword) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    long countByKeyword(@org.springframework.data.repository.query.Param("keyword") String keyword);
}