package org.example.employee.model;

import jakarta.persistence.*;

/**
 * Représente un service ou sous-service appartenant à un département.
 * La relation parentService permet une hiérarchie récursive illimitée :
 *   Département → Service → Sous-service → Sous-sous-service…
 */
@Entity
@Table(name = "services")
public class ServiceUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private String description;

    /** Département auquel appartient ce service. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    /**
     * Service parent (null = service de premier niveau).
     * Relation auto-référencielle pour les sous-services.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_service_id")
    private ServiceUnit parentService;

    // ── Getters / Setters ──────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }

    public ServiceUnit getParentService() { return parentService; }
    public void setParentService(ServiceUnit parentService) { this.parentService = parentService; }
}