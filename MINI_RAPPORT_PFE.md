# MINI RAPPORT — Projet SIRH
## Système d'Information des Ressources Humaines
### Projet de Fin d'Études — 2026

---

## 1. PRÉSENTATION DU PROJET

Le **SIRH** est une plateforme complète de gestion des ressources humaines développée en architecture microservices. Elle couvre trois grands domaines : la gestion RH, le recrutement intelligent, et l'analyse décisionnelle par Machine Learning.

**Objectif :** Offrir aux équipes RH un outil centralisé pour gérer les employés, automatiser le recrutement grâce à l'IA, et prendre des décisions basées sur les données.

---

## 2. ARCHITECTURE GÉNÉRALE

```
Angular 17 (Frontend)
        ↓
API Gateway :8080  (Spring Cloud)
        ↓
┌──────────────┬──────────────┬──────────────────┐
│ Auth :8081   │ Employee     │ Recruitment      │
│ Spring Boot  │ :8082        │ :8083            │
└──────────────┴──────────────┴──────────────────┘
        ↓
    MySQL 8.0
        ↓
Airflow → dbt → sirh_dwh → Superset + ML
```

---

## 3. BACKEND — 4 MICROSERVICES SPRING BOOT

### API Gateway (Port 8080)
Point d'entrée unique. Valide les tokens JWT (HS256), injecte les headers `X-Auth-User` et `X-Auth-Roles`, route les requêtes vers les services appropriés.

### Auth Service (Port 8081)
Gère l'inscription, la connexion et les rôles utilisateurs. Génère des tokens JWT signés. Intègre optionnellement **Keycloak** pour le SSO entreprise.

**Rôles :** `HR_ADMIN` / `MANAGER` / `EMPLOYEE`

### Employee Service (Port 8082)
CRUD complet des employés, départements, postes et organigramme hiérarchique. Supporte **1000+ employés** de test avec génération automatique de données réalistes.

### Recruitment Service (Port 8083)
Le module le plus avancé :
- Gestion des offres d'emploi (DRAFT → PUBLISHED → CLOSED)
- Candidatures avec upload de CV
- **Extraction IA des compétences** via Google Gemini 1.5 Flash
- **Score de matching** candidat-offre (0-100 pts)
- **Chatbot RH** par mots-clés
- **Intelligence marché** via Adzuna API
- Notifications email automatiques

---

## 4. FRONTEND — ANGULAR 17

Trois interfaces adaptées selon le rôle :

| Rôle | Interface | Fonctionnalités |
|---|---|---|
| **EMPLOYEE** | Vue personnelle | Profil, annuaire, candidatures, entretiens |
| **MANAGER** | Vue équipe | Offres, candidats, rapports d'équipe |
| **HR_ADMIN** | Vue globale | Tout + organigramme, matching, BI, permissions |

**Sécurité frontend :**
- JWT Interceptor : ajoute automatiquement le token à chaque requête
- Route Guards : protège les pages selon le rôle
- Redirect automatique selon profil après login

**Visualisation :** Chart.js pour les KPIs (barres, camemberts, courbes de tendance).

---

## 5. DATA WAREHOUSE — dbt + Airflow

### Pipeline Airflow (quotidien à 02h00)
```
Extraction → Staging → dbt → Tests qualité → ML
```

### Modélisation dbt (18 modèles)

| Couche | Tables | Rôle |
|---|---|---|
| **Staging** | stg_employees, stg_job_offers... | Nettoyage des données brutes |
| **Dimensions** | dim_employe, dim_temps, dim_poste... | Référentiels RH |
| **Faits** | fait_recrutement, fait_effectifs, fait_gap_competences... | Mesures et indicateurs |
| **Reporting** | kpi_rh, rh_funnel_recrutement, rh_turnover... | KPIs prêts à consommer |

### Qualité des données
50+ tests automatisés (unicité, nulls, valeurs valides).
Résultat : **35 PASS / 0 FAIL** en production.

