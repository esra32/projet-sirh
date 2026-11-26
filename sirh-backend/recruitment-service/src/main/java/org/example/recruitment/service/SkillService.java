package org.example.recruitment.service;

import java.util.List;
import org.example.recruitment.dto.SkillDTO;
import org.example.recruitment.exception.ResourceNotFoundException;
import org.example.recruitment.model.Skill;
import org.example.recruitment.repo.SkillRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SkillService {

    private final SkillRepository repo;

    public SkillService(SkillRepository repo) { this.repo = repo; }

    public List<SkillDTO> findAll() {
        return repo.findAll().stream().map(s -> new SkillDTO(s.getId(), s.getName())).toList();
    }

    @Transactional
    public SkillDTO create(String name) {
        if (repo.existsByNameIgnoreCase(name)) {
            throw new IllegalArgumentException("Compétence déjà existante : " + name);
        }
        Skill s = repo.save(new Skill(name));
        return new SkillDTO(s.getId(), s.getName());
    }

    @Transactional
    public void delete(String id) {
        if (!repo.existsById(id)) throw new ResourceNotFoundException("Compétence", id);
        repo.deleteById(id);
    }
}
