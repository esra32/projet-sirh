package org.example.recruitment.config;

import org.example.recruitment.model.*;
import org.example.recruitment.repo.ApplicationRepository;
import org.example.recruitment.repo.JobOfferRepository;
import org.example.recruitment.repo.SkillRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initRecruitmentData(SkillRepository skillRepository,
                                          JobOfferRepository jobOfferRepository,
                                          ApplicationRepository applicationRepository) {
        return args -> {
            // ────── Skills ──────
            if (skillRepository.count() == 0) {
                List<String> skillNames = List.of(
                    "Java", "Spring Boot", "Angular", "TypeScript", "MongoDB",
                    "Docker", "Kubernetes", "Gestion de projet", "Recrutement",
                    "Python", "React", "SQL", "Figma", "Git", "CI/CD",
                    "Communication", "Power BI", "Machine Learning", "UX Design", "Scrum"
                );
                List<Skill> skills = skillNames.stream().map(Skill::new).collect(Collectors.toList());
                skillRepository.saveAll(skills);
                System.out.println("✅ 20 compétences initialisées.");
            }

            // ────── Job Offers ──────
            if (jobOfferRepository.count() == 0) {
                Skill java = skillRepository.findByName("Java").orElse(null);
                Skill angular = skillRepository.findByName("Angular").orElse(null);
                Skill spring = skillRepository.findByName("Spring Boot").orElse(null);
                Skill docker = skillRepository.findByName("Docker").orElse(null);
                Skill k8s = skillRepository.findByName("Kubernetes").orElse(null);
                Skill recruiting = skillRepository.findByName("Recrutement").orElse(null);
                Skill python = skillRepository.findByName("Python").orElse(null);
                Skill ml = skillRepository.findByName("Machine Learning").orElse(null);
                Skill figma = skillRepository.findByName("Figma").orElse(null);
                Skill ux = skillRepository.findByName("UX Design").orElse(null);
                Skill git = skillRepository.findByName("Git").orElse(null);
                Skill cicd = skillRepository.findByName("CI/CD").orElse(null);
                Skill scrum = skillRepository.findByName("Scrum").orElse(null);

                // 1. Fullstack Dev
                JobOffer dev = new JobOffer();
                dev.setTitle("Développeur Fullstack Java/Angular");
                dev.setDescription("Nous recherchons un développeur passionné pour rejoindre notre équipe IT. " +
                        "Vous travaillerez sur des projets innovants utilisant Java 17, Spring Boot et Angular 17.");
                dev.setDepartment("IT");
                dev.setLocation("Tunis - Hybride");
                dev.setStatus(OfferStatus.PUBLISHED);
                dev.setPublishedDate(LocalDate.now().minusDays(10));
                dev.setDeadlineDate(LocalDate.now().plusMonths(2));
                if (java != null) dev.getRequiredSkills().add(java);
                if (angular != null) dev.getRequiredSkills().add(angular);
                if (spring != null) dev.getRequiredSkills().add(spring);
                if (git != null) dev.getRequiredSkills().add(git);
                jobOfferRepository.save(dev);

                // 2. HR Recruiter
                JobOffer hr = new JobOffer();
                hr.setTitle("Chargé de Recrutement Senior");
                hr.setDescription("Au sein du département RH, vous serez en charge du cycle complet de recrutement " +
                        "pour nos profils techniques et fonctionnels.");
                hr.setDepartment("RH");
                hr.setLocation("Sousse");
                hr.setStatus(OfferStatus.PUBLISHED);
                hr.setPublishedDate(LocalDate.now().minusDays(5));
                hr.setDeadlineDate(LocalDate.now().plusMonths(1));
                if (recruiting != null) hr.getRequiredSkills().add(recruiting);
                if (scrum != null) hr.getRequiredSkills().add(scrum);
                jobOfferRepository.save(hr);

                // 3. DevOps Engineer
                JobOffer devops = new JobOffer();
                devops.setTitle("Ingénieur DevOps");
                devops.setDescription("Responsable de l'automatisation de nos pipelines CI/CD et de la maintenance de nos clusters K8s.");
                devops.setDepartment("Infrastructure");
                devops.setLocation("Tunis / Remote");
                devops.setStatus(OfferStatus.PUBLISHED);
                devops.setPublishedDate(LocalDate.now().minusDays(3));
                devops.setDeadlineDate(LocalDate.now().plusMonths(3));
                if (docker != null) devops.getRequiredSkills().add(docker);
                if (k8s != null) devops.getRequiredSkills().add(k8s);
                if (cicd != null) devops.getRequiredSkills().add(cicd);
                jobOfferRepository.save(devops);

                // 4. Data Scientist
                JobOffer dataScience = new JobOffer();
                dataScience.setTitle("Data Scientist Junior");
                dataScience.setDescription("Rejoignez notre équipe Data pour exploiter le potentiel des données d'entreprise. " +
                        "Vous développerez des modèles prédictifs pour le SIRH.");
                dataScience.setDepartment("Data & Analytics");
                dataScience.setLocation("Sfax - Hybride");
                dataScience.setStatus(OfferStatus.PUBLISHED);
                dataScience.setPublishedDate(LocalDate.now().minusDays(7));
                dataScience.setDeadlineDate(LocalDate.now().plusMonths(2));
                if (python != null) dataScience.getRequiredSkills().add(python);
                if (ml != null) dataScience.getRequiredSkills().add(ml);
                jobOfferRepository.save(dataScience);

                // 5. UX Designer
                JobOffer uxJob = new JobOffer();
                uxJob.setTitle("UX/UI Designer Senior");
                uxJob.setDescription("Concevoir des interfaces utilisateur modernes et intuitives pour nos applications SIRH. " +
                        "Expérience Figma et Design System requise.");
                uxJob.setDepartment("Marketing & Communication");
                uxJob.setLocation("Monastir");
                uxJob.setStatus(OfferStatus.PUBLISHED);
                uxJob.setPublishedDate(LocalDate.now().minusDays(2));
                uxJob.setDeadlineDate(LocalDate.now().plusMonths(1));
                if (figma != null) uxJob.getRequiredSkills().add(figma);
                if (ux != null) uxJob.getRequiredSkills().add(ux);
                jobOfferRepository.save(uxJob);

                System.out.println("✅ 5 offres d'emploi initialisées.");

                // ────── Sample Applications ──────
                // Eric (dev) applies to DevOps
                Application app1 = new Application();
                app1.setJobOffer(devops);
                app1.setApplicantEmail("employee@sirh.com");
                app1.setApplicantName("Ayoub Mansouri");
                app1.setCoverLetter("Passionné par l'infrastructure as code, je souhaite évoluer vers un rôle DevOps. " +
                        "Mon expérience de 2 ans en développement backend à Tunis me permettra d'apporter une vision unique.");
                app1.setStatus(ApplicationStatus.REVIEWING);
                app1.setAppliedDate(LocalDate.now().minusDays(2));
                if (docker != null && git != null) app1.setSkills(Set.of(docker, git));
                applicationRepository.save(app1);

                // Karim applies to UX Designer
                Application app2 = new Application();
                app2.setJobOffer(uxJob);
                app2.setApplicantEmail("karim.design@sirh.com");
                app2.setApplicantName("Karim Hamdi");
                app2.setCoverLetter("En tant que UI/UX Designer depuis 3 ans basé à Sfax, je maîtrise Figma et les méthodologies centrées utilisateur. " +
                        "Je souhaite contribuer à la refonte de vos interfaces.");
                app2.setStatus(ApplicationStatus.INTERVIEW_SCHEDULED);
                app2.setAppliedDate(LocalDate.now().minusDays(5));
                if (figma != null && ux != null) app2.setSkills(Set.of(figma, ux));
                applicationRepository.save(app2);

                // Léa applies to Data Scientist
                Application app3 = new Application();
                app3.setJobOffer(dataScience);
                app3.setApplicantEmail("lea.data@sirh.com");
                app3.setApplicantName("Lina Chaabane");
                app3.setCoverLetter("Ayant une solide expérience en analyse de données et en Python acquise à Tunis, je suis très motivée " +
                        "pour approfondir mes compétences en Machine Learning au sein de votre équipe.");
                app3.setStatus(ApplicationStatus.PENDING);
                app3.setAppliedDate(LocalDate.now().minusDays(1));
                if (python != null && ml != null) app3.setSkills(Set.of(python, ml));
                applicationRepository.save(app3);

                // Youssef applies to Fullstack Dev
                Application app4 = new Application();
                app4.setJobOffer(dev);
                app4.setApplicantEmail("youssef.dev@sirh.com");
                app4.setApplicantName("Youssef Ben Ali");
                app4.setCoverLetter("Développeur junior passionné par Java et Angular, je cherche à grandir dans un environnement stimulant à Tunis. " +
                        "Mon stage actuel à Arab Soft m'a permis de contribuer à des projets Spring Boot.");
                app4.setStatus(ApplicationStatus.PENDING);
                app4.setAppliedDate(LocalDate.now());
                if (java != null && angular != null) app4.setSkills(Set.of(java, angular));
                applicationRepository.save(app4);

                // Clara applies to HR Recruiter
                Application app5 = new Application();
                app5.setJobOffer(hr);
                app5.setApplicantEmail("clara.mkt@sirh.com");
                app5.setApplicantName("Cyrine Bouzid");
                app5.setCoverLetter("Forte de mon expérience en communication et gestion de projet à Tunis, je souhaite " +
                        "me réorienter vers le recrutement pour valoriser le capital humain de l'entreprise.");
                app5.setStatus(ApplicationStatus.ACCEPTED);
                app5.setAppliedDate(LocalDate.now().minusDays(15));
                if (recruiting != null) app5.setSkills(Set.of(recruiting));
                applicationRepository.save(app5);

                System.out.println("✅ 5 candidatures de test initialisées (PENDING, REVIEWING, INTERVIEW, ACCEPTED).");
            }
        };
    }

    @Bean
    @org.springframework.core.annotation.Order(2)
    CommandLineRunner enrichRecruitmentData(SkillRepository skillRepository,
                                             JobOfferRepository jobOfferRepository) {
        return args -> {
            if (jobOfferRepository.count() >= 10) return; // already enriched

            // ── Additional skills ──────────────────────────────────────────
            String[] extraSkills = {
                "Azure", "AWS", "Terraform", "Node.js", "Vue.js", "React",
                "PostgreSQL", "Redis", "GraphQL", "Microservices", "Linux", "OWASP",
                "Power BI", "Tableau", "SQL", "ETL", "Spark", "Databricks",
                "Négociation", "Salesforce", "SEO", "Google Ads", "HubSpot",
                "Supply Chain", "SAP", "Lean Management", "ISO 9001",
                "Comptabilité", "IFRS", "Contrôle de gestion",
                "TypeScript", "Angular", "Spring Boot", "Docker", "Kubernetes",
                "Figma", "Adobe Suite", "Agile", "DevOps", "Cybersécurité",
                "Machine Learning", "TensorFlow", "Data Science"
            };
            for (String sn : extraSkills) {
                if (skillRepository.findByName(sn).isEmpty()) {
                    skillRepository.save(new Skill(sn));
                }
            }

            Function<String, Skill> sk = name ->
                skillRepository.findByName(name).orElse(null);

            // ── Job Offers ─────────────────────────────────────────────────

            // 6. Backend Senior
            JobOffer backend = new JobOffer();
            backend.setTitle("Développeur Backend Java Senior");
            backend.setDepartment("Informatique");
            backend.setLocation("Tunis - Hybride");
            backend.setStatus(OfferStatus.PUBLISHED);
            backend.setPublishedDate(LocalDate.now().minusDays(8));
            backend.setDeadlineDate(LocalDate.now().plusMonths(2));
            backend.setDescription("Nous recherchons un développeur Java senior pour concevoir et maintenir nos APIs REST en microservices. Bonne maîtrise de Spring Boot, Docker et PostgreSQL requise.");
            backend.setCreatedByEmail("manager@mgr.sirh.com");
            backend.setCreatedByName("Mehdi Trabelsi");
            addIfNotNull(backend, sk.apply("Spring Boot"), sk.apply("Docker"), sk.apply("Microservices"), sk.apply("PostgreSQL"));
            jobOfferRepository.save(backend);

            // 7. Frontend Angular
            JobOffer frontend = new JobOffer();
            frontend.setTitle("Développeur Frontend Angular Expert");
            frontend.setDepartment("Informatique");
            frontend.setLocation("Sfax");
            frontend.setStatus(OfferStatus.PUBLISHED);
            frontend.setPublishedDate(LocalDate.now().minusDays(4));
            frontend.setDeadlineDate(LocalDate.now().plusMonths(1));
            frontend.setDescription("Développeur Angular 17 expérimenté pour intégrer notre équipe frontend. Maîtrise TypeScript, Angular Material et RxJS indispensable.");
            frontend.setCreatedByEmail("manager@mgr.sirh.com");
            frontend.setCreatedByName("Mehdi Trabelsi");
            addIfNotNull(frontend, sk.apply("Angular"), sk.apply("TypeScript"), sk.apply("React"));
            jobOfferRepository.save(frontend);

            // 8. DevOps Cloud
            JobOffer cloud = new JobOffer();
            cloud.setTitle("Ingénieur Cloud & DevOps Azure");
            cloud.setDepartment("Informatique");
            cloud.setLocation("Remote");
            cloud.setStatus(OfferStatus.PUBLISHED);
            cloud.setPublishedDate(LocalDate.now().minusDays(6));
            cloud.setDeadlineDate(LocalDate.now().plusMonths(3));
            cloud.setDescription("Rejoignez notre équipe infrastructure pour gérer et optimiser notre plateforme Azure. Expertise Terraform, CI/CD et Kubernetes exigée.");
            cloud.setCreatedByEmail("manager@mgr.sirh.com");
            cloud.setCreatedByName("Mehdi Trabelsi");
            addIfNotNull(cloud, sk.apply("Azure"), sk.apply("Terraform"), sk.apply("Kubernetes"), sk.apply("DevOps"));
            jobOfferRepository.save(cloud);

            // 9. Data Engineer
            JobOffer dataEng = new JobOffer();
            dataEng.setTitle("Data Engineer — Pipeline Big Data");
            dataEng.setDepartment("Data & Analytics");
            dataEng.setLocation("Tunis");
            dataEng.setStatus(OfferStatus.PUBLISHED);
            dataEng.setPublishedDate(LocalDate.now().minusDays(9));
            dataEng.setDeadlineDate(LocalDate.now().plusMonths(2));
            dataEng.setDescription("Conception et maintenance de pipelines de données pour notre plateforme analytique. Maîtrise de Spark, ETL et SQL avancé requise.");
            dataEng.setCreatedByEmail("nadia.mgr@sirh.com");
            dataEng.setCreatedByName("Nadia Gharbi");
            addIfNotNull(dataEng, sk.apply("Spark"), sk.apply("ETL"), sk.apply("SQL"), sk.apply("Python"));
            jobOfferRepository.save(dataEng);

            // 10. Responsable Marketing Digital
            JobOffer marketing = new JobOffer();
            marketing.setTitle("Responsable Marketing Digital & SEO");
            marketing.setDepartment("Marketing & Communication");
            marketing.setLocation("Tunis");
            marketing.setStatus(OfferStatus.PUBLISHED);
            marketing.setPublishedDate(LocalDate.now().minusDays(3));
            marketing.setDeadlineDate(LocalDate.now().plusMonths(2));
            marketing.setDescription("Pilotez la stratégie digitale : SEO, Google Ads, analytics et content marketing. Expérience HubSpot ou Salesforce appréciée.");
            marketing.setCreatedByEmail("admin@hr.sirh.com");
            marketing.setCreatedByName("Salma Ben Romdhane");
            addIfNotNull(marketing, sk.apply("SEO"), sk.apply("Google Ads"), sk.apply("HubSpot"));
            jobOfferRepository.save(marketing);

            // 11. Key Account Manager
            JobOffer kam = new JobOffer();
            kam.setTitle("Key Account Manager B2B");
            kam.setDepartment("Commercial & Ventes");
            kam.setLocation("Tunis - Terrain");
            kam.setStatus(OfferStatus.PUBLISHED);
            kam.setPublishedDate(LocalDate.now().minusDays(5));
            kam.setDeadlineDate(LocalDate.now().plusMonths(2));
            kam.setDescription("Gestion et développement d'un portefeuille de clients grands comptes. Excellentes compétences en négociation et maîtrise de Salesforce.");
            kam.setCreatedByEmail("admin@hr.sirh.com");
            kam.setCreatedByName("Salma Ben Romdhane");
            addIfNotNull(kam, sk.apply("Négociation"), sk.apply("Salesforce"));
            jobOfferRepository.save(kam);

            // 12. Cybersécurité
            JobOffer cyber = new JobOffer();
            cyber.setTitle("Ingénieur Cybersécurité OWASP");
            cyber.setDepartment("Informatique");
            cyber.setLocation("Tunis");
            cyber.setStatus(OfferStatus.PUBLISHED);
            cyber.setPublishedDate(LocalDate.now().minusDays(7));
            cyber.setDeadlineDate(LocalDate.now().plusMonths(3));
            cyber.setDescription("Protéger nos systèmes d'information et assurer la conformité sécurité. Expertise OWASP, pentest et Linux requise.");
            cyber.setCreatedByEmail("manager@mgr.sirh.com");
            cyber.setCreatedByName("Mehdi Trabelsi");
            addIfNotNull(cyber, sk.apply("Cybersécurité"), sk.apply("OWASP"), sk.apply("Linux"));
            jobOfferRepository.save(cyber);

            // 13. ML Engineer
            JobOffer mlJob = new JobOffer();
            mlJob.setTitle("Machine Learning Engineer — NLP");
            mlJob.setDepartment("Data & Analytics");
            mlJob.setLocation("Remote");
            mlJob.setStatus(OfferStatus.PUBLISHED);
            mlJob.setPublishedDate(LocalDate.now().minusDays(2));
            mlJob.setDeadlineDate(LocalDate.now().plusMonths(2));
            mlJob.setDescription("Développement de modèles de traitement du langage naturel pour notre SIRH IA. Expertise TensorFlow, Python et Data Science requise.");
            mlJob.setCreatedByEmail("nadia.mgr@sirh.com");
            mlJob.setCreatedByName("Nadia Gharbi");
            addIfNotNull(mlJob, sk.apply("Machine Learning"), sk.apply("TensorFlow"), sk.apply("Data Science"), sk.apply("Python"));
            jobOfferRepository.save(mlJob);

            System.out.println("✅ 8 offres supplémentaires créées (Informatique, Data, Marketing, Commercial, Sécurité).");
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // ORDER 3 — Réinitialisation COMPLÈTE via SQL direct (JdbcTemplate).
    //   Pourquoi JdbcTemplate et non JPA save() ?
    //   → save() sur entité détachée ne vide pas réellement job_offer_skills
    //     à cause du suivi Hibernate sur les collections ManyToMany.
    //   → JdbcTemplate exécute DELETE/INSERT directement sans cache JPA.
    // ══════════════════════════════════════════════════════════════════════
    @Bean
    @Order(3)
    CommandLineRunner ensureSkillLinks(SkillRepository skillRepository,
                                       JobOfferRepository jobOfferRepository,
                                       JdbcTemplate jdbc) {
        return args -> {
            try {
                // ── 1. S'assurer que toutes les compétences nécessaires existent ─
                String[] needed = {
                    "Java", "Spring Boot", "Docker", "Git", "SQL",
                    "Angular", "TypeScript", "React", "Figma",
                    "Python", "Machine Learning", "Power BI",
                    "Kubernetes", "CI/CD", "Azure", "Terraform", "DevOps",
                    "Recrutement", "Communication", "Scrum", "Gestion de projet",
                    "UX Design", "Négociation", "Salesforce",
                    "Cybersécurité", "OWASP", "Linux",
                    "TensorFlow", "Data Science",
                    "SEO", "Google Ads", "HubSpot",
                    "Spark", "ETL", "Microservices", "PostgreSQL",
                    "MongoDB", "Kafka", "dbt", "Airflow", "Hadoop", "Databricks"
                };
                int skillsAdded = 0;
                for (String name : needed) {
                    if (skillRepository.findByName(name).isEmpty()) {
                        skillRepository.save(new Skill(name));
                        skillsAdded++;
                    }
                }
                System.out.println("[Order3] " + skillsAdded + " compétence(s) ajoutée(s).");

                // ── 2. Map nom → id (String UUID) pour les INSERT SQL ───────────
                Map<String, String> skillIdMap = skillRepository.findAll().stream()
                    .collect(Collectors.toMap(Skill::getName, Skill::getId, (a, b) -> a));

                // ── 3. VIDER toute la table job_offer_skills via SQL direct ──────
                int deleted = jdbc.update("DELETE FROM job_offer_skills");
                System.out.println("[Order3] " + deleted + " liaisons supprimées (DELETE FROM job_offer_skills).");

                // ── 4. Récupérer toutes les offres (id + title) ──────────────────
                List<JobOffer> allOffers = jobOfferRepository.findAll();

                // ── 5. RÉASSIGNER via INSERT IGNORE pour chaque offre ────────────
                int totalLinks = 0;
                int totalOffers = 0;
                for (JobOffer offer : allOffers) {
                    if (offer.getTitle() == null || offer.getId() == null) continue;
                    String tl = offer.getTitle().toLowerCase();
                    String[] skillNames = skillsForTitle(tl, skillIdMap);

                    List<String> linked = new ArrayList<>();
                    for (String name : skillNames) {
                        String skillId = skillIdMap.get(name);
                        if (skillId != null) {
                            jdbc.update(
                                "INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id) VALUES (?, ?)",
                                offer.getId(), skillId
                            );
                            linked.add(name);
                            totalLinks++;
                        }
                    }
                    totalOffers++;
                    System.out.println("✅ [" + offer.getTitle() + "] → " +
                        (linked.isEmpty() ? "(fallback vide)" : String.join(", ", linked)));
                }

                System.out.println("══════════════════════════════════════════════════");
                System.out.println("✅ " + totalOffers + " offres traitées, "
                    + totalLinks + " liens créés dans job_offer_skills.");

            } catch (Exception e) {
                System.err.println("❌ ensureSkillLinks ERREUR: " + e.getMessage());
                e.printStackTrace();
            }
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // ORDER 4 — Candidatures EXTERNES de démo (source = EXTERNAL).
    //   Alimentent l'onglet "Recrutement Externe" et le pipeline du dashboard.
    //   Seedé une seule fois : ne refait rien si des externes existent déjà.
    // ══════════════════════════════════════════════════════════════════════
    @Bean
    @Order(4)
    CommandLineRunner seedExternalApplications(SkillRepository skillRepository,
                                               JobOfferRepository jobOfferRepository,
                                               ApplicationRepository applicationRepository) {
        return args -> {
            List<JobOffer> offers = jobOfferRepository.findAll();
            if (offers.isEmpty()) return;

            // Garde par EMAIL (et non globale) : ajoute les externes manquants
            // sans dupliquer, et SANS être bloqué par un candidat réel déjà présent.
            Set<String> existingEmails = applicationRepository.findBySource(ApplicationSource.EXTERNAL).stream()
                .map(Application::getApplicantEmail)
                .filter(java.util.Objects::nonNull)
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

            Function<String, JobOffer> offerBy = kw -> offers.stream()
                .filter(o -> o.getTitle() != null && o.getTitle().toLowerCase().contains(kw))
                .findFirst().orElse(offers.get(0));
            Function<String, Skill> sk = name -> skillRepository.findByName(name).orElse(null);

            int before = existingEmails.size();

            // Candidats externes répartis sur DIFFÉRENTES offres, statuts variés.
            saveExternal(applicationRepository, existingEmails, offerBy.apply("fullstack"),
                "Sami Gharbi", "sami.gharbi@gmail.com",
                "Developpeur fullstack avec 4 ans d'experience en Java, Spring Boot et Angular. " +
                "J'ai decouvert votre offre sur LinkedIn et je suis tres motive.",
                ApplicationStatus.PENDING, 1,
                sk.apply("Java"), sk.apply("Angular"), sk.apply("Spring Boot"), sk.apply("Git"));

            saveExternal(applicationRepository, existingEmails, offerBy.apply("data scientist"),
                "Nour El Houda Belkhiria", "nour.belkhiria@outlook.com",
                "Diplomee en data science avec 3 ans d'experience en Python et Machine Learning, " +
                "je postule en externe pour contribuer a vos modeles predictifs RH.",
                ApplicationStatus.REVIEWING, 4,
                sk.apply("Python"), sk.apply("Machine Learning"), sk.apply("SQL"));

            saveExternal(applicationRepository, existingEmails, offerBy.apply("devops"),
                "Hatem Jaziri", "hatem.jaziri@gmail.com",
                "Ingenieur DevOps avec 6 ans d'experience en Docker, Kubernetes et CI/CD. " +
                "Candidature externe suite a votre annonce, disponible immediatement.",
                ApplicationStatus.INTERVIEW_SCHEDULED, 7,
                sk.apply("Docker"), sk.apply("Kubernetes"), sk.apply("CI/CD"), sk.apply("Linux"));

            saveExternal(applicationRepository, existingEmails, offerBy.apply("frontend"),
                "Yassine Ben Ali", "yassine.benali@gmail.com",
                "Developpeur frontend Angular avec 5 ans d'experience, expert TypeScript et RxJS. " +
                "Je souhaite mettre mon expertise UI au service de votre equipe produit.",
                ApplicationStatus.PENDING, 2,
                sk.apply("Angular"), sk.apply("TypeScript"), sk.apply("Git"), sk.apply("React"));

            saveExternal(applicationRepository, existingEmails, offerBy.apply("marketing"),
                "Mariem Trabelsi", "mariem.trabelsi@yahoo.fr",
                "Specialiste marketing digital avec 4 ans d'experience en SEO et Google Ads. " +
                "Passionnee par l'acquisition et le content marketing, je postule en externe.",
                ApplicationStatus.REVIEWING, 5,
                sk.apply("SEO"), sk.apply("Google Ads"), sk.apply("HubSpot"), sk.apply("Communication"));

            saveExternal(applicationRepository, existingEmails, offerBy.apply("ux"),
                "Ines Karoui", "ines.karoui@gmail.com",
                "UX/UI Designer avec 7 ans d'experience, portfolio oriente design system et accessibilite. " +
                "Tres motivee a rejoindre votre equipe apres notre echange.",
                ApplicationStatus.ACCEPTED, 12,
                sk.apply("Figma"), sk.apply("UX Design"), sk.apply("Communication"), sk.apply("Scrum"));

            int added = existingEmails.size() - before;
            System.out.println("✅ Candidatures EXTERNES : " + added + " ajoutee(s), "
                + existingEmails.size() + " au total (garde par email).");
        };
    }

    /** Crée et sauve une candidature externe seulement si l'email n'existe pas déjà. */
    private void saveExternal(ApplicationRepository repo, Set<String> existingEmails, JobOffer offer,
                              String name, String email, String letter,
                              ApplicationStatus status, int daysAgo, Skill... skills) {
        if (offer == null || email == null || existingEmails.contains(email.toLowerCase())) return;
        Application a = new Application();
        a.setJobOffer(offer);
        a.setApplicantName(name);
        a.setApplicantEmail(email);
        a.setCoverLetter(letter);
        a.setStatus(status);
        a.setAppliedDate(LocalDate.now().minusDays(daysAgo));
        a.setSource(ApplicationSource.EXTERNAL);
        addSkillsIfNotNull(a, skills);
        repo.save(a);
        existingEmails.add(email.toLowerCase());
    }

    /** Affecte les compétences non nulles à une candidature. */
    private void addSkillsIfNotNull(Application app, Skill... skills) {
        Set<Skill> set = java.util.Arrays.stream(skills)
            .filter(java.util.Objects::nonNull)
            .collect(Collectors.toSet());
        if (!set.isEmpty()) app.setSkills(set);
    }

    /**
     * Retourne les noms de compétences selon le titre (en minuscules).
     * Règles strictes — aucune compétence aléatoire.
     * skillIdMap sert à filtrer les compétences non présentes en base.
     */
    private String[] skillsForTitle(String tl, Map<String, String> skillIdMap) {
        // BI / Consultant BI / Data Analyst
        if (tl.contains("business intelligence") || tl.contains("consultant bi")
                || (tl.contains("data") && tl.contains("analyst")))
            return keep(skillIdMap, "Power BI", "SQL", "Python", "dbt", "Spark", "Communication");

        // Data Engineer / Data Scientist
        if (tl.contains("data engineer") || tl.contains("data scientist"))
            return keep(skillIdMap, "Python", "SQL", "Airflow", "dbt", "Spark", "Docker", "Kafka");

        // Manager Data / Architecte (solution, logiciel, cloud)
        if ((tl.contains("manager") && tl.contains("data"))
                || tl.contains("architecte") || tl.contains("architect"))
            return keep(skillIdMap, "Python", "SQL", "Power BI", "Docker", "Gestion de projet");

        // Développeur Backend / Senior Java / Junior Java / Développeur Senior Java
        if (tl.contains("backend") || tl.contains("senior java")
                || tl.contains("junior java") || tl.contains("développeur senior"))
            return keep(skillIdMap, "Java", "Spring Boot", "Docker", "Git", "SQL");

        // Fullstack (avant Frontend pour éviter conflit sur "angular")
        if (tl.contains("fullstack"))
            return keep(skillIdMap, "Java", "Angular", "Spring Boot", "TypeScript", "Docker", "Git", "Microservices");

        // Développeur Frontend / Angular
        if (tl.contains("frontend") || tl.contains("angular"))
            return keep(skillIdMap, "Angular", "TypeScript", "React", "Git", "Figma");

        // DevOps / Cloud Engineer / Ingénieur DevOps
        if (tl.contains("devops") || tl.contains("cloud"))
            return keep(skillIdMap, "Docker", "Kubernetes", "CI/CD", "Git", "Linux", "Terraform");

        // Ingénieur ML / Machine Learning Engineer
        if (tl.contains("ingénieur ml") || tl.contains("machine learning engineer")
                || (tl.contains("ingénieur") && tl.contains(" ml")))
            return keep(skillIdMap, "Python", "Machine Learning", "TensorFlow", "Data Science", "SQL", "Docker");

        // Cybersécurité / OWASP
        if (tl.contains("cybersécurité") || tl.contains("cybersecurite")
                || tl.contains("sécurité") || tl.contains("owasp"))
            return keep(skillIdMap, "CybersÃ©curitÃ©", "OWASP", "Linux", "Docker", "CI/CD", "Git", "Kubernetes");

        // Mobile
        if (tl.contains("mobile"))
            return keep(skillIdMap, "TypeScript", "Java", "Git", "React");

        // QA / Test / Qualité IT
        if (tl.contains(" qa") || tl.contains("qualité it") || tl.contains("test"))
            return keep(skillIdMap, "Git", "CI/CD", "Docker", "Scrum");

        // Marketing / SEO / Community Manager / Responsable Marketing
        if (tl.contains("marketing") || tl.contains("community manager")
                || tl.contains("community") || tl.contains("seo"))
            return keep(skillIdMap, "Communication", "Scrum", "Git", "React");

        // RH / Recrutement / HRBP / Formation / Paie / Talent
        if (tl.contains(" rh") || tl.startsWith("rh") || tl.contains("recrutement")
                || tl.contains("hrbp") || tl.contains("ressources humaines")
                || tl.contains("talent") || tl.contains("formation") || tl.contains("paie"))
            return keep(skillIdMap, "Recrutement", "Communication", "Power BI", "SQL", "Gestion de projet", "Scrum");

        // Product Owner / Scrum Master / Chef de projet / Agile
        if (tl.contains("product owner") || tl.contains("scrum master")
                || tl.contains("chef de projet") || tl.contains("agile"))
            return keep(skillIdMap, "Scrum", "Gestion de projet", "Communication", "Git");

        // Analyste Financier / Business Analyst / Finance / Comptable / Audit / Trésorerie
        if (tl.contains("financier") || tl.contains("business analyst")
                || tl.contains("finance") || tl.contains("comptabl")
                || tl.contains("audit") || tl.contains("trésor")
                || tl.contains("contrôle de gestion"))
            return keep(skillIdMap, "SQL", "Power BI", "Python", "Communication");

        // Commercial / KAM / Account Manager / Ventes / Prospection
        if (tl.contains("commercial") || tl.contains("account manager")
                || tl.contains("vente") || tl.contains("négociation")
                || tl.contains("key account") || tl.contains("prospection"))
            return keep(skillIdMap, "Négociation", "Salesforce", "Communication", "Scrum");

        // Supply Chain / Logistique / Qualité ISO / Achats / Opérations
        if (tl.contains("supply chain") || tl.contains("logistique")
                || tl.contains("qualité") || tl.contains("achats")
                || tl.contains("opérations"))
            return keep(skillIdMap, "Gestion de projet", "Communication", "Scrum", "SQL");

        // UX / UI / Design / Graphiste
        if (tl.contains("ux") || tl.contains("ui ") || tl.contains("design")
                || tl.contains("graphiste") || tl.contains("figma"))
            return keep(skillIdMap, "Figma", "UX Design", "Communication", "Scrum");

        // Fallback universel
        return keep(skillIdMap, "Communication", "Scrum", "Git");
    }

    /** Filtre les noms pour ne garder que ceux présents dans skillIdMap. */
    private String[] keep(Map<String, String> skillIdMap, String... names) {
        return java.util.Arrays.stream(names)
            .filter(skillIdMap::containsKey)
            .toArray(String[]::new);
    }

    private void addIfNotNull(JobOffer offer, Skill... skills) {
        for (Skill s : skills) {
            if (s != null) offer.getRequiredSkills().add(s);
        }
    }
}
