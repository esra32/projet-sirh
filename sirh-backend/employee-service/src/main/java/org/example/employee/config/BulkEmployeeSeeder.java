package org.example.employee.config;

import org.example.employee.model.*;
import org.example.employee.repo.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * BulkEmployeeSeeder — @Order(4)
 *
 * Generates 1000+ realistic employees with cultural diversity
 * (Tunisian, Arab, French, European, International) and varied
 * competency profiles per department.
 *
 * Guard: skips if employeeRepository.count() >= 950 (already seeded).
 */
@Configuration
public class BulkEmployeeSeeder {

    // ══════════════════════════════════════════════════════════════════
    // CULTURAL NAME POOLS
    // ══════════════════════════════════════════════════════════════════

    // ── Tunisian ──────────────────────────────────────────────────────
    private static final String[] FN_TN_M = {
        "Amine","Mohamed","Hamza","Walid","Maher","Zied","Bilel","Aymen","Nizar","Kaies",
        "Anis","Khaled","Bassem","Tarek","Fares","Sami","Issam","Hichem","Sofiane","Rami",
        "Adel","Hatem","Rafik","Montassar","Achref","Wassim","Ghassen","Yassine","Oussama",
        "Fathi","Jaber","Lotfi","Habib","Mounir","Ridha","Skander","Slim","Taoufik","Zouhaier"
    };
    private static final String[] FN_TN_F = {
        "Sana","Fatma","Hajer","Leila","Rim","Donia","Syrine","Manel","Wafa","Sabrine",
        "Yosra","Olfa","Asma","Amira","Rahma","Sihem","Yousra","Ines","Nour","Maryem",
        "Emna","Rania","Chaima","Nesrine","Soumaya","Imen","Houda","Selma","Mariem","Mouna",
        "Besma","Chiraz","Dalel","Faouzia","Ghofrane","Hela","Ikram","Jihene","Kalthoum"
    };
    private static final String[] LN_TN = {
        "Gharbi","Boulares","Trabelsi","Jelassi","Khelifi","Ben Ammar","Chaouachi","Zairi",
        "Rekik","Dridi","Snoussi","Kammoun","Mzali","Ouali","Ben Salah","Baccouche",
        "Jouini","Oueslati","Khalfaoui","Zouari","Ben Youssef","Derbel","Mansouri",
        "Chouchene","Haddad","Toumi","Triki","Latrach","Smaoui","Chaker","Gafsi",
        "Ferchichi","Maatoug","Bourguiba","Sassi","Saidi","Karray","Hamdi","Marzouki",
        "Ben Ali","Sfar","Nasr","Brik","Chihi","Ayari","Zidi","Hajji","Tlili","Riahi",
        "Bejaoui","Cherif","Elloumi","Fehri","Ghanmi","Henchiri","Jemli","Khemiri"
    };

    // ── Arab (Morocco, Algeria, Egypt, Lebanon, Gulf) ─────────────────
    private static final String[] FN_AR_M = {
        "Omar","Khalid","Hassan","Tariq","Faisal","Rashid","Abdullah","Youssef","Ahmed",
        "Ali","Ibrahim","Samir","Nabil","Hossam","Ramy","Adnan","Ziad","Kareem","Tarek",
        "Wael","Bassam","Marwan","Saad","Riad","Mourad","Karim","Bachir","Yazid","Mehdi",
        "Rachid","Djamel","Brahim","Abdelkader","Lamine","Hakim","Nordine","Farid"
    };
    private static final String[] FN_AR_F = {
        "Layla","Sara","Nadia","Rania","Amina","Hana","Dina","Yasmine","Mariam","Aya",
        "Heba","Noura","Rana","Salma","Lubna","Mona","Ghada","Aisha","Fatima","Samira",
        "Zineb","Khadija","Malak","Nihal","Sahar","Souad","Wahiba","Zainab","Hafsa"
    };
    private static final String[] LN_AR = {
        "Al-Rashid","Hassan","Qasim","Mansour","Al-Amin","Khalil","Salam","Nasser",
        "Hamdan","Jaber","Al-Omari","Bakr","Shahin","Rahim","Barakat","Ghanem","Othman",
        "Bouazza","Bensalem","Benchikh","Zeroual","Boudaoud","Hamou","Khelil","Mebarki",
        "Benamor","Sebaa","Taleb","Chaoui","Ferhat","Hadjadj","Mazouz","Sahraoui",
        "Benali","Boukhalfa","Djeddi","Ghribi","Hammami","Lakhdar","Meziane"
    };

