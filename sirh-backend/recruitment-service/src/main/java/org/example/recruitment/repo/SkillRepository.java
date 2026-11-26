package org.example.recruitment.repo;

import java.util.Optional;
import org.example.recruitment.model.Skill;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillRepository extends JpaRepository<Skill, String> {
    Optional<Skill> findByName(String name);
    boolean existsByNameIgnoreCase(String name);
}
