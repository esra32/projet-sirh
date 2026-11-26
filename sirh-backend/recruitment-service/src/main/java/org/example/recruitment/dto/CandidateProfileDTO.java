package org.example.recruitment.dto;

import java.util.List;

/**
 * Profil enrichi extrait par Gemini depuis la lettre de motivation et le CV.
 */
public class CandidateProfileDTO {

    private List<String> competences;
    private int anneesExperience;
    private String niveau;           // Junior, Confirmé, Senior
    private String formation;        // ex: "Ingénieur Informatique"
    private List<String> langues;
    private List<String> softSkills;
    private String resumeProfil;     // résumé narratif généré par Gemini

    public CandidateProfileDTO() {}

    public List<String> getCompetences() { return competences; }
    public void setCompetences(List<String> competences) { this.competences = competences; }

    public int getAnneesExperience() { return anneesExperience; }
    public void setAnneesExperience(int anneesExperience) { this.anneesExperience = anneesExperience; }

    public String getNiveau() { return niveau; }
    public void setNiveau(String niveau) { this.niveau = niveau; }

    public String getFormation() { return formation; }
    public void setFormation(String formation) { this.formation = formation; }

    public List<String> getLangues() { return langues; }
    public void setLangues(List<String> langues) { this.langues = langues; }

    public List<String> getSoftSkills() { return softSkills; }
    public void setSoftSkills(List<String> softSkills) { this.softSkills = softSkills; }

    public String getResumeProfil() { return resumeProfil; }
    public void setResumeProfil(String resumeProfil) { this.resumeProfil = resumeProfil; }
}