    // ── French / European ─────────────────────────────────────────────
    private static final String[] FN_FR_M = {
        "Pierre","Thomas","Guillaume","Nicolas","Antoine","Julien","Mathieu","François",
        "Christophe","Laurent","Sébastien","Raphaël","Victor","Alexandre","Maxime",
        "Théo","Hugo","Louis","Arthur","Clément","Baptiste","Tristan","Valentin","Axel",
        "Benoît","Damien","Florian","Grégoire","Jérémy","Kévin","Ludovic","Mickaël"
    };
    private static final String[] FN_FR_F = {
        "Marie","Camille","Sophie","Emma","Isabelle","Claire","Marine","Laura","Céline",
        "Lucie","Pauline","Émilie","Alice","Charlotte","Léa","Manon","Inès","Julie",
        "Anaïs","Mathilde","Audrey","Bérénice","Delphine","Élise","Fanny","Gaëlle",
        "Héloïse","Justine","Laure","Margot","Nathalie","Ophélie","Perrine"
    };
    private static final String[] LN_FR = {
        "Dupont","Martin","Bernard","Rousseau","Petit","Robert","Richard","Lefebvre",
        "Moreau","Simon","Laurent","Michel","Garcia","Dubois","Lambert","Fontaine",
        "Leclerc","Girard","Roux","Blanc","Chevalier","Perrin","Morin","Durand",
        "Mercier","Legrand","Gauthier","Faure","Robin","Henry","Muller","Lefevre",
        "Fournier","Masson","Renard","Vincent","Roussel","Marchand","Bonnet","François"
    };

    // ── International (English, Spanish, Italian, German, Eastern European) ──
    private static final String[] FN_INT_M = {
        "James","David","Michael","Alex","Daniel","Ryan","Kevin","Jason","Aaron","Brian",
        "Carlos","Pablo","Giovanni","Stefan","Erik","Ivan","Andrei","Liam","Noah","Ethan",
        "Marco","Lucas","Diego","Rafael","Matteo","Jan","Lukas","Sven","Magnus","Lars"
    };
    private static final String[] FN_INT_F = {
        "Sarah","Emma","Olivia","Ava","Isabella","Mia","Sofia","Elena","Anna","Victoria",
        "Carmen","Lucia","Ingrid","Katarina","Maria","Valentina","Amelia","Grace","Chloe",
        "Lily","Rosa","Nina","Sandra","Barbara","Monica","Petra","Brigitte","Hanna","Lena"
    };
    private static final String[] LN_INT = {
        "Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Garcia","Rodriguez",
        "Wilson","Anderson","Taylor","Thomas","Jackson","White","Harris","Thompson","Moore",
        "Walker","Lee","Allen","Young","King","Scott","Green","Adams","Baker","Carter",
        "Mitchell","Nelson","Rossi","Ferrari","Müller","Schmidt","Weber","Meyer","Wagner"
    };

