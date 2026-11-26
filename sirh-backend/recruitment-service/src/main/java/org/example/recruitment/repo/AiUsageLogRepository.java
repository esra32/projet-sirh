package org.example.recruitment.repo;

import org.example.recruitment.model.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, Long> {

    List<AiUsageLog> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT COUNT(a) FROM AiUsageLog a WHERE a.userId = :userId AND a.createdAt >= :since")
    long countByUserIdAndCreatedAtAfter(@Param("userId") String userId, @Param("since") LocalDateTime since);

    @Query("SELECT SUM(a.costCents) FROM AiUsageLog a WHERE a.createdAt >= :since")
    Long getTotalCostSince(@Param("since") LocalDateTime since);
}