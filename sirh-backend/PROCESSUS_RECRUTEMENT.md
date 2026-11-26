# 📘 SIRH — Processus de Recrutement & Gestion RH (détaillé + schémas)

> Document de conception — Projet de Fin d'Études (PFE)
> Système d'Information des Ressources Humaines (SIRH)

---

## 1. Acteurs et rôles

| Rôle | Authority JWT | Périmètre | Compte démo |
|---|---|---|---|
| **RH** | `HR_ADMIN` | Toute l'organisation | `admin@hr.sirh.com` |
| **Manager** | `MANAGER` | Son département / équipe | `manager@mgr.sirh.com` |
| **Employé** | `EMPLOYEE` | Lui-même | `employee@sirh.com` |
| **Candidat externe** | *(aucun — public)* | Le formulaire public | — |

---

## 1 bis. Acteurs PRIMAIRES vs SECONDAIRES (modélisation UML)

> **Règle** : un acteur est une entité **EXTERNE** au système qui interagit avec lui.
> L'automatisation ne crée PAS un acteur — du code qui automatise *à l'intérieur* du
> système fait **partie du système**. Ce qui compte, c'est **« être externe »**.

### Acteurs PRIMAIRES (humains — déclenchent les cas d'utilisation)
| Acteur | Rôle JWT |
|---|---|
| RH | `HR_ADMIN` |
| Manager | `MANAGER` |
| Employé | `EMPLOYEE` |
| Candidat externe | *(public, non authentifié)* |

### Acteurs SECONDAIRES / SYSTÈME (systèmes externes sollicités par le SIRH)
| Acteur secondaire | Pourquoi c'est un acteur |
|---|---|
| **Google Gemini API** | Externe — le SIRH l'appelle pour ARIA et l'extraction de compétences |
| **Adzuna API** | Externe — interrogé pour l'intelligence marché |
| **Keycloak** (SSO) | Externe — validation d'identité optionnelle |
| **Serveur Email / SMTP** | Externe — envoi des emails (convocation, acceptation, refus) |

### ⚠️ Ce qui N'EST PAS un acteur (IA interne au système)
| Composant | Statut |
|---|---|
| Moteur de **scoring** (matching /100) | Cas d'utilisation interne, **pas un acteur** |
| **CvSkillExtractorService** (mode heuristique) | Logique interne |
| **ChatService** d'ARIA (orchestration, FAQ, recherche) | Composant interne |