    // ══════════════════════════════════════════════════════════════════
    // EMPLOYEE PROFILES
    // Each row: { deptName, positionTitle, skill1, skill2, skill3, skill4, skill5 }
    // The profile index drives which names and contract types are chosen.
    // ══════════════════════════════════════════════════════════════════
    private static final String[][] PROFILES = {
        // ── Informatique — Backend ───────────────────────────────────
        {"Informatique","Développeur Backend Senior","Java","Spring Boot","Docker","PostgreSQL","Microservices"},
        {"Informatique","Développeur Backend Senior","Python","Django","PostgreSQL","Redis","Docker"},
        {"Informatique","Développeur Backend Senior","Node.js","Express","MongoDB","REST API","Git"},
        {"Informatique","Développeur Backend Senior","Java","Kafka","Microservices","MySQL","Docker"},
        {"Informatique","Développeur Backend Senior",".NET","C#","SQL Server","Azure","Docker"},
        {"Informatique","Développeur Backend Senior","Go","gRPC","PostgreSQL","Kubernetes","Docker"},
        // ── Informatique — Frontend ──────────────────────────────────
        {"Informatique","Développeur Frontend Senior","Angular","TypeScript","RxJS","SCSS","Git"},
        {"Informatique","Développeur Frontend Senior","React","TypeScript","Redux","CSS","Webpack"},
        {"Informatique","Développeur Frontend Senior","Vue.js","JavaScript","Vuex","CSS","Git"},
        {"Informatique","Développeur Frontend Senior","Angular","TypeScript","Angular Material","GraphQL","Jest"},
        // ── Informatique — Fullstack ─────────────────────────────────
        {"Informatique","Développeur Fullstack","Java","Angular","Spring Boot","MySQL","Git"},
        {"Informatique","Développeur Fullstack","Node.js","React","MongoDB","GraphQL","Docker"},
        {"Informatique","Développeur Fullstack","Python","Vue.js","PostgreSQL","REST API","Git"},
        {"Informatique","Développeur Fullstack","PHP","Symfony","MySQL","Vue.js","Docker"},
        // ── Informatique — DevOps / Cloud ────────────────────────────
        {"Informatique","DevOps Engineer","Docker","Kubernetes","Jenkins","CI/CD","Terraform"},
        {"Informatique","DevOps Engineer","AWS","Terraform","Docker","Linux","CI/CD"},
        {"Informatique","DevOps Engineer","Azure","Kubernetes","Helm","CI/CD","Linux"},
        {"Informatique","Cloud Engineer","AWS","GCP","Terraform","Kubernetes","Linux"},
        {"Informatique","Cloud Engineer","Azure","Terraform","DevOps","Kubernetes","Linux"},
        // ── Informatique — Autres ─────────────────────────────────────
        {"Informatique","Ingénieur QA","Selenium","Jest","Cypress","Agile","Jira"},
        {"Informatique","Ingénieur Cybersécurité","Cybersécurité","OWASP","Pentest","Linux","Réseaux"},
        {"Informatique","Architecte Solution","Architecture logicielle","Microservices","Java","UML","Scrum"},
        {"Informatique","Développeur Mobile","React Native","TypeScript","Firebase","REST API","Git"},
        {"Informatique","Développeur Mobile","Flutter","Dart","Firebase","REST API","Git"},
        {"Informatique","Product Owner","Scrum","Agile","Jira","UML","Gestion de projet"},
        // ── Data & Analytics — Engineering ──────────────────────────
        {"Data & Analytics","Data Engineer","Python","Spark","Hadoop","ETL","SQL"},
        {"Data & Analytics","Data Engineer","SQL","Databricks","Talend","Python","ETL"},
        {"Data & Analytics","Data Engineer","Python","Airflow","Kafka","PostgreSQL","Docker"},
        {"Data & Analytics","Data Engineer","Spark","Scala","Hadoop","HDFS","ETL"},
        {"Data & Analytics","Data Engineer","dbt","BigQuery","Python","SQL","Airflow"},
        // ── Data — Science / ML ──────────────────────────────────────
        {"Data & Analytics","Data Scientist","Python","Machine Learning","TensorFlow","Statistiques","R"},
        {"Data & Analytics","Data Scientist","Python","Scikit-learn","NLP","Pandas","SQL"},
        {"Data & Analytics","Data Scientist","R","Statistiques","Machine Learning","Visualisation","Python"},
        {"Data & Analytics","Ingénieur ML","TensorFlow","PyTorch","Deep Learning","Python","MLflow"},
        {"Data & Analytics","Ingénieur ML","Scikit-learn","TensorFlow","Python","Machine Learning","Statistiques"},
        {"Data & Analytics","Ingénieur ML","Hugging Face","NLP","Python","PyTorch","MLflow"},
        // ── Data — BI ────────────────────────────────────────────────
        {"Data & Analytics","Développeur BI","Power BI","DAX","SQL","Excel","Tableau"},
        {"Data & Analytics","Développeur BI","Tableau","QlikView","SQL","Python","ETL"},
        {"Data & Analytics","Data Analyst","SQL","Power BI","Excel","Statistiques","Python"},
        {"Data & Analytics","Data Analyst","SQL","Tableau","Python","Statistiques","Looker"},
        // ── Finance ──────────────────────────────────────────────────
        {"Finance & Comptabilité","Comptable Senior","Comptabilité générale","Sage","TVA","Bilan","Excel"},
        {"Finance & Comptabilité","Comptable Senior","Comptabilité générale","Cegid","TVA","Bilan","SAP FI/CO"},
        {"Finance & Comptabilité","Contrôleur de Gestion","Contrôle de gestion","Excel financier","Budget","SAP FI/CO","Reporting financier"},
        {"Finance & Comptabilité","Contrôleur de Gestion","Contrôle de gestion","Power BI","Budget","IFRS","Consolidation"},
        {"Finance & Comptabilité","Auditeur Interne","Audit interne","IFRS","Contrôle interne","Excel","Reporting financier"},
        {"Finance & Comptabilité","Analyste Financier","Analyse financière","Excel financier","Modélisation","IFRS","Bloomberg"},
        {"Finance & Comptabilité","Trésorier","Trésorerie","Cash management","SAP FI/CO","Excel financier","Analyse des risques"},
        // ── Commercial ───────────────────────────────────────────────
        {"Commercial & Ventes","Ingénieur Commercial","Négociation","Salesforce","B2B","Prospection","CRM"},
        {"Commercial & Ventes","Key Account Manager","Key Account","Négociation","Salesforce","Fidélisation client","B2B"},
        {"Commercial & Ventes","Chargé de Prospection","Prospection","CRM","Email marketing","LinkedIn Sales","Négociation"},
        {"Commercial & Ventes","Commercial B2C","B2C","Négociation","Fidélisation client","CRM","Retail"},
        {"Commercial & Ventes","Ingénieur Commercial","Négociation","HubSpot","B2B","Présentation commerciale","Excel"},
        {"Commercial & Ventes","Key Account Manager","Pipeline management","Salesforce","Négociation","B2B","Account planning"},
        // ── Marketing ────────────────────────────────────────────────
        {"Marketing & Communication","Chargé Marketing Digital","SEO","Google Ads","Analytics","Content Marketing","HubSpot"},
        {"Marketing & Communication","Community Manager","Community Management","Réseaux sociaux","Canva","Copywriting","Meta Ads"},
        {"Marketing & Communication","Chef de Projet Digital","Gestion de projet","SEO","Analytics","CRM","Email Marketing"},
        {"Marketing & Communication","Graphiste","Adobe Suite","Figma","Canva","Illustration","Branding"},
        {"Marketing & Communication","Content Manager","Copywriting","SEO","Content Marketing","WordPress","Analytics"},
        {"Marketing & Communication","Responsable Marketing","Branding","Stratégie marketing","Analytics","CRM","Management"},
        // ── RH ───────────────────────────────────────────────────────
        {"Ressources Humaines","Chargé RH","Recrutement","GPEC","Droit du travail","ATS","Talent management"},
        {"Ressources Humaines","Gestionnaire Paie","Paie","Cegid","SIRH","Excel","Droit du travail"},
        {"Ressources Humaines","Responsable Formation","Formation","Onboarding","E-learning","Assessment","Gestion de projet"},
        {"Ressources Humaines","HRBP","Talent management","Entretien annuel","Recrutement","Marque employeur","GPEC"},
        // ── Opérations ───────────────────────────────────────────────
        {"Opérations & Logistique","Logisticien","Supply Chain","ERP SAP","Gestion des stocks","Planification","Transport"},
        {"Opérations & Logistique","Gestionnaire Achats","Achats","ERP SAP","Négociation","Import/Export","Gestion des stocks"},
        {"Opérations & Logistique","Responsable Qualité ISO","Qualité ISO 9001","Audit qualité","Six Sigma","Lean Management","Gestion des risques"},
        {"Opérations & Logistique","Planificateur","Planification","ERP SAP","Supply Chain","Excel","Gestion des stocks"},
        {"Opérations & Logistique","Responsable Supply Chain","Supply Chain","Lean Management","ERP SAP","Transport","Planification"},
    };

