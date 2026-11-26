package org.example.employee.config;

import org.example.employee.model.ContractType;
import org.example.employee.model.Department;
import org.example.employee.model.Employee;
import org.example.employee.model.EmployeeSkill;
import org.example.employee.model.Position;
import org.example.employee.model.ServiceUnit;
import org.example.employee.model.SkillLevel;
import org.example.employee.repo.DepartmentRepository;
import org.example.employee.repo.EmployeeRepository;
import org.example.employee.repo.EmployeeSkillRepository;
import org.example.employee.repo.PositionRepository;
import org.example.employee.repo.ServiceUnitRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.time.LocalDate;
import java.util.List;

@Configuration
public class DataInitializer {

    // ══════════════════════════════════════════════════════════════════════════
    // ORDER 1 — Core departments, services, positions, 8 demo employees
    // ══════════════════════════════════════════════════════════════════════════
    @Bean
    @Order(1)
    CommandLineRunner initEmployeeData(
            EmployeeRepository employeeRepository,
            DepartmentRepository departmentRepository,
            PositionRepository positionRepository,
            ServiceUnitRepository serviceUnitRepository,
            EmployeeSkillRepository skillRepository) {
        return args -> {
            if (departmentRepository.count() == 0) {
                // ────── Departments ──────
                Department hrDept = new Department();
                hrDept.setName("Ressources Humaines");
                hrDept.setDescription("Gestion du capital humain, paie et recrutement.");
                departmentRepository.save(hrDept);

                Department itDept = new Department();
                itDept.setName("Informatique");
                itDept.setDescription("Développement logiciel, infrastructure et sécurité IT.");
                departmentRepository.save(itDept);

                Department marketingDept = new Department();
                marketingDept.setName("Marketing & Communication");
                marketingDept.setDescription("Branding, communication digitale et événementiel.");
                departmentRepository.save(marketingDept);

                Department dataDept = new Department();
                dataDept.setName("Data & Analytics");
                dataDept.setDescription("Intelligence décisionnelle, BI et Data Science.");
                departmentRepository.save(dataDept);

                // ────── Services ──────
                ServiceUnit devService = new ServiceUnit();
                devService.setName("Développement");
                devService.setDescription("Équipe développement logiciel fullstack.");
                devService.setDepartment(itDept);
                serviceUnitRepository.save(devService);

                ServiceUnit infraService = new ServiceUnit();
                infraService.setName("Infrastructure & Sécurité");
                infraService.setDescription("DevOps, cloud et cybersécurité.");
                infraService.setDepartment(itDept);
                serviceUnitRepository.save(infraService);

                ServiceUnit frontendService = new ServiceUnit();
                frontendService.setName("Frontend");
                frontendService.setDescription("Développement interfaces utilisateur.");
                frontendService.setDepartment(itDept);
                frontendService.setParentService(devService);
                serviceUnitRepository.save(frontendService);

                ServiceUnit backendService = new ServiceUnit();
                backendService.setName("Backend & API");
                backendService.setDescription("Développement APIs et services métier.");
                backendService.setDepartment(itDept);
                backendService.setParentService(devService);
                serviceUnitRepository.save(backendService);

                ServiceUnit mktDigitalService = new ServiceUnit();
                mktDigitalService.setName("Marketing Digital");
                mktDigitalService.setDescription("SEO, réseaux sociaux et contenu web.");
                mktDigitalService.setDepartment(marketingDept);
                serviceUnitRepository.save(mktDigitalService);

                ServiceUnit brandingService = new ServiceUnit();
                brandingService.setName("Design & Branding");
                brandingService.setDescription("Identité visuelle et création graphique.");
                brandingService.setDepartment(marketingDept);
                serviceUnitRepository.save(brandingService);

                ServiceUnit dataEnginService = new ServiceUnit();
                dataEnginService.setName("Data Engineering");
                dataEnginService.setDescription("Pipelines de données et ETL.");
                dataEnginService.setDepartment(dataDept);
                serviceUnitRepository.save(dataEnginService);

                ServiceUnit dataAnalyticsService = new ServiceUnit();
                dataAnalyticsService.setName("Business Intelligence");
                dataAnalyticsService.setDescription("Tableaux de bord et rapports décisionnels.");
                dataAnalyticsService.setDepartment(dataDept);
                serviceUnitRepository.save(dataAnalyticsService);

                ServiceUnit rhRecrutService = new ServiceUnit();
                rhRecrutService.setName("Recrutement");
                rhRecrutService.setDescription("Sourcing, entretiens et intégration.");
                rhRecrutService.setDepartment(hrDept);
                serviceUnitRepository.save(rhRecrutService);

                // ────── Positions ──────
                Position rhAdminPos = new Position();
                rhAdminPos.setTitle("Administrateur RH");
                rhAdminPos.setDepartment(hrDept);
                positionRepository.save(rhAdminPos);

                Position mgrPos = new Position();
                mgrPos.setTitle("Manager Technique");
                mgrPos.setDepartment(itDept);
                positionRepository.save(mgrPos);

                Position devPos = new Position();
                devPos.setTitle("Développeur Fullstack");
                devPos.setDepartment(itDept);
                positionRepository.save(devPos);

                Position designPos = new Position();
                designPos.setTitle("UI/UX Designer");
                designPos.setDepartment(marketingDept);
                positionRepository.save(designPos);

                Position dataPos = new Position();
                dataPos.setTitle("Data Analyst");
                dataPos.setDepartment(dataDept);
                positionRepository.save(dataPos);

                Position juniorDevPos = new Position();
                juniorDevPos.setTitle("Développeur Junior");
                juniorDevPos.setDepartment(itDept);
                positionRepository.save(juniorDevPos);

                Position mktPos = new Position();
                mktPos.setTitle("Chargé de Communication");
                mktPos.setDepartment(marketingDept);
                positionRepository.save(mktPos);

                Position mgrDataPos = new Position();
                mgrDataPos.setTitle("Manager Data");
                mgrDataPos.setDepartment(dataDept);
                positionRepository.save(mgrDataPos);

                // ────── Employees ──────
                Employee admin = null;
                if (!employeeRepository.existsByEmail("admin@hr.sirh.com")) {
                    admin = new Employee();
                    admin.setFirstName("Salma");
                    admin.setLastName("Ben Romdhane");
                    admin.setEmail("admin@hr.sirh.com");
                    admin.setPhone("+216 71 100 200");
                    admin.setHireDate(LocalDate.of(2021, 3, 15));
                    admin.setDepartment(hrDept);
                    admin.setPosition(rhAdminPos);
                    admin.setContractType(ContractType.CDI);
                    admin.setService(rhRecrutService);
                    admin = employeeRepository.save(admin);
                } else {
                    admin = employeeRepository.findByEmail("admin@hr.sirh.com").orElse(null);
                }

                Employee manager = null;
                if (!employeeRepository.existsByEmail("manager@mgr.sirh.com")) {
                    manager = new Employee();
                    manager.setFirstName("Mehdi");
                    manager.setLastName("Trabelsi");
                    manager.setEmail("manager@mgr.sirh.com");
                    manager.setPhone("+216 55 200 300");
                    manager.setHireDate(LocalDate.of(2022, 1, 10));
                    manager.setDepartment(itDept);
                    manager.setPosition(mgrPos);
                    manager.setContractType(ContractType.CDI);
                    manager.setService(devService);
                    manager.setManager(admin);
                    manager = employeeRepository.save(manager);
                } else {
                    manager = employeeRepository.findByEmail("manager@mgr.sirh.com").orElse(null);
                }

                Employee nadia = null;
                if (!employeeRepository.existsByEmail("nadia.mgr@sirh.com")) {
                    nadia = new Employee();
                    nadia.setFirstName("Nadia");
                    nadia.setLastName("Gharbi");
                    nadia.setEmail("nadia.mgr@sirh.com");
                    nadia.setPhone("+216 98 300 400");
                    nadia.setHireDate(LocalDate.of(2022, 7, 1));
                    nadia.setDepartment(dataDept);
                    nadia.setPosition(mgrDataPos);
                    nadia.setContractType(ContractType.CDI);
                    nadia.setService(dataEnginService);
                    nadia.setManager(admin);
                    nadia = employeeRepository.save(nadia);
                } else {
                    nadia = employeeRepository.findByEmail("nadia.mgr@sirh.com").orElse(null);
                }

                if (!employeeRepository.existsByEmail("employee@sirh.com")) {
                    Employee emp = new Employee();
                    emp.setFirstName("Ayoub");
                    emp.setLastName("Mansouri");
                    emp.setEmail("employee@sirh.com");
                    emp.setPhone("+216 22 400 500");
                    emp.setHireDate(LocalDate.of(2023, 6, 1));
                    emp.setDepartment(itDept);
                    emp.setPosition(devPos);
                    emp.setContractType(ContractType.CDI);
                    emp.setService(backendService);
                    emp.setManager(manager);
                    employeeRepository.save(emp);
                }

                if (!employeeRepository.existsByEmail("youssef.dev@sirh.com")) {
                    Employee youssef = new Employee();
                    youssef.setFirstName("Youssef");
                    youssef.setLastName("Ben Ali");
                    youssef.setEmail("youssef.dev@sirh.com");
                    youssef.setPhone("+216 50 500 600");
                    youssef.setHireDate(LocalDate.of(2024, 3, 1));
                    youssef.setDepartment(itDept);
                    youssef.setPosition(juniorDevPos);
                    youssef.setContractType(ContractType.STAGE);
                    youssef.setService(frontendService);
                    youssef.setManager(manager);
                    employeeRepository.save(youssef);
                }

                if (!employeeRepository.existsByEmail("karim.design@sirh.com")) {
                    Employee karim = new Employee();
                    karim.setFirstName("Karim");
                    karim.setLastName("Hamdi");
                    karim.setEmail("karim.design@sirh.com");
                    karim.setPhone("+216 71 600 700");
                    karim.setHireDate(LocalDate.of(2023, 9, 1));
                    karim.setDepartment(marketingDept);
                    karim.setPosition(designPos);
                    karim.setContractType(ContractType.CDD);
                    karim.setService(brandingService);
                    karim.setManager(admin);
                    employeeRepository.save(karim);
                }

                if (!employeeRepository.existsByEmail("clara.mkt@sirh.com")) {
                    Employee clara = new Employee();
                    clara.setFirstName("Cyrine");
                    clara.setLastName("Bouzid");
                    clara.setEmail("clara.mkt@sirh.com");
                    clara.setPhone("+216 25 700 800");
                    clara.setHireDate(LocalDate.of(2023, 11, 1));
                    clara.setDepartment(marketingDept);
                    clara.setPosition(mktPos);
                    clara.setContractType(ContractType.CDI);
                    clara.setService(mktDigitalService);
                    clara.setManager(admin);
                    employeeRepository.save(clara);
                }

                if (!employeeRepository.existsByEmail("lea.data@sirh.com")) {
                    Employee lea = new Employee();
                    lea.setFirstName("Lina");
                    lea.setLastName("Chaabane");
                    lea.setEmail("lea.data@sirh.com");
                    lea.setPhone("+216 55 800 900");
                    lea.setHireDate(LocalDate.of(2024, 1, 15));
                    lea.setDepartment(dataDept);
                    lea.setPosition(dataPos);
                    lea.setContractType(ContractType.CDI);
                    lea.setService(dataAnalyticsService);
                    lea.setManager(nadia);
                    employeeRepository.save(lea);
                }

                // ────── Skills par employé ──────
                seedSkills(skillRepository, employeeRepository, "admin@hr.sirh.com",
                    new String[]{"Gestion RH", "Recrutement", "Droit du travail", "SIRH", "Communication"},
                    new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

                seedSkills(skillRepository, employeeRepository, "manager@mgr.sirh.com",
                    new String[]{"Java", "Architecture logicielle", "Gestion d'équipe", "Spring Boot", "CI/CD"},
                    new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

                seedSkills(skillRepository, employeeRepository, "nadia.mgr@sirh.com",
                    new String[]{"Data Science", "Python", "Machine Learning", "Management", "Power BI"},
                    new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

                seedSkills(skillRepository, employeeRepository, "employee@sirh.com",
                    new String[]{"Java", "Spring Boot", "REST API", "MySQL", "Docker"},
                    new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE});

                seedSkills(skillRepository, employeeRepository, "youssef.dev@sirh.com",
                    new String[]{"Angular", "TypeScript", "HTML/CSS", "React", "Git"},
                    new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE, SkillLevel.DEBUTANT});

                seedSkills(skillRepository, employeeRepository, "karim.design@sirh.com",
                    new String[]{"Figma", "Adobe XD", "UI/UX Design", "Illustration", "Prototypage"},
                    new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE});

                seedSkills(skillRepository, employeeRepository, "clara.mkt@sirh.com",
                    new String[]{"Marketing Digital", "SEO/SEM", "Rédaction web", "Réseaux sociaux", "Google Analytics"},
                    new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.INTERMEDIAIRE});

                seedSkills(skillRepository, employeeRepository, "lea.data@sirh.com",
                    new String[]{"SQL", "Python", "Tableau", "Statistiques", "ETL"},
                    new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

                System.out.println("✅ Données initialisées: 4 départements, 9 services, 8 postes, 8 employés.");
            }
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ORDER 2 — Fix hierarchy (unchanged)
    // ══════════════════════════════════════════════════════════════════════════
    @Bean
    @Order(2)
    CommandLineRunner fixHierarchy(EmployeeRepository employeeRepository) {
        return args -> {
            String adminId = employeeRepository
                    .findByEmail("admin@hr.sirh.com")
                    .map(Employee::getId).orElse(null);
            if (adminId == null) return;

            String marcId  = employeeRepository.findByEmail("manager@mgr.sirh.com").map(Employee::getId).orElse(null);
            String nadiaId = employeeRepository.findByEmail("nadia.mgr@sirh.com").map(Employee::getId).orElse(null);

            employeeRepository.assignManagerIfNull("manager@mgr.sirh.com",  adminId);
            employeeRepository.assignManagerIfNull("nadia.mgr@sirh.com",    adminId);
            employeeRepository.assignManagerIfNull("karim.design@sirh.com", adminId);
            employeeRepository.assignManagerIfNull("clara.mkt@sirh.com",    adminId);

            if (marcId != null) {
                employeeRepository.assignManagerIfNull("employee@sirh.com",    marcId);
                employeeRepository.assignManagerIfNull("youssef.dev@sirh.com", marcId);
            }
            if (nadiaId != null) {
                employeeRepository.assignManagerIfNull("lea.data@sirh.com", nadiaId);
            }
            System.out.println("✅ fixHierarchy: relations managériales vérifiées.");
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ORDER 3 — Bulk employees: 4 new departments + 47 employees
    // ══════════════════════════════════════════════════════════════════════════
    @Bean
    @Order(3)
    CommandLineRunner bulkSeedEmployees(
            EmployeeRepository employeeRepository,
            DepartmentRepository departmentRepository,
            PositionRepository positionRepository,
            ServiceUnitRepository serviceUnitRepository,
            EmployeeSkillRepository skillRepository) {
        return args -> {
            // Guard: only run if fewer than 15 employees exist
            if (employeeRepository.count() >= 15) return;

            // ── Fetch existing departments ──────────────────────────────────
            List<Department> allDepts = departmentRepository.findAll();
            Department itDept      = allDepts.stream().filter(d -> d.getName().equalsIgnoreCase("Informatique")).findFirst().orElse(null);
            Department hrDept      = allDepts.stream().filter(d -> d.getName().equalsIgnoreCase("Ressources Humaines")).findFirst().orElse(null);
            Department mktDept     = allDepts.stream().filter(d -> d.getName().equalsIgnoreCase("Marketing & Communication")).findFirst().orElse(null);
            Department dataDept    = allDepts.stream().filter(d -> d.getName().equalsIgnoreCase("Data & Analytics")).findFirst().orElse(null);

            if (itDept == null || hrDept == null) {
                System.out.println("⚠️ bulkSeed: departments not ready yet.");
                return;
            }

            // ── New departments ─────────────────────────────────────────────
            Department financeDept = getOrCreate(departmentRepository, "Finance & Comptabilité",
                "Gestion financière, comptabilité, audit et contrôle de gestion.");
            Department commercialDept = getOrCreate(departmentRepository, "Commercial & Ventes",
                "Développement commercial, grands comptes et prospection.");
            Department opsDept = getOrCreate(departmentRepository, "Opérations & Logistique",
                "Supply chain, achats, qualité et planification.");
            Department directionDept = getOrCreate(departmentRepository, "Direction Générale",
                "Direction exécutive et stratégie d'entreprise.");

            // ── New services ────────────────────────────────────────────────
            ServiceUnit devService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Développement".equals(s.getName())).findFirst().orElse(null);
            ServiceUnit infraService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Infrastructure & Sécurité".equals(s.getName())).findFirst().orElse(null);
            ServiceUnit frontendService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Frontend".equals(s.getName())).findFirst().orElse(null);
            ServiceUnit backendService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Backend & API".equals(s.getName())).findFirst().orElse(null);
            ServiceUnit dataEnginService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Data Engineering".equals(s.getName())).findFirst().orElse(null);
            ServiceUnit biService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Business Intelligence".equals(s.getName())).findFirst().orElse(null);
            ServiceUnit mktDigService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Marketing Digital".equals(s.getName())).findFirst().orElse(null);
            ServiceUnit brandingService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Design & Branding".equals(s.getName())).findFirst().orElse(null);
            ServiceUnit rhRecrutService = serviceUnitRepository.findAll().stream()
                .filter(s -> "Recrutement".equals(s.getName())).findFirst().orElse(null);

            ServiceUnit financeService = getOrCreateService(serviceUnitRepository, "Finance Générale", "Comptabilité et finance d'entreprise.", financeDept);
            ServiceUnit commercialService = getOrCreateService(serviceUnitRepository, "Ventes Grands Comptes", "Key accounts et prospection B2B.", commercialDept);
            ServiceUnit opsService = getOrCreateService(serviceUnitRepository, "Supply Chain", "Flux logistiques et planification.", opsDept);
            ServiceUnit qualiteService = getOrCreateService(serviceUnitRepository, "Qualité & Achats", "Contrôle qualité et achats.", opsDept);

            // ── New positions ────────────────────────────────────────────────
            Position backendSeniorPos   = getOrCreatePosition(positionRepository, "Développeur Backend Senior", itDept);
            Position frontendSeniorPos  = getOrCreatePosition(positionRepository, "Développeur Frontend Senior", itDept);
            Position devopsPos          = getOrCreatePosition(positionRepository, "DevOps Engineer", itDept);
            Position architectePos      = getOrCreatePosition(positionRepository, "Architecte Solution", itDept);
            Position cybersecPos        = getOrCreatePosition(positionRepository, "Ingénieur Cybersécurité", itDept);
            Position mobilePos          = getOrCreatePosition(positionRepository, "Développeur Mobile", itDept);
            Position qaPos              = getOrCreatePosition(positionRepository, "Ingénieur QA", itDept);
            Position cloudPos           = getOrCreatePosition(positionRepository, "Cloud Engineer", itDept);
            Position poPos              = getOrCreatePosition(positionRepository, "Product Owner", itDept);

            Position rhResponsablePos   = getOrCreatePosition(positionRepository, "Responsable RH", hrDept);
            Position paiePos            = getOrCreatePosition(positionRepository, "Chargé de Paie", hrDept);
            Position hrbpPos            = getOrCreatePosition(positionRepository, "HRBP", hrDept);
            Position formationPos       = getOrCreatePosition(positionRepository, "Responsable Formation", hrDept);

            Position dataEngineerPos    = getOrCreatePosition(positionRepository, "Data Engineer", dataDept);
            Position dataSciencePos     = getOrCreatePosition(positionRepository, "Data Scientist", dataDept);
            Position biPos              = getOrCreatePosition(positionRepository, "Développeur BI", dataDept);
            Position mlPos              = getOrCreatePosition(positionRepository, "Ingénieur ML", dataDept);

            Position mktResponsablePos  = getOrCreatePosition(positionRepository, "Responsable Marketing Digital", mktDept);
            Position cmPos              = getOrCreatePosition(positionRepository, "Community Manager", mktDept);
            Position chefProjetDigPos   = getOrCreatePosition(positionRepository, "Chef de Projet Digital", mktDept);
            Position graphistePos       = getOrCreatePosition(positionRepository, "Graphiste Senior", mktDept);

            Position dafPos             = getOrCreatePosition(positionRepository, "Directeur Financier", financeDept);
            Position controlGestionPos  = getOrCreatePosition(positionRepository, "Contrôleur de Gestion", financeDept);
            Position comptablePos       = getOrCreatePosition(positionRepository, "Comptable Senior", financeDept);
            Position auditPos           = getOrCreatePosition(positionRepository, "Auditeur Interne", financeDept);
            Position tresorierPos       = getOrCreatePosition(positionRepository, "Trésorier", financeDept);

            Position dirComPos          = getOrCreatePosition(positionRepository, "Directeur Commercial", commercialDept);
            Position kamPos             = getOrCreatePosition(positionRepository, "Key Account Manager", commercialDept);
            Position ingComPos          = getOrCreatePosition(positionRepository, "Ingénieur Commercial", commercialDept);
            Position prospectionPos     = getOrCreatePosition(positionRepository, "Chargé de Prospection", commercialDept);

            Position supplyChainPos     = getOrCreatePosition(positionRepository, "Responsable Supply Chain", opsDept);
            Position achatsPos          = getOrCreatePosition(positionRepository, "Gestionnaire Achats", opsDept);
            Position qualitePos         = getOrCreatePosition(positionRepository, "Responsable Qualité ISO", opsDept);
            Position logisticienPos     = getOrCreatePosition(positionRepository, "Logisticien Senior", opsDept);

            // ── Manager references ──────────────────────────────────────────
            Employee adminRef    = employeeRepository.findByEmail("admin@hr.sirh.com").orElse(null);
            Employee marcRef     = employeeRepository.findByEmail("manager@mgr.sirh.com").orElse(null);
            Employee nadiaRef    = employeeRepository.findByEmail("nadia.mgr@sirh.com").orElse(null);

            // ════════════════════════════════════════════════════════════════
            // INFORMATIQUE — 15 employees
            // ════════════════════════════════════════════════════════════════

            Employee amine = saveEmployee(employeeRepository, "Amine", "Gharbi", "amine.gharbi@sirh.com",
                "+216 55 100 200", LocalDate.of(2021, 5, 10), itDept, backendSeniorPos, ContractType.CDI, backendService, marcRef);
            seedSkills(skillRepository, employeeRepository, "amine.gharbi@sirh.com",
                new String[]{"Java", "Spring Boot", "Microservices", "Docker", "PostgreSQL"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            Employee syrine = saveEmployee(employeeRepository, "Syrine", "Boulares", "syrine.boulares@sirh.com",
                "+216 22 300 400", LocalDate.of(2020, 9, 1), itDept, frontendSeniorPos, ContractType.CDI, frontendService, marcRef);
            seedSkills(skillRepository, employeeRepository, "syrine.boulares@sirh.com",
                new String[]{"Angular", "TypeScript", "React", "Vue.js", "GraphQL"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Hamza", "Trabelsi", "hamza.trabelsi@sirh.com",
                "+216 98 500 600", LocalDate.of(2022, 2, 15), itDept, devopsPos, ContractType.CDI, infraService, marcRef);
            seedSkills(skillRepository, employeeRepository, "hamza.trabelsi@sirh.com",
                new String[]{"Docker", "Kubernetes", "CI/CD", "AWS", "Terraform"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Fatma", "Jelassi", "fatma.jelassi@sirh.com",
                "+216 71 700 800", LocalDate.of(2018, 11, 1), itDept, architectePos, ContractType.CDI, devService, marcRef);
            seedSkills(skillRepository, employeeRepository, "fatma.jelassi@sirh.com",
                new String[]{"Architecture logicielle", "Microservices", "Java", "REST API", "Scrum"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Walid", "Khelifi", "walid.khelifi@sirh.com",
                "+216 50 900 100", LocalDate.of(2021, 7, 20), itDept, cybersecPos, ContractType.CDI, infraService, marcRef);
            seedSkills(skillRepository, employeeRepository, "walid.khelifi@sirh.com",
                new String[]{"Cybersécurité", "OWASP", "Linux", "Pentest", "Réseaux"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Sana", "Ben Ammar", "sana.benammar@sirh.com",
                "+216 25 110 220", LocalDate.of(2023, 1, 10), itDept, backendSeniorPos, ContractType.CDI, backendService, marcRef);
            seedSkills(skillRepository, employeeRepository, "sana.benammar@sirh.com",
                new String[]{"Python", "Django", "PostgreSQL", "Redis", "Docker"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Mohamed Aymen", "Chaouachi", "aymen.chaouachi@sirh.com",
                "+216 98 330 440", LocalDate.of(2023, 6, 1), itDept, mobilePos, ContractType.CDD, frontendService, marcRef);
            seedSkills(skillRepository, employeeRepository, "aymen.chaouachi@sirh.com",
                new String[]{"React", "TypeScript", "REST API", "Git", "Firebase"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Rim", "Zairi", "rim.zairi@sirh.com",
                "+216 22 550 660", LocalDate.of(2022, 8, 1), itDept, qaPos, ContractType.CDI, devService, marcRef);
            seedSkills(skillRepository, employeeRepository, "rim.zairi@sirh.com",
                new String[]{"Tests automatisés", "Selenium", "Jenkins", "Agile", "SQL"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Houssem", "Gargouri", "pierre.leclerc@sirh.com",
                "+216 71 111 222", LocalDate.of(2020, 4, 1), itDept, cloudPos, ContractType.CDI, infraService, marcRef);
            seedSkills(skillRepository, employeeRepository, "pierre.leclerc@sirh.com",
                new String[]{"AWS", "Azure", "Terraform", "Linux", "Docker"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Maher", "Slim", "maher.slim@sirh.com",
                "+216 55 770 880", LocalDate.of(2021, 10, 15), itDept, poPos, ContractType.CDI, devService, marcRef);
            seedSkills(skillRepository, employeeRepository, "maher.slim@sirh.com",
                new String[]{"Scrum", "Agile", "Jira", "UML", "Gestion de projet"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Donia", "Hadj Ali", "donia.hadjali@sirh.com",
                "+216 98 990 001", LocalDate.of(2022, 3, 1), itDept, frontendSeniorPos, ContractType.CDI, frontendService, marcRef);
            seedSkills(skillRepository, employeeRepository, "donia.hadjali@sirh.com",
                new String[]{"Vue.js", "JavaScript", "CSS", "Webpack", "React"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Bilel", "Ferchichi", "bilel.ferchichi@sirh.com",
                "+216 22 112 223", LocalDate.of(2019, 6, 1), itDept, backendSeniorPos, ContractType.CDI, backendService, marcRef);
            seedSkills(skillRepository, employeeRepository, "bilel.ferchichi@sirh.com",
                new String[]{"Java", "Microservices", "Spring Boot", "MySQL", "Kafka"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Hajer", "Maatoug", "hajer.maatoug@sirh.com",
                "+216 71 334 445", LocalDate.of(2023, 3, 15), itDept, backendSeniorPos, ContractType.CDI, backendService, marcRef);
            seedSkills(skillRepository, employeeRepository, "hajer.maatoug@sirh.com",
                new String[]{"Node.js", "JavaScript", "MongoDB", "REST API", "Git"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Zied", "Bourguiba", "zied.bourguiba@sirh.com",
                "+216 50 556 667", LocalDate.of(2022, 11, 1), itDept, devopsPos, ContractType.CDI, infraService, marcRef);
            seedSkills(skillRepository, employeeRepository, "zied.bourguiba@sirh.com",
                new String[]{"Jenkins", "CI/CD", "Docker", "Linux", "Git"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Rim", "Agrebi", "emma.rousseau@sirh.com",
                "+216 22 222 333", LocalDate.of(2024, 1, 10), itDept, frontendSeniorPos, ContractType.CDI, frontendService, marcRef);
            seedSkills(skillRepository, employeeRepository, "emma.rousseau@sirh.com",
                new String[]{"React", "TypeScript", "JavaScript", "CSS", "Git"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            // ════════════════════════════════════════════════════════════════
            // DATA & ANALYTICS — 8 employees
            // ════════════════════════════════════════════════════════════════

            saveEmployee(employeeRepository, "Kaies", "Kammoun", "kaies.kammoun@sirh.com",
                "+216 55 778 889", LocalDate.of(2021, 4, 1), dataDept, dataEngineerPos, ContractType.CDI, dataEnginService, nadiaRef);
            seedSkills(skillRepository, employeeRepository, "kaies.kammoun@sirh.com",
                new String[]{"Python", "Spark", "Hadoop", "ETL", "SQL"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.EXPERT});

            saveEmployee(employeeRepository, "Manel", "Snoussi", "manel.snoussi@sirh.com",
                "+216 22 990 001", LocalDate.of(2022, 5, 15), dataDept, dataSciencePos, ContractType.CDI, dataEnginService, nadiaRef);
            seedSkills(skillRepository, employeeRepository, "manel.snoussi@sirh.com",
                new String[]{"Machine Learning", "Python", "TensorFlow", "Statistiques", "R"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Anis", "Rekik", "anis.rekik@sirh.com",
                "+216 98 112 223", LocalDate.of(2021, 9, 1), dataDept, biPos, ContractType.CDI, biService, nadiaRef);
            seedSkills(skillRepository, employeeRepository, "anis.rekik@sirh.com",
                new String[]{"Power BI", "Tableau", "SQL", "DAX", "ETL"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Wafa", "Dridi", "wafa.dridi@sirh.com",
                "+216 71 334 445", LocalDate.of(2023, 2, 1), dataDept, mlPos, ContractType.CDI, dataEnginService, nadiaRef);
            seedSkills(skillRepository, employeeRepository, "wafa.dridi@sirh.com",
                new String[]{"TensorFlow", "Scikit-learn", "Python", "Machine Learning", "Statistiques"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Slim", "Hammami", "thomas.dupuis@sirh.com",
                "+216 50 333 444", LocalDate.of(2022, 7, 1), dataDept, dataEngineerPos, ContractType.CDI, dataEnginService, nadiaRef);
            seedSkills(skillRepository, employeeRepository, "thomas.dupuis@sirh.com",
                new String[]{"SQL", "Databricks", "Talend", "Python", "ETL"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Sabrine", "Ouali", "sabrine.ouali@sirh.com",
                "+216 50 556 667", LocalDate.of(2023, 8, 1), dataDept, biPos, ContractType.CDD, biService, nadiaRef);
            seedSkills(skillRepository, employeeRepository, "sabrine.ouali@sirh.com",
                new String[]{"Power BI", "DAX", "Excel", "SQL", "QlikView"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Khaled", "Mzali", "khaled.mzali@sirh.com",
                "+216 25 778 889", LocalDate.of(2020, 11, 1), dataDept, dataSciencePos, ContractType.CDI, biService, nadiaRef);
            seedSkills(skillRepository, employeeRepository, "khaled.mzali@sirh.com",
                new String[]{"R", "Python", "Statistiques", "Machine Learning", "Data Warehouse"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Amina", "Dridi", "camille.martin@sirh.com",
                "+216 98 444 555", LocalDate.of(2022, 1, 15), dataDept, dataEngineerPos, ContractType.CDI, dataEnginService, nadiaRef);
            seedSkills(skillRepository, employeeRepository, "camille.martin@sirh.com",
                new String[]{"Spark", "Python", "Hadoop", "SQL", "Databricks"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            // ════════════════════════════════════════════════════════════════
            // MARKETING & COMMUNICATION — 5 employees
            // ════════════════════════════════════════════════════════════════

            saveEmployee(employeeRepository, "Yosra", "Triki", "yosra.triki@sirh.com",
                "+216 55 990 001", LocalDate.of(2021, 6, 1), mktDept, mktResponsablePos, ContractType.CDI, mktDigService, adminRef);
            seedSkills(skillRepository, employeeRepository, "yosra.triki@sirh.com",
                new String[]{"SEO", "Google Ads", "Analytics", "Content Marketing", "HubSpot"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Mehdi", "Latrach", "mehdi.latrach@sirh.com",
                "+216 22 112 223", LocalDate.of(2023, 1, 5), mktDept, cmPos, ContractType.CDI, mktDigService, adminRef);
            seedSkills(skillRepository, employeeRepository, "mehdi.latrach@sirh.com",
                new String[]{"Community Management", "Réseaux sociaux", "Canva", "Copywriting", "Meta Ads"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Leila", "Smaoui", "leila.smaoui@sirh.com",
                "+216 98 334 445", LocalDate.of(2020, 8, 1), mktDept, chefProjetDigPos, ContractType.CDI, mktDigService, adminRef);
            seedSkills(skillRepository, employeeRepository, "leila.smaoui@sirh.com",
                new String[]{"Gestion de projet", "SEO", "Analytics", "CRM", "Content Marketing"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Rayan", "Chaker", "rayan.chaker@sirh.com",
                "+216 71 556 667", LocalDate.of(2022, 10, 1), mktDept, graphistePos, ContractType.CDI, brandingService, adminRef);
            seedSkills(skillRepository, employeeRepository, "rayan.chaker@sirh.com",
                new String[]{"Adobe Suite", "Figma", "Canva", "UI/UX Design", "Illustration"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Ines", "Gafsi", "ines.gafsi@sirh.com",
                "+216 50 778 889", LocalDate.of(2024, 2, 1), mktDept, cmPos, ContractType.CDD, mktDigService, adminRef);
            seedSkills(skillRepository, employeeRepository, "ines.gafsi@sirh.com",
                new String[]{"Réseaux sociaux", "Content Marketing", "Copywriting", "Canva", "Meta Ads"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE, SkillLevel.DEBUTANT});

            // ════════════════════════════════════════════════════════════════
            // RESSOURCES HUMAINES — 4 employees
            // ════════════════════════════════════════════════════════════════

            saveEmployee(employeeRepository, "Olfa", "Ben Salah", "olfa.bensalah@sirh.com",
                "+216 55 990 110", LocalDate.of(2020, 1, 15), hrDept, rhResponsablePos, ContractType.CDI, rhRecrutService, adminRef);
            seedSkills(skillRepository, employeeRepository, "olfa.bensalah@sirh.com",
                new String[]{"Recrutement", "GPEC", "Droit du travail", "Talent management", "ATS"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Nizar", "Baccouche", "nizar.baccouche@sirh.com",
                "+216 22 221 332", LocalDate.of(2022, 4, 1), hrDept, paiePos, ContractType.CDI, rhRecrutService, adminRef);
            seedSkills(skillRepository, employeeRepository, "nizar.baccouche@sirh.com",
                new String[]{"Paie", "Cegid", "Excel", "Droit du travail", "SIRH"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Asma", "Jouini", "asma.jouini@sirh.com",
                "+216 98 443 554", LocalDate.of(2021, 11, 1), hrDept, hrbpPos, ContractType.CDI, rhRecrutService, adminRef);
            seedSkills(skillRepository, employeeRepository, "asma.jouini@sirh.com",
                new String[]{"Talent management", "Entretien annuel", "Formation", "Recrutement", "Marque employeur"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Rami", "Belhaj", "david.bernard@sirh.com",
                "+216 55 666 777", LocalDate.of(2023, 5, 1), hrDept, formationPos, ContractType.CDI, rhRecrutService, adminRef);
            seedSkills(skillRepository, employeeRepository, "david.bernard@sirh.com",
                new String[]{"Formation", "Onboarding", "E-learning", "Assessment", "Gestion de projet"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            // ════════════════════════════════════════════════════════════════
            // FINANCE & COMPTABILITÉ — 5 employees
            // ════════════════════════════════════════════════════════════════

            Employee hichem = saveEmployee(employeeRepository, "Hichem", "Oueslati", "hichem.oueslati@sirh.com",
                "+216 71 665 776", LocalDate.of(2019, 3, 1), financeDept, dafPos, ContractType.CDI, financeService, adminRef);
            seedSkills(skillRepository, employeeRepository, "hichem.oueslati@sirh.com",
                new String[]{"IFRS", "Contrôle de gestion", "Audit interne", "SAP FI/CO", "Budget"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Amira", "Ghezali", "amira.ghezali@sirh.com",
                "+216 50 887 998", LocalDate.of(2021, 8, 1), financeDept, controlGestionPos, ContractType.CDI, financeService, hichem);
            seedSkills(skillRepository, employeeRepository, "amira.ghezali@sirh.com",
                new String[]{"Contrôle de gestion", "Excel financier", "Budget", "Reporting financier", "SAP FI/CO"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Sofiane", "Bouali", "sofiane.bouali@sirh.com",
                "+216 25 009 110", LocalDate.of(2022, 2, 15), financeDept, comptablePos, ContractType.CDI, financeService, hichem);
            seedSkills(skillRepository, employeeRepository, "sofiane.bouali@sirh.com",
                new String[]{"Comptabilité générale", "Sage", "TVA", "Bilan", "Excel"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Rahma", "Khalfaoui", "rahma.khalfaoui@sirh.com",
                "+216 55 221 332", LocalDate.of(2023, 9, 1), financeDept, auditPos, ContractType.CDI, financeService, hichem);
            seedSkills(skillRepository, employeeRepository, "rahma.khalfaoui@sirh.com",
                new String[]{"Audit interne", "IFRS", "Contrôle interne", "Excel", "Reporting financier"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Ons", "Jlassi", "guillaume.petit@sirh.com",
                "+216 71 555 666", LocalDate.of(2021, 5, 15), financeDept, tresorierPos, ContractType.CDI, financeService, hichem);
            seedSkills(skillRepository, employeeRepository, "guillaume.petit@sirh.com",
                new String[]{"Trésorerie", "Cash management", "SAP FI/CO", "Excel financier", "Analyse des risques"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            // ════════════════════════════════════════════════════════════════
            // COMMERCIAL & VENTES — 5 employees
            // ════════════════════════════════════════════════════════════════

            Employee fares = saveEmployee(employeeRepository, "Fares", "Mansouri", "fares.mansouri@sirh.com",
                "+216 98 443 554", LocalDate.of(2018, 6, 1), commercialDept, dirComPos, ContractType.CDI, commercialService, adminRef);
            seedSkills(skillRepository, employeeRepository, "fares.mansouri@sirh.com",
                new String[]{"Négociation", "Pipeline management", "Salesforce", "B2B", "Key Account"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Sami", "Chouchene", "sami.chouchene@sirh.com",
                "+216 71 665 776", LocalDate.of(2021, 3, 1), commercialDept, kamPos, ContractType.CDI, commercialService, fares);
            seedSkills(skillRepository, employeeRepository, "sami.chouchene@sirh.com",
                new String[]{"Key Account", "Négociation", "Salesforce", "Fidélisation client", "B2B"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Nour", "Haddad", "nour.haddad@sirh.com",
                "+216 50 887 998", LocalDate.of(2022, 6, 15), commercialDept, ingComPos, ContractType.CDI, commercialService, fares);
            seedSkills(skillRepository, employeeRepository, "nour.haddad@sirh.com",
                new String[]{"Prospection", "Salesforce", "B2B", "Présentation commerciale", "Négociation"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Issam", "Toumi", "issam.toumi@sirh.com",
                "+216 25 009 110", LocalDate.of(2023, 10, 1), commercialDept, prospectionPos, ContractType.CDD, commercialService, fares);
            seedSkills(skillRepository, employeeRepository, "issam.toumi@sirh.com",
                new String[]{"Prospection", "CRM", "Négociation", "Excel", "Email marketing"},
                new SkillLevel[]{SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE, SkillLevel.DEBUTANT, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Saoussen", "Ben Fredj", "marie.lambert@sirh.com",
                "+216 22 777 888", LocalDate.of(2020, 9, 15), commercialDept, kamPos, ContractType.CDI, commercialService, fares);
            seedSkills(skillRepository, employeeRepository, "marie.lambert@sirh.com",
                new String[]{"Négociation", "B2C", "Fidélisation client", "Salesforce", "Key Account"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE});

            // ════════════════════════════════════════════════════════════════
            // OPÉRATIONS & LOGISTIQUE — 5 employees
            // ════════════════════════════════════════════════════════════════

            Employee bassem = saveEmployee(employeeRepository, "Bassem", "Ghariani", "bassem.ghariani@sirh.com",
                "+216 55 221 332", LocalDate.of(2019, 10, 1), opsDept, supplyChainPos, ContractType.CDI, opsService, adminRef);
            seedSkills(skillRepository, employeeRepository, "bassem.ghariani@sirh.com",
                new String[]{"Supply Chain", "ERP SAP", "Lean Management", "Transport", "Planification"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.EXPERT});

            saveEmployee(employeeRepository, "Sihem", "Zouari", "sihem.zouari@sirh.com",
                "+216 22 443 554", LocalDate.of(2021, 12, 1), opsDept, achatsPos, ContractType.CDI, qualiteService, bassem);
            seedSkills(skillRepository, employeeRepository, "sihem.zouari@sirh.com",
                new String[]{"Achats", "ERP SAP", "Négociation", "Import/Export", "Gestion des stocks"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Tarek", "Ben Youssef", "tarek.benyoussef@sirh.com",
                "+216 98 665 776", LocalDate.of(2022, 4, 15), opsDept, logisticienPos, ContractType.CDI, opsService, bassem);
            seedSkills(skillRepository, employeeRepository, "tarek.benyoussef@sirh.com",
                new String[]{"Gestion des stocks", "WMS", "Transport", "Import/Export", "Planification"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.AVANCE});

            saveEmployee(employeeRepository, "Yousra", "Derbel", "yousra.derbel@sirh.com",
                "+216 71 887 998", LocalDate.of(2020, 7, 1), opsDept, qualitePos, ContractType.CDI, qualiteService, bassem);
            seedSkills(skillRepository, employeeRepository, "yousra.derbel@sirh.com",
                new String[]{"Qualité ISO 9001", "Audit qualité", "Six Sigma", "Lean Management", "Gestion des risques"},
                new SkillLevel[]{SkillLevel.EXPERT, SkillLevel.EXPERT, SkillLevel.AVANCE, SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE});

            saveEmployee(employeeRepository, "Tarek", "Mejri", "lucas.fontaine@sirh.com",
                "+216 25 888 999", LocalDate.of(2023, 2, 15), opsDept, achatsPos, ContractType.CDI, qualiteService, bassem);
            seedSkills(skillRepository, employeeRepository, "lucas.fontaine@sirh.com",
                new String[]{"Achats", "Négociation", "ERP SAP", "Supply Chain", "Excel"},
                new SkillLevel[]{SkillLevel.AVANCE, SkillLevel.INTERMEDIAIRE, SkillLevel.INTERMEDIAIRE, SkillLevel.DEBUTANT, SkillLevel.AVANCE});

            long total = employeeRepository.count();
            System.out.println("✅ BulkSeed: " + total + " employés au total (8 depts, 35+ postes, profils Tunisie/France/International).");
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Department getOrCreate(DepartmentRepository repo, String name, String description) {
        return repo.findAll().stream()
            .filter(d -> d.getName().equalsIgnoreCase(name))
            .findFirst()
            .orElseGet(() -> {
                Department d = new Department();
                d.setName(name);
                d.setDescription(description);
                return repo.save(d);
            });
    }

    private ServiceUnit getOrCreateService(ServiceUnitRepository repo, String name, String desc, Department dept) {
        return repo.findAll().stream()
            .filter(s -> s.getName().equalsIgnoreCase(name))
            .findFirst()
            .orElseGet(() -> {
                ServiceUnit s = new ServiceUnit();
                s.setName(name);
                s.setDescription(desc);
                s.setDepartment(dept);
                return repo.save(s);
            });
    }

    private Position getOrCreatePosition(PositionRepository repo, String title, Department dept) {
        return repo.findAll().stream()
            .filter(p -> p.getTitle().equalsIgnoreCase(title))
            .findFirst()
            .orElseGet(() -> {
                Position p = new Position();
                p.setTitle(title);
                p.setDepartment(dept);
                return repo.save(p);
            });
    }

    private Employee saveEmployee(EmployeeRepository repo,
                                   String firstName, String lastName, String email,
                                   String phone, LocalDate hireDate,
                                   Department dept, Position position,
                                   ContractType contractType, ServiceUnit service, Employee manager) {
        if (repo.existsByEmail(email)) {
            return repo.findByEmail(email).orElse(null);
        }
        Employee e = new Employee();
        e.setFirstName(firstName);
        e.setLastName(lastName);
        e.setEmail(email);
        e.setPhone(phone);
        e.setHireDate(hireDate);
        e.setDepartment(dept);
        e.setPosition(position);
        e.setContractType(contractType);
        e.setService(service);
        e.setManager(manager);
        return repo.save(e);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ORDER 4 — Fix CEO profile: move Sophie to Direction Générale / DG
    // ══════════════════════════════════════════════════════════════════════════
    @Bean
    @Order(4)
    CommandLineRunner fixCeoProfile(
            EmployeeRepository employeeRepository,
            DepartmentRepository departmentRepository,
            PositionRepository positionRepository) {
        return args -> {
            if (!employeeRepository.existsByEmail("admin@hr.sirh.com")) return;

            // Get or create Direction Générale (no entity load needed)
            Department directionDept = departmentRepository.findAll().stream()
                .filter(d -> "Direction Générale".equals(d.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Department d = new Department();
                    d.setName("Direction Générale");
                    d.setDescription("Direction exécutive et stratégie d'entreprise.");
                    return departmentRepository.save(d);
                });

            final Department finalDir = directionDept;
            Position dgPos = positionRepository.findAll().stream()
                .filter(p -> "Directeur Général".equals(p.getTitle()))
                .findFirst()
                .orElseGet(() -> {
                    Position p = new Position();
                    p.setTitle("Directeur Général");
                    p.setDepartment(finalDir);
                    return positionRepository.save(p);
                });

            // Direct SQL update — no entity loading, no lazy proxy, no LazyInitializationException
            employeeRepository.updateDepartmentAndPosition(
                "admin@hr.sirh.com", directionDept.getId(), dgPos.getId());
            System.out.println("✅ fixCeoProfile: Salma → Direction Générale / Directeur Général.");
        };
    }

    private void seedSkills(EmployeeSkillRepository skillRepo,
                             EmployeeRepository empRepo,
                             String email, String[] names, SkillLevel[] levels) {
        empRepo.findByEmail(email).ifPresent(emp -> {
            if (emp.getSkills().isEmpty()) {
                for (int i = 0; i < names.length; i++) {
                    skillRepo.save(new EmployeeSkill(emp, names[i], levels[i]));
                }
            }
        });
    }
}