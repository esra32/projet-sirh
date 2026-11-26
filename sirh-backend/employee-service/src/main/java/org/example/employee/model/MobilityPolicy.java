package org.example.employee.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Politique de mobilité interne — singleton (une seule ligne en base).
 * Chargée et mise à jour par le RH Admin depuis l'espace politiques.
 */
@Entity
@Table(name = "mobility_policy")
public class MobilityPolicy {

    @Id
    private String id = "default";

    /** Ancienneté minimale en mois pour pouvoir candidater */
    private int minimumSeniorityMonths = 6;

    /** Types de contrats autorisés à candidater */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "mobility_policy_contract_types",
                     joinColumns = @JoinColumn(name = "policy_id"))
    @Column(name = "contract_type")
    @Enumerated(EnumType.STRING)
    private List<ContractType> allowedContractTypes = new ArrayList<>(
            List.of(ContractType.CDI, ContractType.CDD)
    );

    /** Nombre max de candidatures simultanées en attente par employé */
    private int maxSimultaneousApplications = 7;

    /** Période de carence après un refus (en jours) */
    private int cooldownAfterRejectionDays = 90;

    /** Autoriser la mobilité vers un autre département */
    private boolean interDepartmentAllowed = true;

    /** Autoriser les postes à l'étranger */
    private boolean internationalAllowed = false;

    /** Le manager direct doit valider avant transmission au RH */
    private boolean managerApprovalRequired = true;

    /** Envoyer un email RH à chaque nouvelle candidature */
    private boolean notifyHrOnApplication = true;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public int getMinimumSeniorityMonths() { return minimumSeniorityMonths; }
    public void setMinimumSeniorityMonths(int minimumSeniorityMonths) { this.minimumSeniorityMonths = minimumSeniorityMonths; }

    public List<ContractType> getAllowedContractTypes() { return allowedContractTypes; }
    public void setAllowedContractTypes(List<ContractType> allowedContractTypes) { this.allowedContractTypes = allowedContractTypes; }

    public int getMaxSimultaneousApplications() { return maxSimultaneousApplications; }
    public void setMaxSimultaneousApplications(int maxSimultaneousApplications) { this.maxSimultaneousApplications = maxSimultaneousApplications; }

    public int getCooldownAfterRejectionDays() { return cooldownAfterRejectionDays; }
    public void setCooldownAfterRejectionDays(int cooldownAfterRejectionDays) { this.cooldownAfterRejectionDays = cooldownAfterRejectionDays; }

    public boolean isInterDepartmentAllowed() { return interDepartmentAllowed; }
    public void setInterDepartmentAllowed(boolean interDepartmentAllowed) { this.interDepartmentAllowed = interDepartmentAllowed; }

    public boolean isInternationalAllowed() { return internationalAllowed; }
    public void setInternationalAllowed(boolean internationalAllowed) { this.internationalAllowed = internationalAllowed; }

    public boolean isManagerApprovalRequired() { return managerApprovalRequired; }
    public void setManagerApprovalRequired(boolean managerApprovalRequired) { this.managerApprovalRequired = managerApprovalRequired; }

    public boolean isNotifyHrOnApplication() { return notifyHrOnApplication; }
    public void setNotifyHrOnApplication(boolean notifyHrOnApplication) { this.notifyHrOnApplication = notifyHrOnApplication; }
}