> **Conclusion** : ARIA et le matching, en tant que logique interne, sont des **fonctionnalités
> du système** (cas d'utilisation), même s'ils automatisent. Seuls **Gemini, Adzuna, Keycloak et
> le serveur Email** — externes — sont des **acteurs secondaires**.

### Diagramme de contexte (acteurs)
```
   PRIMAIRES (humains)            SYSTÈME SIRH                SECONDAIRES (systèmes)
   ──────────────────        ┌────────────────────┐          ──────────────────────
   RH ────────────────►      │ ( Calculer score ) │ ◄──────── Google Gemini API
   Manager ───────────►      │ ( Discuter ARIA  ) │ ◄──────── Adzuna API
   Employé ───────────►      │ ( Extraire skills) │ ◄──────── Serveur Email/SMTP
   Candidat externe ──►      │ ( S'authentifier ) │ ◄──────── Keycloak (SSO)
                             └────────────────────┘
   (déclenchent les cas)        (frontière système)       (sollicités par le système)
```

---

## 2. Architecture technique (rappel)

```
                          ┌──────────────────────────────┐
        Navigateur  ────► │   API Gateway  (:8080)        │  ← seul point d'entrée
        (Angular)         │   - Valide le JWT             │     public, valide le token
                          │   - Injecte X-Auth-User/Roles │
                          └───────┬───────┬──────────┬────┘
                                  │       │          │
                ┌─────────────────┘       │          └──────────────────┐
                ▼                         ▼                             ▼
     ┌───────────────────┐   ┌────────────────────────┐   ┌─────────────────────────┐
     │ Auth Service :8081│   │ Employee Service :8082 │   │ Recruitment Service :8083│
     │ users, JWT, rôles │   │ employés, départements,│   │ offres, candidatures,    │
     │ Keycloak (option) │   │ postes, MOBILITÉ       │   │ matching IA, Adzuna,     │
     └─────────┬─────────┘   └───────────┬────────────┘   │ NOTIFICATIONS, emails    │
               │                         │                └────────────┬────────────┘
               └─────────────────────────┴─────────────────────────────┘
                                         ▼
                                   ┌───────────┐
                                   │  MySQL 8  │
                                   └───────────┘
```

---

## 3. Cycle de vie d'une OFFRE (diagramme d'états)

```
        Manager crée                Manager soumet
   ●───────────────►┌────────┐──────────────────►┌──────────────────────┐
                    │ DRAFT  │                    │  PENDING_VALIDATION  │
                    └────────┘                    └──────────┬───────────┘
                        │                                    │
            RH publie   │                      ┌─────────────┴─────────────┐
            directement │                 RH valide                   RH refuse
                        │                 (publish)                   (+ motif)
                        ▼                      ▼                           ▼
                  ┌───────────┐          ┌───────────┐              ┌───────────┐
                  │ PUBLISHED │◄─────────│ PUBLISHED │              │  REFUSÉE  │
                  └─────┬─────┘          └───────────┘              │ (DRAFT/   │
                        │                                           │ CANCELLED)│
            RH clôture  │  (poste pourvu)                           └───────────┘
                        ▼
                  ┌──────────┐
                  │  CLOSED  │
                  └──────────┘

   États : DRAFT · PENDING_VALIDATION · PUBLISHED · CLOSED · CANCELLED
```

🔔 `OFFER_PENDING_VALIDATION` → RH  |  `OFFER_VALIDATED` / `OFFER_REFUSED` → Manager

---

## 4. Cycle de vie d'une CANDIDATURE (diagramme d'états)

```
   Candidat/Employé postule
   ●──────────────────────►┌──────────┐
                           │ PENDING  │  (À traiter)
                           └────┬─────┘
                                │  RH : « En revue »
                                ▼
                          ┌────────────┐
                          │ REVIEWING  │  (En revue)
                          └─────┬──────┘
                                │  RH : « Entretien »
                                ▼
                    ┌───────────────────────┐
                    │ INTERVIEW_SCHEDULED   │  (Entretien planifié)
                    └───────┬───────────────┘
                            │
              RH : Accepter │ RH : Refuser
                ┌───────────┴────────────┐
                ▼                         ▼
          ┌──────────┐              ┌──────────┐
          │ ACCEPTED │              │ REJECTED │
          └──────────┘              └──────────┘
                                         │
                                         ▼  (RH : Supprimer → retrait définitif)

   États : PENDING · REVIEWING · INTERVIEW_SCHEDULED · ACCEPTED · REJECTED
   NB : le RH peut Accepter / Refuser directement depuis n'importe quel état actif.
```

---

## 5. Processus GLOBAL — diagramme d'activité (swimlanes)

```
 EMPLOYÉ / CANDIDAT │        MANAGER         │          RH            │     SYSTÈME / IA
════════════════════╪════════════════════════╪════════════════════════╪═══════════════════════
                    │                        │                        │
                    │  ① Crée une offre      │                        │
                    │     (DRAFT)            │                        │
                    │  ② Soumet pour         │                        │
                    │     validation ────────┼──🔔 OFFER_PENDING─────►│
                    │                        │  ③ Valide / Refuse     │
                    │  ◄──🔔 VALIDATED/──────┼────────────────────────┤
                    │       REFUSED          │  (offre PUBLISHED)     │
                    │                        │  ④ Diffuse le lien     │
                    │                        │     public ───────────┐│
 ⑤ Ouvre le lien ◄──┼────────────────────────┼───────────────────────┘│
 ⑥ Remplit le       │                        │                        │
    formulaire ─────┼────────────────────────┼────────────────────────┼─► ⑦ Crée Application
    (EXTERNAL)      │                        │                        │     (PENDING)
 ◄──🔔 RECEIVED─────┼────────────────────────┼──🔔 NEW_APPLICATION────┤   ⑧ Scoring IA /100
                    │                        │                        │     + Bonus Adzuna
                    │  ⑨ Évalue candidats   │  ⑩ Consulte la         │
                    │     de son dept        │     shortlist classée  │
                    │                        │  ⑪ En revue            │
                    │                        │  ⑫ Entretien ─────────►│   📧 email convocation
 ◄──🔔 INTERVIEW────┼──🔔 INTERVIEW_IN_DEPT─┼──🔔 EMAIL_SENT─────────┤
                    │                        │  ⑬ Accepter/Refuser ──►│   📧 email résultat
 ◄──🔔 ACCEPTED/────┼──🔔 ACCEPTED_IN_DEPT──┼──🔔 EMAIL_SENT─────────┤
       REJECTED     │                        │  ⑭ Clôture l'offre     │
                    │                        │     (CLOSED)           │
```

---

## 6. Diagramme de SÉQUENCE — recrutement externe

```
Candidat        Frontend         Gateway:8080      Recruitment:8083      IA/Adzuna      EmailService
   │                │                  │                   │                  │              │
   │ ouvre lien     │                  │                   │                  │              │
   │───────────────►│ GET offre        │                   │                  │              │
   │                │─────────────────►│ /job-offers/{id}  │                  │              │
   │                │                  │──────────────────►│                  │              │
   │                │◄─────────────────┤◄──────────────────┤                  │              │
   │ remplit form   │                  │                   │                  │              │
   │───────────────►│ POST /applications/public            │                  │              │
   │                │─────────────────►│──────────────────►│ save (PENDING)   │              │
   │                │                  │                   │ score IA ───────►│              │
   │                │                  │                   │◄─────────────────┤              │
   │                │                  │                   │ 🔔 NEW_APPLICATION→RH           │
   │                │                  │                   │ 🔔 RECEIVED → candidat          │
   │◄───────────────┤◄─────────────────┤◄──────────────────┤                  │              │
   │  "Candidature envoyée"            │                   │                  │              │
   ┊                ┊                  ┊                   ┊                  ┊              ┊
  (plus tard — côté RH)                                    │                  │              │
 RH│ clique Refuser │                  │                   │                  │              │
   │───────────────►│ PUT /applications/{id}/status        │                  │              │
   │                │─────────────────►│──────────────────►│ save (REJECTED)  │              │
   │                │                  │                   │ 📧 email refus ─────────────────►│
   │                │                  │                   │ 🔔 REJECTED → candidat          │
   │◄───────────────┤◄─────────────────┤◄──────────────────┤ (DTO mis à jour) │              │
```

> ⚠️ Robustesse : le statut est **sauvegardé AVANT** l'envoi d'email. Si l'email échoue, l'opération réussit quand même (try/catch).

---

## 7. Processus PARALLÈLE — Mobilité interne (diagramme d'activité)

```
   EMPLOYÉ                    MANAGER                      RH
══════════════╪══════════════════════════╪══════════════════════════════
              │                          │
 ① Demande de │                          │
   mobilité ──┼──🔔 MOBILITY_REQUEST─────►│
   (POST /my) │                          │
              │  ② Valide la demande     │
              │     (PUT /{id}/status)───┼──🔔 MOBILITY_MANAGER_VALIDATED►
              │                          │  ③ Approuve / Rejette
 ◄──🔔 MOBILITY_APPROVED ────────────────┼────(PUT /{id}/status)
 ◄──🔔 MOBILITY_REJECTED ────────────────┤
              │                          │  Règles définies dans
              │                          │  « Politiques de mobilité »

   États mobilité : SUBMITTED → MANAGER_VALIDATED → APPROVED / REJECTED
```

---

## 8. Calcul du SCORE IA (détail)

```
 SCORE FINAL /100
 ┌────────────────────────────────────────────────────────────────┐
 │  Compétences (max 60)                                          │
 │    = (poids des compétences requises MATCHÉES / poids total)   │
 │      × 60                                                      │
 ├────────────────────────────────────────────────────────────────┤
 │  Expérience (max 25)                                          │
 │    ≥ min+2 ans → 25 | ≥ min → 22 | ≥ min-1 → 16 | …            │
 ├────────────────────────────────────────────────────────────────┤
 │  Profil CV (max 15)                                          │
 │    skills ≥4 (+5) · formation (+3) · lettre ≥80c (+3) ·       │
 │    langues (+2) · soft skills (+2)                            │
 ├────────────────────────────────────────────────────────────────┤
 │  Bonus Marché ADZUNA (max +8)                                │
 │    = (skills candidat demandés sur le marché / total) × 8     │
 └────────────────────────────────────────────────────────────────┘
        │
        ▼  Garde-fous : compétence CRITIQUE manquante → plafond 79
                        aucune compétence → plafond 54
        ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ DÉCISION IA :                                                │
 │   ≥ 85 → Très adapté   │  ≥ 72 → Bon potentiel               │
 │   ≥ 60 → À vérifier     │  < 60 → Non prioritaire             │
 └──────────────────────────────────────────────────────────────┘
```

> **Adzuna** ne fournit PAS de candidats — il fournit des **offres du marché** (salaires, compétences demandées) pour enrichir le scoring et benchmarker l'offre.

---

## 9. Matrice complète des NOTIFICATIONS

| Événement déclencheur | Type de notification | Destinataire | Email ? |
|---|---|---|---|
| Offre soumise à validation | `OFFER_PENDING_VALIDATION` | RH | — |
| Offre validée | `OFFER_VALIDATED` | Manager | — |
| Offre refusée | `OFFER_REFUSED` | Manager | — |
| Candidature reçue | `APPLICATION_RECEIVED` | Candidat/Employé | — |
| Nouvelle candidature | `NEW_APPLICATION` | RH | — |
| Entretien planifié | `INTERVIEW_SCHEDULED` | Candidat | ✅ convocation |
| Entretien dans le dept | `INTERVIEW_IN_DEPT` | Manager | — |
| Email convocation envoyé | `EMAIL_SENT_CONFIRMATION` | RH | — |
| Candidature acceptée | `APPLICATION_ACCEPTED` | Candidat | ✅ félicitations |
| Candidat accepté dans dept | `CANDIDATE_ACCEPTED_IN_DEPT` | Manager | — |
| Candidature refusée | `APPLICATION_REJECTED` | Candidat | ✅ réponse + motif |
| Email refus envoyé | `EMAIL_SENT_CONFIRMATION` | RH | — |
| Demande de mobilité | `MOBILITY_REQUEST_SUBMITTED` | Manager | — |
| Mobilité validée (manager) | `MOBILITY_MANAGER_VALIDATED` | RH | — |
| Mobilité approuvée | `MOBILITY_APPROVED` | Employé | — |
| Mobilité rejetée | `MOBILITY_REJECTED` | Employé | — |

---

## 10. Fonctionnalités détaillées par rôle

### 🔵 RH (HR_ADMIN)
| Module | Fonction |
|---|---|
| Dashboard RH | KPIs, pipeline externe, taux d'acceptation, ancienneté |
| Recrutement (oversight) | Lister/valider/publier/refuser/clôturer les offres |
| Matching Interne | Classer les **employés** sur une offre interne |
| Matching Externe | Classer les **candidats externes** + diffuser le lien + décider |
| Intelligence Marché | Synchroniser Adzuna, benchmark salaire/compétences |
| Départements / Postes | CRUD structure organisationnelle |
| Contrats | Gestion des types de contrat |
| Organigramme | Vue hiérarchique |
| Mobilité (demandes) | Approuver/rejeter les mobilités |
| Mobilité (politiques) | Définir les règles d'éligibilité |
| Utilisateurs & permissions | Gestion des comptes et rôles |
| BI Analytics / Rapports | Tableaux de bord décisionnels |

### 🟢 MANAGER
| Module | Fonction |
|---|---|
| Dashboard équipe | Vue de son département |
| Posting board | Créer/soumettre des offres |
| Candidate review | Évaluer les candidats de son dept |
| Talent tracking | Suivre les talents internes |
| Team mobility | Valider les mobilités de son équipe |
| Team reports | Rapports d'équipe |

### 🟠 EMPLOYÉ
| Module | Fonction |
|---|---|
| Profil / Annuaire | Voir son profil, l'annuaire interne |
| Offres internes | Consulter et postuler en interne |
| Mes candidatures | Suivre l'état de ses candidatures |
| Mes entretiens | Voir ses entretiens (date, lieu) |
| Ma mobilité | Demander et suivre une mobilité |

---

## 11. Principes directeurs

1. **Séparation des rôles** — le candidat *postule*, le RH *décide*. Jamais l'inverse.
2. **L'IA assiste, l'humain tranche** — le score classe et recommande, la décision finale est humaine.
3. **Traçabilité totale** — chaque action génère email + notification vers le bon acteur.
4. **Double validation** — offres (Manager → RH) et mobilité (Employé → Manager → RH).
5. **Robustesse** — la persistance du statut ne dépend jamais du succès d'un email.

---

## 12. Architecture MICROSERVICES (détaillée)

Le SIRH est découpé en **4 microservices** indépendants + une base de données, orchestrés derrière une **API Gateway** unique.

```
                                  ┌──────────────────────────────────┐
                                  │            CLIENT                 │
                                  │   Angular SPA (standalone, JWT)   │
                                  └────────────────┬──────────────────┘
                                                   │  HTTPS + Bearer JWT
                                                   ▼
                ┌──────────────────────────────────────────────────────────────┐
                │                  API GATEWAY  (:8080)                          │
                │  • Point d'entrée PUBLIC unique                                │
                │  • AuthJwtFilter : extrait le Bearer token                     │
                │  • JwtValidator : valide HS256 (+ RSA Keycloak via JWKS)       │
                │  • Injecte  X-Auth-User: <email>  /  X-Auth-Roles: <roles>     │
                │  • Agrège la doc Swagger des 3 services                        │
                └───────┬───────────────────┬───────────────────────┬───────────┘
                        │ /api/auth/**       │ /api/employees/**     │ /api/job-offers/**
                        │                    │ /api/departments/**   │ /api/applications/**
                        │                    │ /api/positions/**     │ /api/skills/**
                        │                    │ /api/mobility/**      │ /api/chat/** (ARIA)
                        │                    │                       │ /api/market/**
                        ▼                    ▼                       ▼
        ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐
        │  AUTH SERVICE  :8081  │ │ EMPLOYEE SVC  :8082  │ │  RECRUITMENT SVC  :8083    │
        │  org.example.auth     │ │ org.example.employee │ │  org.example.recruitment   │
        │ ───────────────────── │ │ ──────────────────── │ │ ────────────────────────── │
        │ • Users, rôles        │ │ • Employés           │ │ • Offres (cycle de vie)    │
        │ • JWT (génération)    │ │ • Départements       │ │ • Candidatures + statuts   │
        │ • Register/Login/     │ │ • Postes, contrats   │ │ • Matching IA + scoring    │
        │   Refresh             │ │ • Organigramme       │ │ • CvSkillExtractor (Gemini)│
        │ • Pont Keycloak (SSO) │ │ • MOBILITÉ interne   │ │ • AdzunaService (marché)   │
        │                       │ │                      │ │ • ChatService (ARIA)       │
        │                       │ │                      │ │ • Notifications + Emails   │
        └───────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘
                    │                         │                           │
                    │   JwtAuthFilter         │   JwtAuthFilter           │   JwtAuthFilter
                    │   (re-valide + lit       │   (re-valide + ajoute     │   (re-valide + ajoute
                    │    X-Auth headers)       │    préfixe ROLE_)         │    préfixe ROLE_)
                    └─────────────────────────┴───────────────────────────┘
                                              ▼
                                       ┌────────────┐
                                       │  MySQL 8   │   (un schéma par domaine)
                                       └────────────┘

         Optionnel : ┌──────────────────────┐
                     │ Keycloak  :8180 (SSO) │  ← validation RSA via JWKS côté gateway
                     └──────────────────────┘
```

### Responsabilités par service

| Service | Port | Package | Responsabilité |
|---|---|---|---|
| **API Gateway** | 8080 | `org.example.gateway` | Routage, validation JWT, injection headers, agrégation Swagger |
| **Auth Service** | 8081 | `org.example.auth` | Users, rôles, JWT, pont Keycloak |
| **Employee Service** | 8082 | `org.example.employee` | Employés, départements, postes, contrats, **mobilité** |
| **Recruitment Service** | 8083 | `org.example.recruitment` | Offres, candidatures, **matching IA**, Adzuna, **ARIA**, notifications, emails |

### Cycle de vie d'une requête sécurisée
```
1. Le client envoie la requête avec  Authorization: Bearer <JWT>
2. Gateway → AuthJwtFilter extrait le token
3. Gateway → JwtValidator valide la signature HS256 (ou RSA Keycloak via JWKS)
4. Gateway injecte  X-Auth-User  et  X-Auth-Roles  dans la requête transmise
5. Le service cible → JwtAuthFilter re-valide et construit le SecurityContext
6. @PreAuthorize vérifie le rôle → Controller → Service → Repository → MySQL
7. Réponse renvoyée au client via la gateway
```

### Choix d'architecture (justification PFE)
- **Découplage métier** : chaque domaine (identité / RH / recrutement) évolue et se déploie indépendamment.
- **Sécurité en profondeur** : le JWT est validé à la gateway **ET** re-validé dans chaque service (un service n'a jamais confiance aveugle).
- **Point d'entrée unique** : seule la gateway est exposée ; les services écoutent en local (8081-8083).
- **Scalabilité** : le service Recruitment (le plus sollicité : IA, matching, chatbot) peut être mis à l'échelle séparément.
- **Contrainte clé** : `JWT_SECRET` doit être **identique** sur les 4 services, sinon toutes les requêtes authentifiées échouent.

---

## 13. ARIA — l'assistant RH intelligent (chatbot)

**ARIA** est le chatbot conversationnel du SIRH, intégré dans toute l'application. Il accompagne **les 3 rôles connectés** (Employé, Manager, RH).

### Présentation
> « Bonjour ! Je suis **ARIA**, votre assistant RH intelligent. 🤖 »

ARIA aide sur : **l'utilisation du SIRH**, **les procédures RH**, **le recrutement / gestion des talents**, et **toute question sur l'application**.

### Architecture technique
```
 Utilisateur (connecté)
        │  "Quelles offres sont disponibles ?"
        ▼
 ┌──────────────────────────────────────────────────────┐
 │  Front : composant ai-chat (ARIA)                     │
 │  - suggestions rapides                                │
 │  - sessionId (mémoire de conversation)                │
 └───────────────────────┬──────────────────────────────┘
                         │ POST /api/chat/{sessionId}  (JWT requis, via gateway)
                         ▼
 ┌──────────────────────────────────────────────────────┐
 │  AiChatController (recruitment-service)               │
 │  ① @PreAuthorize EMPLOYEE / MANAGER / HR_ADMIN        │
 │  ② RateLimitService → max 10 messages / heure / user  │
 │  ③ ChatService.processMessage()                       │
 │  ④ Persiste ChatMessage (historique en base)          │
 │  ⑤ AiUsageLog (traçabilité : user, prompt, réponse)   │
 └───────────────────────┬──────────────────────────────┘
                         ▼
                ChatService — MODE DOUBLE
          ┌──────────────────┴───────────────────┐
       GEMINI_API_KEY présent ?                  absent
          │                                        │
          ▼                                        ▼
   processWithGemini()                     processWithHeuristics()
   • Construit l'historique conv.          • FAQ par mots-clés
   • Appelle Google Gemini                 • Recherche d'offres publiées
     (gemini-1.5-flash)                      (titre / département / compétence)
   • Réponse contextuelle                  • Réponse texte structurée (markdown)
   • Fallback heuristique si échec
```

### Fonctionnalités d'ARIA

| Fonctionnalité | Détail |
|---|---|
| **Suggestions rapides** | « 🔍 Quelles offres sont disponibles ? », « 📋 Comment postuler ? », « 🎯 Comment fonctionne le score IA ? », « 🚀 Je veux évoluer en interne » |
| **Recherche d'offres** | Trouve les offres **publiées** par mot-clé (titre, département, compétence) |
| **Aide aux procédures** | Explique comment postuler, le scoring IA, la mobilité interne |
| **Mémoire de session** | Conserve l'historique par `sessionId` (table `ChatMessage`) |
| **Mode Gemini** | Réponses contextuelles intelligentes si la clé API est configurée |
| **Mode heuristique** | Fonctionne **sans IA externe** (FAQ + recherche) → toujours disponible |
| **Rate limiting** | Max **10 messages / heure / utilisateur** (anti-abus → `429`) |
| **Traçabilité** | Chaque échange loggé dans `AiUsageLog` |
| **Sécurité** | Réservé aux utilisateurs **authentifiés** (`@PreAuthorize`), clé Gemini **côté backend** |

### Endpoints ARIA (`/api/chat`)
| Méthode | Endpoint | Rôle |
|---|---|---|
| `POST` | `/api/chat/{sessionId}` | Envoyer un message → réponse d'ARIA |
| `GET` | `/api/chat/{sessionId}` | Récupérer l'historique de la session |
| `GET` | `/api/chat/rate-limit` | Connaître le quota restant |

### Valeur ajoutée (pour la soutenance)
- **Disponibilité 24/7** : répond aux questions RH/recrutement sans intervention humaine.
- **Résilience** : fonctionne même sans clé Gemini (mode heuristique).
- **Sécurisé & tracé** : passe par la gateway (JWT), rate-limité, chaque usage est journalisé.
- **Intégré au métier** : ARIA interroge directement les **offres réelles** de la base, pas une FAQ figée.