### Apache Superset (Port 8088)
Dashboards interactifs : effectifs, recrutement, turnover, ML.
Row-Level Security activée pour la confidentialité.

---

## 6. MACHINE LEARNING — 6 MODÈLES

| Modèle | Algorithme | Résultat | Table créée |
|---|---|---|---|
| **ML-1 Turnover** | Random Forest + SHAP | AUC = 0.574 | ml_turnover_risk |
| **ML-2 Segmentation** | K-Means (k=5) | Silhouette = 0.544 | ml_employee_segments |
| **ML-3 High Potentials** | Scoring multi-critères | 4 niveaux HP | ml_high_potentials |
| **ML-4 Prévision** | Facebook Prophet | 6 mois ahead | ml_forecast_embauches |
| **ML-5 Corrélations** | Pearson r | Matrice complète | ml_correlations |
| **ML-6 Rétention** | Score composite | Priorités RH | ml_retention_analysis |

### Points clés ML

**Turnover (ML-1) :** Le modèle analyse 1500 employés (400 départs historiques). Les facteurs les plus influents sont l'ancienneté et le type de contrat (SHAP values).

**Segmentation (ML-2) :** K=5 choisi automatiquement par le score silhouette. 5 profils RH identifiés : Junior Prometteur, Profil Confirmé, Expert Stable...

**High Potentials (ML-3) :** Score sur 100 pts combinant segment ML, score recrutement, ancienneté et type de contrat.

**Rétention (ML-6) :** Croise le risque de départ (ML-1) avec la valeur de l'employé (ML-3) → alerte `URGENT` pour les talents clés à risque.

### MLflow — Tracking des expériences
Interface à `http://localhost:5000` pour comparer les runs et choisir le meilleur modèle.

---

## 7. SÉCURITÉ

- **JWT HS256** partagé entre tous les services (secret identique obligatoire)
- **BCrypt** pour le hashage des mots de passe
- **RBAC** (Role-Based Access Control) à tous les niveaux
- **Keycloak** optionnel pour le SSO entreprise
- **Superset RLS** pour la séparation des données par profil

---

## 8. TECHNOLOGIES UTILISÉES

| Catégorie | Technologies |
|---|---|
| **Backend** | Java 17, Spring Boot 3.2.4, Spring Cloud, Spring Security, JPA/Hibernate, JJWT |
| **Frontend** | Angular 17, TypeScript, RxJS, Chart.js, Keycloak-JS |
| **Base de données** | MySQL 8.0 (3 bases opérationnelles + 1 DWH) |
| **ETL/BI** | Apache Airflow 2.9.1, dbt 1.8.0, Apache Superset 3.1.3 |
| **Machine Learning** | scikit-learn, Facebook Prophet, SHAP, pandas, numpy |
| **MLOps** | MLflow 2.13.0 |
| **APIs externes** | Google Gemini 1.5 Flash, Adzuna API |
| **Infrastructure** | Docker, Docker Compose |

---

## 9. RÉSULTATS EN CHIFFRES

```
Microservices développés    : 4
Endpoints API               : 30+
Tables base de données      : 25+
Modèles dbt                 : 18
Tests qualité données       : 50+
Modèles ML opérationnels    : 6
Employés analysés (ML)      : 1 100
AUC-ROC meilleur modèle     : 0.574
Score silhouette (k=5)      : 0.544
Prévisions embauches        : 6 mois
```

---

## 10. ACCÈS AU SYSTÈME

| Application | URL | Identifiants |
|---|---|---|
| Frontend | http://localhost:4200 | admin@hr.sirh.com / admin123 |
| API (Swagger) | http://localhost:8081/swagger-ui.html | — |
| Airflow | http://localhost:8090 | airflow / airflow |
| Superset | http://localhost:8088 | admin / admin |
| MLflow | http://localhost:5000 | — |

---

*SIRH — Projet de Fin d'Études 2026*