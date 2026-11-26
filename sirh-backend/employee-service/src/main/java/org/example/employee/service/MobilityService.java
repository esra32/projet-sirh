package org.example.employee.service;

import org.example.employee.dto.MobilityCreateRequest;
import org.example.employee.dto.MobilityRequestDTO;
import org.example.employee.dto.MobilityStatusUpdateRequest;
import org.example.employee.exception.ResourceNotFoundException;
import org.example.employee.model.*;
import org.example.employee.repo.EmployeeRepository;
import org.example.employee.repo.MobilityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class MobilityService {

    private static final Logger log = LoggerFactory.getLogger(MobilityService.class);

    private static final String HR_EMAIL = "admin@hr.sirh.com";

    private final MobilityRepository mobilityRepo;
    private final EmployeeRepository employeeRepo;
    private final MobilityPolicyService policyService;
    private final MobilityEmailService emailService;
    private final MobilityNotificationClient notifClient;

    public MobilityService(MobilityRepository mobilityRepo,
                           EmployeeRepository employeeRepo,
                           MobilityPolicyService policyService,
                           MobilityEmailService emailService,
                           MobilityNotificationClient notifClient) {
        this.mobilityRepo = mobilityRepo;
        this.employeeRepo = employeeRepo;
        this.policyService = policyService;
        this.emailService = emailService;
        this.notifClient = notifClient;
    }

    @Transactional
    public MobilityRequestDTO create(MobilityCreateRequest req) {
        Employee employee = employeeRepo.findById(req.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employé", req.getEmployeeId()));

        MobilityPolicy policy = policyService.loadPolicy();

        // ── Règle 1 : type de contrat autorisé ──────────────────────────
        if (employee.getContractType() != null
                && !policy.getAllowedContractTypes().isEmpty()
                && !policy.getAllowedContractTypes().contains(employee.getContractType())) {
            throw new IllegalArgumentException(
                "Votre type de contrat (" + employee.getContractType() + ") n'est pas éligible à la mobilité interne.");
        }

        // ── Règle 2 : ancienneté minimale ────────────────────────────────
        if (employee.getHireDate() != null) {
            long monthsWorked = ChronoUnit.MONTHS.between(employee.getHireDate(), LocalDate.now());
            if (monthsWorked < policy.getMinimumSeniorityMonths()) {
                throw new IllegalArgumentException(
                    "Ancienneté insuffisante. Minimum requis : " + policy.getMinimumSeniorityMonths()
                    + " mois. Votre ancienneté : " + monthsWorked + " mois.");
            }
        }

        List<MobilityRequest> existing = mobilityRepo.findByEmployee_Id(req.getEmployeeId());

        // ── Règle 3 : candidatures simultanées max ───────────────────────
        long pendingCount = existing.stream()
                .filter(m -> m.getStatus() == MobilityStatus.PENDING
                          || m.getStatus() == MobilityStatus.MANAGER_APPROVED)
                .count();
        if (pendingCount >= policy.getMaxSimultaneousApplications()) {
            throw new IllegalArgumentException(
                "Nombre maximum de candidatures simultanées atteint (" + policy.getMaxSimultaneousApplications() + ").");
        }

        // ── Règle 4 : carence après refus ────────────────────────────────
        existing.stream()
                .filter(m -> m.getStatus() == MobilityStatus.REJECTED && m.getProcessedDate() != null)
                .mapToLong(m -> ChronoUnit.DAYS.between(m.getProcessedDate(), LocalDate.now()))
                .min()
                .ifPresent(daysSinceLastRejection -> {
                    if (daysSinceLastRejection < policy.getCooldownAfterRejectionDays()) {
                        long remaining = policy.getCooldownAfterRejectionDays() - daysSinceLastRejection;
                        throw new IllegalArgumentException(
                            "Période de carence non écoulée. Vous pourrez re-candidater dans " + remaining + " jour(s).");
                    }
                });

        // ── Règle 5 : mobilité inter-départements ────────────────────────
        if (!policy.isInterDepartmentAllowed() && req.getTargetDepartment() != null) {
            String currentDept = employee.getDepartment() != null ? employee.getDepartment().getName() : null;
            if (currentDept != null && !currentDept.equalsIgnoreCase(req.getTargetDepartment())) {
                throw new IllegalArgumentException(
                    "La mobilité inter-départements n'est pas autorisée selon la politique en vigueur.");
            }
        }

        // ── Création de la demande ───────────────────────────────────────
        MobilityRequest mobility = new MobilityRequest();
        mobility.setEmployee(employee);
        mobility.setCurrentDepartment(employee.getDepartment() != null ? employee.getDepartment().getName() : null);
        mobility.setCurrentPosition(employee.getPosition() != null ? employee.getPosition().getTitle() : null);
        mobility.setTargetDepartment(req.getTargetDepartment());
        mobility.setTargetPosition(req.getTargetPosition());
        mobility.setReason(req.getReason());
        mobility.setRequestDate(LocalDate.now());
        // Si approbation manager requise → PENDING, sinon directement visible par RH
        mobility.setStatus(MobilityStatus.PENDING);

        MobilityRequest saved = mobilityRepo.save(mobility);
        log.info("Demande de mobilité créée pour {} (politique: approbation manager={})",
                employee.getEmail(), policy.isManagerApprovalRequired());

        // ── Notifications email + cloche (indépendants) ──────────────
        if (policy.isManagerApprovalRequired() && employee.getManager() != null) {
            String managerEmail = employee.getManager().getEmail();
            try { emailService.notifyManager(saved, managerEmail); }   catch (Exception e) { log.warn("Email manager: {}", e.getMessage()); }
            try { notifClient.notifyManagerPending(saved, managerEmail); } catch (Exception e) { log.warn("Notif manager: {}", e.getMessage()); }
        }
        if (policy.isNotifyHrOnApplication()) {
            try { emailService.notifyHr(saved, HR_EMAIL); }              catch (Exception e) { log.warn("Email HR: {}", e.getMessage()); }
            try { notifClient.notifyHrNewRequest(saved, HR_EMAIL); }      catch (Exception e) { log.warn("Notif HR: {}", e.getMessage()); }
        }

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<MobilityRequestDTO> findAll() {
        return mobilityRepo.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<MobilityRequestDTO> findByStatus(MobilityStatus status) {
        return mobilityRepo.findByStatus(status).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<MobilityRequestDTO> findByEmployee(String employeeId) {
        return mobilityRepo.findByEmployee_Id(employeeId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<MobilityRequestDTO> findByEmployeeEmail(String email) {
        return mobilityRepo.findByEmployee_Email(email).stream().map(this::toDto).toList();
    }

    /** Demandes PENDING et MANAGER_APPROVED des employés dont le manager est cet email */
    @Transactional(readOnly = true)
    public List<MobilityRequestDTO> findByManagerEmail(String managerEmail) {
        return mobilityRepo.findByEmployee_Manager_Email(managerEmail).stream()
                .filter(m -> m.getStatus() == MobilityStatus.PENDING
                          || m.getStatus() == MobilityStatus.MANAGER_APPROVED)
                .map(this::toDto).toList();
    }

    @Transactional
    public MobilityRequestDTO updateStatus(String id, MobilityStatusUpdateRequest req) {
        MobilityRequest mobility = mobilityRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de mobilité", id));

        mobility.setStatus(req.getStatus());
        mobility.setHrComment(req.getHrComment());
        mobility.setProcessedByEmail(req.getProcessedByEmail());

        if (req.getStatus() == MobilityStatus.APPROVED || req.getStatus() == MobilityStatus.REJECTED) {
            mobility.setProcessedDate(LocalDate.now());
        }

        MobilityRequest saved = mobilityRepo.save(mobility);
        log.info("Demande de mobilité {} → statut {}", id, req.getStatus());

        // ── Notifications sur décision (indépendantes) ───────────────
        if (req.getStatus() == MobilityStatus.MANAGER_APPROVED) {
            String managerEmail = req.getProcessedByEmail();
            if (managerEmail != null) {
                try { emailService.notifyManagerApproved(saved, managerEmail); } catch (Exception e) { log.warn("Email mgr approved: {}", e.getMessage()); }
            }
            try { emailService.notifyHr(saved, HR_EMAIL); }                    catch (Exception e) { log.warn("Email HR approved: {}", e.getMessage()); }
            try { notifClient.notifyHrManagerValidated(saved, HR_EMAIL); }      catch (Exception e) { log.warn("Notif HR validated: {}", e.getMessage()); }
        } else if (req.getStatus() == MobilityStatus.APPROVED) {
            try { emailService.notifyEmployee(saved); }                         catch (Exception e) { log.warn("Email emp approved: {}", e.getMessage()); }
            try { notifClient.notifyEmployeeApproved(saved); }                  catch (Exception e) { log.warn("Notif emp approved: {}", e.getMessage()); }
        } else if (req.getStatus() == MobilityStatus.REJECTED) {
            try { emailService.notifyEmployee(saved); }                         catch (Exception e) { log.warn("Email emp rejected: {}", e.getMessage()); }
            try { notifClient.notifyEmployeeRejected(saved); }                  catch (Exception e) { log.warn("Notif emp rejected: {}", e.getMessage()); }
        }

        return toDto(saved);
    }

    @Transactional
    public void delete(String id) {
        if (!mobilityRepo.existsById(id)) throw new ResourceNotFoundException("Demande de mobilité", id);
        mobilityRepo.deleteById(id);
    }

    @Transactional
    public void deleteRejected(String employeeEmail) {
        mobilityRepo.deleteByEmployee_EmailAndStatus(employeeEmail, MobilityStatus.REJECTED);
        log.info("Purge des demandes REJECTED pour {}", employeeEmail);
    }

    private MobilityRequestDTO toDto(MobilityRequest m) {
        MobilityRequestDTO dto = new MobilityRequestDTO();
        dto.setId(m.getId());
        dto.setEmployeeId(m.getEmployee().getId());
        dto.setEmployeeName(m.getEmployee().getFirstName() + " " + m.getEmployee().getLastName());
        dto.setEmployeeEmail(m.getEmployee().getEmail());
        dto.setCurrentDepartment(m.getCurrentDepartment());
        dto.setCurrentPosition(m.getCurrentPosition());
        dto.setTargetDepartment(m.getTargetDepartment());
        dto.setTargetPosition(m.getTargetPosition());
        dto.setReason(m.getReason());
        dto.setStatus(m.getStatus());
        dto.setRequestDate(m.getRequestDate());
        dto.setProcessedDate(m.getProcessedDate());
        dto.setProcessedByEmail(m.getProcessedByEmail());
        dto.setHrComment(m.getHrComment());
        return dto;
    }
}