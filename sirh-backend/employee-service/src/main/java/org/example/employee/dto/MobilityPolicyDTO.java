package org.example.employee.dto;

import org.example.employee.model.ContractType;
import java.util.List;

public class MobilityPolicyDTO {

    private int minimumSeniorityMonths;
    private List<ContractType> allowedContractTypes;
    private int maxSimultaneousApplications;
    private int cooldownAfterRejectionDays;
    private boolean interDepartmentAllowed;
    private boolean internationalAllowed;
    private boolean managerApprovalRequired;
    private boolean notifyHrOnApplication;

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