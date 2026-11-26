package org.example.employee.service;

import org.example.employee.dto.MobilityPolicyDTO;
import org.example.employee.model.MobilityPolicy;
import org.example.employee.repo.MobilityPolicyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MobilityPolicyService {

    private final MobilityPolicyRepository repo;

    public MobilityPolicyService(MobilityPolicyRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public MobilityPolicyDTO get() {
        MobilityPolicy policy = repo.findById("default").orElseGet(MobilityPolicy::new);
        return toDto(policy);
    }

    @Transactional
    public MobilityPolicyDTO save(MobilityPolicyDTO dto) {
        MobilityPolicy policy = repo.findById("default").orElseGet(MobilityPolicy::new);
        policy.setId("default");
        policy.setMinimumSeniorityMonths(dto.getMinimumSeniorityMonths());
        policy.setAllowedContractTypes(dto.getAllowedContractTypes());
        policy.setMaxSimultaneousApplications(dto.getMaxSimultaneousApplications());
        policy.setCooldownAfterRejectionDays(dto.getCooldownAfterRejectionDays());
        policy.setInterDepartmentAllowed(dto.isInterDepartmentAllowed());
        policy.setInternationalAllowed(dto.isInternationalAllowed());
        policy.setManagerApprovalRequired(dto.isManagerApprovalRequired());
        policy.setNotifyHrOnApplication(dto.isNotifyHrOnApplication());
        return toDto(repo.save(policy));
    }

    /** Charge la politique active (crée la valeur par défaut si absente). */
    public MobilityPolicy loadPolicy() {
        return repo.findById("default").orElseGet(MobilityPolicy::new);
    }

    private MobilityPolicyDTO toDto(MobilityPolicy p) {
        MobilityPolicyDTO dto = new MobilityPolicyDTO();
        dto.setMinimumSeniorityMonths(p.getMinimumSeniorityMonths());
        dto.setAllowedContractTypes(p.getAllowedContractTypes());
        dto.setMaxSimultaneousApplications(p.getMaxSimultaneousApplications());
        dto.setCooldownAfterRejectionDays(p.getCooldownAfterRejectionDays());
        dto.setInterDepartmentAllowed(p.isInterDepartmentAllowed());
        dto.setInternationalAllowed(p.isInternationalAllowed());
        dto.setManagerApprovalRequired(p.isManagerApprovalRequired());
        dto.setNotifyHrOnApplication(p.isNotifyHrOnApplication());
        return dto;
    }
}