    // ══════════════════════════════════════════════════════════════════
    // SKILL LEVEL SCALE — based on simulated seniority
    // ══════════════════════════════════════════════════════════════════
    private static final SkillLevel[] LEVEL_SCALE = {
        SkillLevel.EXPERT,        // 0 — very senior (hired < 2018)
        SkillLevel.AVANCE,        // 1
        SkillLevel.AVANCE,        // 2
        SkillLevel.INTERMEDIAIRE, // 3
        SkillLevel.INTERMEDIAIRE, // 4
        SkillLevel.DEBUTANT,      // 5 — junior (hired > 2023)
    };

    // ══════════════════════════════════════════════════════════════════
    // BEAN — @Order(4)
    // ══════════════════════════════════════════════════════════════════
    @Bean
    @Order(4)
    CommandLineRunner generateBulkEmployees(
            EmployeeRepository     employeeRepo,
            DepartmentRepository   deptRepo,
            PositionRepository     posRepo,
            ServiceUnitRepository  serviceRepo,
            EmployeeSkillRepository skillRepo) {

        return args -> {
            if (employeeRepo.count() >= 950) {
                System.out.println("ℹ️  BulkSeeder: already ≥950 employees — skipping.");
                return;
            }

            // ── Fetch reference data ────────────────────────────────
            Map<String, Department> depts = deptRepo.findAll()
                .stream().collect(Collectors.toMap(Department::getName, d -> d, (a, b) -> a));

            Map<String, Position> positions = posRepo.findAll()
                .stream().collect(Collectors.toMap(Position::getTitle, p -> p, (a, b) -> a));

            // Managers by department
            Employee itMgr   = employeeRepo.findByEmail("manager@mgr.sirh.com").orElse(null);
            Employee dataMgr = employeeRepo.findByEmail("nadia.mgr@sirh.com").orElse(null);
            Employee hrMgr   = employeeRepo.findByEmail("admin@hr.sirh.com").orElse(null);
            Employee finMgr  = employeeRepo.findByEmail("hichem.oueslati@sirh.com").orElse(null);
            Employee comMgr  = employeeRepo.findByEmail("fares.mansouri@sirh.com").orElse(null);
            Employee opsMgr  = employeeRepo.findByEmail("bassem.ghariani@sirh.com").orElse(null);

            Map<String, Employee> managerByDept = new HashMap<>();
            managerByDept.put("Informatique", itMgr);
            managerByDept.put("Data & Analytics", dataMgr);
            managerByDept.put("Ressources Humaines", hrMgr);
            managerByDept.put("Marketing & Communication", hrMgr);
            managerByDept.put("Finance & Comptabilité", finMgr != null ? finMgr : hrMgr);
            managerByDept.put("Commercial & Ventes", comMgr != null ? comMgr : hrMgr);
            managerByDept.put("Opérations & Logistique", opsMgr != null ? opsMgr : hrMgr);
            managerByDept.put("Direction Générale", hrMgr);

            // Hire date range: 2014-01-01 → 2025-04-01 = ~4107 days
            LocalDate startDate = LocalDate.of(2014, 1, 1);
            long rangeDays = 4107L;

            int total = 1000;
            int created = 0;
            int skipped = 0;

            // ── Build combined name pool: 4 origins, 2 genders ─────
            // origin = i % 4:  0=TN, 1=AR, 2=FR, 3=INT
            // gender = i % 2:  0=male, 1=female
            String[][][] firstNamesByOriginGender = {
                { FN_TN_M, FN_TN_F },
                { FN_AR_M, FN_AR_F },
                { FN_FR_M, FN_FR_F },
                { FN_INT_M, FN_INT_F }
            };
            String[][] lastNamesByOrigin = {
                LN_TN, LN_AR, LN_FR, LN_INT
            };

            for (int i = 0; i < total; i++) {
                // ── Pick profile ──────────────────────────────────
                String[] profile = PROFILES[i % PROFILES.length];
                String deptName  = profile[0];
                String posTitle  = profile[1];
                String[] skills  = Arrays.copyOfRange(profile, 2, profile.length);

                // ── Pick name ─────────────────────────────────────
                int origin = i % 4;          // 0=TN 1=AR 2=FR 3=INT
                int gender = (i / 4) % 2;    // alternates groups of 4
                String[] fns = firstNamesByOriginGender[origin][gender];
                String[] lns = lastNamesByOrigin[origin];
                String firstName = fns[i % fns.length];
                String lastName  = lns[(i / fns.length) % lns.length];

                // ── Email (unique) ────────────────────────────────
                String emailBase = toSlug(firstName) + "." + toSlug(lastName);
                String email     = emailBase + "." + (1000 + i) + "@sirh.com";

                if (employeeRepo.existsByEmail(email)) {
                    skipped++;
                    continue;
                }

                // ── Hire date: spread over 11 years ──────────────
                long dayOffset = (long) i * rangeDays / total;
                LocalDate hireDate = startDate.plusDays(dayOffset);

                // ── Contract type: weighted distribution ──────────
                ContractType contract = pickContractForPosition(posTitle, i);
                String effectivePosTitle = positionTitleForContract(posTitle, contract, deptName);

                // ── Phone: alternate TN and FR numbers ────────────
                String phone;
                if (origin == 0 || origin == 1) {
                    phone = "+216 " + (20 + (i % 70)) + " " + String.format("%03d", i % 1000) + " " + String.format("%03d", (i * 7) % 1000);
                } else {
                    phone = "+33 " + (6 + (i % 2)) + " " + String.format("%02d", i % 99) + " " + String.format("%02d", (i * 3) % 99) + " " + String.format("%02d", (i * 7) % 99) + " " + String.format("%02d", (i * 13) % 99);
                }

                // ── Department & Position ─────────────────────────
                Department dept = depts.get(deptName);
                if (dept == null) { skipped++; continue; }

                Position pos = positions.computeIfAbsent(effectivePosTitle, t -> {
                    Position p = new Position();
                    p.setTitle(t);
                    p.setDepartment(dept);
                    return posRepo.save(p);
                });

                // ── Manager ───────────────────────────────────────
                Employee manager = managerByDept.get(deptName);

                // ── Service: pick any service in the department ───
                ServiceUnit service = serviceRepo.findAll().stream()
                    .filter(s -> dept.equals(s.getDepartment()))
                    .findFirst().orElse(null);

                // ── Create employee ───────────────────────────────
                Employee emp = new Employee();
                emp.setFirstName(firstName);
                emp.setLastName(lastName);
                emp.setEmail(email);
                emp.setPhone(phone);
                emp.setHireDate(hireDate);
                emp.setDepartment(dept);
                emp.setPosition(pos);
                emp.setContractType(contract);
                emp.setService(service);
                emp.setManager(manager);
                emp = employeeRepo.save(emp);

                // ── Skill levels based on seniority ───────────────
                int yearsExp = (int) (dayOffset / 365);
                int levelIdx;
                if      (yearsExp >= 8) levelIdx = 0; // EXPERT
                else if (yearsExp >= 5) levelIdx = 1; // AVANCE
                else if (yearsExp >= 3) levelIdx = 2; // AVANCE
                else if (yearsExp >= 2) levelIdx = 3; // INTERMEDIAIRE
                else if (yearsExp >= 1) levelIdx = 4; // INTERMEDIAIRE
                else                    levelIdx = 5; // DEBUTANT

                // Pick 3-5 skills (all 5 if AVANCE+, first 3 if junior)
                int skillCount = (levelIdx <= 2) ? 5 : (levelIdx <= 4) ? 4 : 3;
                for (int si = 0; si < Math.min(skillCount, skills.length); si++) {
                    // Vary level slightly per skill index
                    int adjustedIdx = Math.min(LEVEL_SCALE.length - 1,
                        si == 0 ? levelIdx : (si == 1 ? levelIdx : Math.min(levelIdx + 1, LEVEL_SCALE.length - 1)));
                    SkillLevel level = LEVEL_SCALE[adjustedIdx];
                    EmployeeSkill sk = new EmployeeSkill(emp, skills[si], level);
                    skillRepo.save(sk);
                }

                created++;
            }

            System.out.println("✅ BulkSeeder: " + created + " employés créés, "
                + skipped + " ignorés. Total DB = " + employeeRepo.count());
        };
    }

    // ── Normalize string for email (remove accents, lowercase, keep only a-z0-9) ──
    private static ContractType pickContractForPosition(String positionTitle, int index) {
        String title = normalizeLabel(positionTitle);
        boolean seniorRole =
            title.contains("manager") ||
            title.contains("responsable") ||
            title.contains("directeur") ||
            title.contains("senior") ||
            title.contains("lead") ||
            title.contains("architecte") ||
            title.contains("hrbp") ||
            title.contains("key account") ||
            title.contains("product owner") ||
            title.contains("controleur") ||
            title.contains("auditeur") ||
            title.contains("tresorier");

        int cm = index % 100;
        if (seniorRole) {
            if (cm < 72) return ContractType.CDI;
            if (cm < 90) return ContractType.CDD;
            return ContractType.FREELANCE;
        }

        if      (cm < 62) return ContractType.CDI;
        else if (cm < 80) return ContractType.CDD;
        else if (cm < 90) return ContractType.STAGE;
        else if (cm < 96) return ContractType.ALTERNANCE;
        else              return ContractType.FREELANCE;
    }

    private static String positionTitleForContract(String positionTitle, ContractType contract, String departmentName) {
        if (contract == ContractType.STAGE) return traineeTitle(positionTitle, departmentName);
        if (contract == ContractType.ALTERNANCE) return alternanceTitle(positionTitle, departmentName);
        return positionTitle;
    }

    private static String traineeTitle(String positionTitle, String departmentName) {
        String position = normalizeLabel(positionTitle);
        String department = normalizeLabel(departmentName);
        if (position.contains("developpeur") || department.contains("informatique")) return "Developpeur Stagiaire";
        if (position.contains("data") || position.contains("bi") || position.contains("ml") || department.contains("data")) return "Stagiaire Data Analyst";
        if (department.contains("ressources humaines") || position.contains("rh") || position.contains("formation") || position.contains("paie")) return "Assistant RH Stagiaire";
        if (department.contains("marketing") || position.contains("communication") || position.contains("content")) return "Assistant Marketing Stagiaire";
        if (department.contains("finance") || position.contains("comptable") || position.contains("audit")) return "Assistant Finance Stagiaire";
        if (department.contains("commercial") || position.contains("account")) return "Assistant Commercial Stagiaire";
        if (department.contains("operation") || position.contains("logistique") || position.contains("achats")) return "Assistant Operations Stagiaire";
        return "Stagiaire Polyvalent";
    }

    private static String alternanceTitle(String positionTitle, String departmentName) {
        String position = normalizeLabel(positionTitle);
        String department = normalizeLabel(departmentName);
        if (position.contains("developpeur") || department.contains("informatique")) return "Developpeur Alternant";
        if (position.contains("data") || position.contains("bi") || position.contains("ml") || department.contains("data")) return "Data Analyst Alternant";
        if (department.contains("ressources humaines") || position.contains("rh") || position.contains("formation") || position.contains("paie")) return "Assistant RH Alternant";
        if (department.contains("marketing") || position.contains("communication") || position.contains("content")) return "Assistant Marketing Alternant";
        if (department.contains("finance") || position.contains("comptable") || position.contains("audit")) return "Assistant Finance Alternant";
        if (department.contains("commercial") || position.contains("account")) return "Assistant Commercial Alternant";
        if (department.contains("operation") || position.contains("logistique") || position.contains("achats")) return "Assistant Operations Alternant";
        return "Alternant Polyvalent";
    }

    private static String normalizeLabel(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
            .toLowerCase(Locale.ROOT);
    }

    private static String toSlug(String s) {
        if (s == null) return "unknown";
        String normalized = Normalizer.normalize(s, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase()
            .replaceAll("[^a-z0-9]", "");
    }
}
