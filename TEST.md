# TEST — Préparation à la soutenance PFE
### SIRH — « Développement d'une solution BI scalable, adossée à une architecture microservices »
**Esraa Ahmadi — ARABSOFT — Spécialité Big Data & BI**

> Document d'entraînement : 50 questions/réponses (dont questions pièges, focus ML/IA) + 50 QCM corrigés.
> Chiffres de référence du modèle turnover `model_rf_v4_p70` : accuracy 0,886 · AUC-ROC 0,877 · AUC-PR 0,698 · précision(parti) 0,707 · rappel(parti) 0,537 · F1 0,611 · Brier 0,117→0,082 · CV AUC-ROC 0,842.

---

# PARTIE 1 — 50 QUESTIONS / RÉPONSES

## A. Vision & gestion de projet (Q1–Q6)

**Q1. Quel est l'objectif du projet et sa valeur ajoutée ?**
Concevoir une plateforme SIRH unique couvrant tout le cycle de vie RH (employés, recrutement, mobilité, pilotage décisionnel). Valeur ajoutée : (1) unifier des outils dispersés, (2) recrutement enrichi par l'IA (matching + chatbot), (3) passage de l'opérationnel au décisionnel (BI + ML), (4) solution scalable et gouvernée (RBAC/RLS, Airflow).

**Q2. Pourquoi Scrum et pas un cycle en V ?**
Besoins évolutifs, livraisons incrémentales par sprint, feedback continu. 5 sprints, chacun livrant une valeur métier fonctionnelle. Le cycle en V est rigide et n'accepte pas le changement en cours de route.

**Q3. Comment avez-vous découpé vos sprints ?**
S1 Authentification Keycloak + gestion population ; S2 Gestion des emplois + workflow mobilité ; S3 Matching IA + analyse des candidatures ; S4 Infrastructure décisionnelle (dbt/DWH/Superset) ; S5 Analyse prédictive (ML) + gouvernance.

**Q4. Quels sont les acteurs du système ?**
Employé, Manager, RH (HR_ADMIN), et le candidat externe (recrutement public). Chacun avec des droits distincts (RBAC).

**Q5. Quels étaient les besoins non fonctionnels ?**
Scalabilité, sécurité (JWT/Keycloak), performance, maintenabilité (microservices), explicabilité des décisions IA, et fiabilité des données (tests dbt).

**Q6. Quelle est la limite principale de votre projet ?**
Les données de départ (`is_parti`) sont **générées** (synthétiques) faute d'historique RH réel — donc le modèle turnover doit être re-validé sur données réelles avant production. Je l'assume et je documente le protocole.

## B. Architecture microservices & communication (Q7–Q14)

**Q7. Qu'est-ce qu'une architecture microservices ?**
Découper l'application en services indépendants, chacun responsable d'un domaine métier, avec sa base, déployable et scalable séparément, communiquant par API REST.

**Q8. Quels sont vos microservices ?**
API Gateway (8080), auth-service (8081), employee-service (8082), recruitment-service (8083). Tous en Spring Boot.

**Q9. Pourquoi microservices plutôt que monolithe ?**
Scalabilité ciblée (répliquer seulement le service sous charge), isolation des pannes, maintenabilité, technologies hétérogènes (Java + Keycloak + Python ML).

**Q10. Quels sont les inconvénients des microservices, et comment les gérez-vous ?**
Complexité réseau, cohérence distribuée, supervision. Gérés par : passerelle unique, secret JWT partagé, couplage faible (les services ne s'appellent pas directement, ils communiquent via la donnée).

**Q11. Comment vos services communiquent-ils en REST ?**
Via **Spring Cloud Gateway** avec **routage statique** : chaque route mappe un `Path` vers une URI fixe (`http://localhost:8082`…). Le client ne parle qu'à la passerelle.

**Q12. (PIÈGE) Vous n'utilisez pas Eureka — pourquoi, et est-ce un manque ?**
Non, c'est un choix. Eureka (service discovery) n'a de sens qu'avec de **nombreuses instances dynamiques** aux adresses inconnues (auto-scaling). J'ai un nombre de services **fixe** et des adresses **stables** → le routage statique est plus simple, suffisant et sans serveur de registre supplémentaire.

**Q13. Et si demain vous passez à 50 services / auto-scaling ?**
Là oui, j'introduirais un service discovery (Eureka, Consul) ou je m'appuierais sur le **DNS de Kubernetes** + un load balancer. L'architecture le permet sans refonte, car la passerelle isole déjà le client des adresses internes.

**Q14. Vos microservices s'appellent-ils entre eux ?**
Non directement. Ils sont découplés : les données transactionnelles sont ensuite consolidées par dbt dans l'entrepôt. Les seuls appels sortants sont vers des API externes (Gemini, Adzuna) via `java.net.http.HttpClient`.

## C. Sécurité, JWT & Keycloak (Q15–Q22)

**Q15. Qu'est-ce qu'un JWT et pourquoi l'utiliser ?**
JSON Web Token : jeton signé contenant identité + rôles + expiration. Avantage : **sans état (stateless)**, chaque service le valide indépendamment — idéal en microservices.

**Q16. Comment le JWT est-il validé ?**
Signature vérifiée avec une clé secrète partagée (HS256) ou clé publique RSA de Keycloak via JWKS. La passerelle valide en premier, puis chaque service revalide (défense en profondeur).

**Q17. Qu'est-ce que Keycloak et sa valeur ajoutée ?**
Serveur d'identité open source (IAM) implémentant OpenID Connect / OAuth2 / SAML. Il centralise l'authentification, fournit le SSO, les rôles, l'expiration — je ne réécris pas la sécurité.

**Q18. Différence authentification avec/sans Keycloak ?**
Sans : mon app gère comptes et mots de passe (auth-service maison, JWT HS256). Avec : Keycloak authentifie et délivre un JWT RSA ; mon app ne voit jamais le mot de passe. Analogie : la réception d'hôtel qui remet une carte.

**Q19. Comment stockez-vous les mots de passe ?**
Jamais en clair : hachage **BCrypt** (Spring Security). Avec Keycloak, c'est Keycloak qui les gère.

**Q20. (PIÈGE) Le secret JWT est le même sur les 4 services : n'est-ce pas un risque ?**
En HS256 (symétrique), oui il doit être partagé pour valider. Le risque est maîtrisé car les services sont **internes** (non exposés) et le secret vient d'une **variable d'environnement**, jamais du code. En production, on passerait à Keycloak RSA (asymétrique) : seule la clé **publique** circule, le privé reste chez Keycloak.

**Q21. Qu'est-ce que le RBAC ? Où l'appliquez-vous ?**
Role-Based Access Control : droits selon le rôle (HR_ADMIN, MANAGER, EMPLOYEE). Appliqué via `@PreAuthorize` sur les endpoints (mutations réservées HR_ADMIN) et dans Superset (4 rôles).

**Q22. Le piège de l'issuer Keycloak ?**
L'`issuer` (hôte déclaré dans le jeton) doit être **identique** côté front et back (ex. `127.0.0.1`), sinon la validation échoue (mismatch issuer) et l'utilisateur est éjecté.

## D. Recrutement IA — matching, Adzuna, ARIA (Q23–Q32)

**Q23. Comment fonctionne le tri IA des candidatures ?**
1) Extraction des compétences du CV/lettre (Gemini, avec repli heuristique). 2) Calcul d'un score sur 100 (algorithme déterministe). 3) Classement des candidats par score décroissant avec décision RH suggérée.

**Q24. (PIÈGE) Le tri IA, c'est un algorithme de quoi exactement ?**
Ce n'est **pas** un modèle ML entraîné. C'est un **algorithme de correspondance d'ensembles** (recouvrement compétences candidat ∩ compétences requises) avec **pondération heuristique** (bonus expérience + confiance). L'IA (Gemini) sert seulement **en amont** à extraire les compétences.

**Q25. Détaillez le calcul du score.**
`Score = min(100, base + bonus_exp + bonus_confiance)`.
- base = (compétences communes × 100) / compétences requises
- bonus_exp : ≥8 ans → +12 ; ≥5 → +8 ; ≥3 → +5 ; ≥1 → +2 (détecté par regex `(\d{1,2})\s*(ans|years)`)
- bonus_confiance : +5 si ≥ 4 compétences reconnues.
Exemple : 4/5 compétences (80) + 6 ans (+8) + ≥4 skills (+5) = 93/100.

**Q26. Pourquoi un algorithme déterministe et pas un modèle ML pour le matching ?**
Explicabilité (obligation légale/éthique en RH : justifier chaque décision), absence de données historiques étiquetées suffisantes, et paramétrabilité par le RH. Un modèle « boîte noire » serait inacceptable ici.

**Q27. (PIÈGE ML) Comment évitez-vous le biais de discrimination dans le matching ?**
Le score ne se base que sur des **compétences et l'expérience**, pas sur des attributs protégés (âge, genre, origine). Comme il est **déterministe et traçable**, tout biais serait détectable et auditable — contrairement à un modèle entraîné qui pourrait apprendre des biais cachés dans l'historique.

**Q28. Qu'est-ce qu'Adzuna et est-ce de l'IA ?**
Adzuna est une **API externe de marché de l'emploi** (pas de l'IA). J'importe des offres réelles (titre, description, salaire min/max). L'IA (Gemini) intervient ensuite pour **extraire les compétences** des descriptions, et les salaires alimentent une **intelligence salariale** (comparaison interne vs marché → bonus de score).

**Q29. Comment fonctionne le chatbot ARIA ?**
Deux modes : (1) **Gemini** — je lui envoie le message + l'historique + le contexte des offres publiées → réponse en langage naturel ; (2) **heuristique** — FAQ par mots-clés + recherche d'offres, si pas de clé IA. Rate limiting (10 req/h) + journalisation `AiUsageLog`.

**Q30. (PIÈGE IA) Gemini peut halluciner. Comment le maîtrisez-vous ?**
Trois garde-fous : (1) je **contraint la sortie** (prompt qui exige un JSON de compétences, sinon `{"skills":[]}`) ; (2) je **valide** les compétences extraites contre mon **référentiel en base** (je ne garde que celles qui existent) ; (3) **repli heuristique** déterministe si la réponse est vide/invalide. Le score final ne dépend donc jamais d'une invention du LLM.

**Q31. Pourquoi Gemini et pas un modèle local ?**
Qualité de compréhension du langage naturel supérieure, pas d'infrastructure GPU à gérer, intégration rapide par API. Compromis : dépendance externe + coût → d'où le mode heuristique de secours et le rate limiting.

**Q32. Où sont stockés les CV ? Problème ?**
En base MySQL en `LONGBLOB`. Je reconnais que c'est une limite de scalabilité : en production, il faudrait un **stockage objet** (S3/MinIO) et ne garder que la référence en base.

## E. BI — dbt, entrepôt, modélisation (Q33–Q40)

**Q33. Qu'est-ce que dbt et son objectif ?**
data build tool : le « T » de l'ELT. Transformer les données dans l'entrepôt via des `SELECT` SQL versionnés, exécutés dans le bon ordre, avec tests et documentation. Objectif : un entrepôt propre, fiable, traçable.

**Q34. ELT ou ETL ? Différence et pourquoi ?**
ELT : je **charge d'abord** les données brutes dans l'entrepôt, **puis** je transforme avec dbt (dans la base, en SQL). Plus scalable et transparent que l'ETL classique (transformation avant chargement). dbt est nativement ELT.

**Q35. Pourquoi un modèle en étoile plutôt qu'en flocon ?**
Étoile : tables de faits entourées de dimensions **dénormalisées** → requêtes plus simples et plus rapides (moins de jointures), idéal pour la BI. Le flocon normalise les dimensions (plus de jointures, plus lent à interroger).

**Q36. Décrivez votre entrepôt `sirh_dwh`.**
Une **constellation** (plusieurs étoiles partageant des dimensions) : processus Recrutement, Effectifs, Mobilité. Dimensions partagées : `dim_employe`, `dim_departement`, `dim_temps`, `dim_poste`, `dim_competence`, `dim_offre`. Faits : `fait_recrutement`, `fait_effectifs`, `fait_mobilite`, `fait_competences`, `fait_gap_competences`.

**Q37. Qu'est-ce que le SCD Type 2 ?**
Slowly Changing Dimension type 2 : historiser les changements d'une dimension en **créant une nouvelle version** de la ligne (avec dates de validité + drapeau `est_actuel`) au lieu d'écraser. Ex. Alice Allard a 3 versions → je garde tout l'historique de carrière.

**Q38. Comment garantissez-vous la qualité des données ?**
Tests dbt (36 tests) : unicité des clés, non-nullité, valeurs acceptées, relations. Plus `dbt_source_freshness` pour la fraîcheur des sources.

**Q39. Qu'est-ce que le graphe de lineage dbt ?**
La carte des dépendances entre modèles : d'où vient chaque table et ce qu'elle alimente (`stg_employees` → `dim_employe` → `fait_effectifs` → `kpi_rh` → dashboard). Sert à la traçabilité et au diagnostic.

**Q40. Combien de dashboards Superset et lesquels ?**
5 : Vue d'ensemble RH, Recrutement, Compétences & Talents, Démographie, et Analyses ML. Le dashboard ML est aussi représenté comme **exposure dbt** (`analyse_ml`) pour figurer dans le lineage.

## F. Machine Learning (Q41–Q50) — focus examinateur ML

**Q41. Quels modèles ML et pour quels besoins ?**
Random Forest (prédiction turnover, supervisé) ; K-Means (segmentation employés, non supervisé) ; Prophet (prévision des embauches, séries temporelles) ; SHAP (explicabilité).

**Q42. Comment entraînez-vous le modèle de turnover ?**
Features explicables (salaire vs médiane dépt, ancienneté, contrat…) → `train_test_split` → RandomForest (300 arbres, profondeur 8, `class_weight='balanced'`) → **calibration** (`CalibratedClassifierCV`) → **choix du seuil** (précision ≥ 0,70) → **SHAP** pour expliquer. Validé par `StratifiedKFold` 5 plis.

**Q43. Pourquoi Random Forest et pas régression logistique ou XGBoost ?**
RF : bon compromis performance/robustesse, capte les non-linéarités et interactions, peu sensible au surapprentissage grâce au bagging, et **explicable via SHAP (TreeExplainer)**. La régression logistique serait trop linéaire ; XGBoost serait plus performant mais plus complexe à régler/expliquer — non justifié à cette échelle de données.

**Q44. (PIÈGE) Votre accuracy est 0,886 — n'est-ce pas excellent ?**
Attention : les départs sont **rares (~16 %)**. Un modèle « tout le monde reste » atteindrait déjà ~84 % d'accuracy sans rien prédire. L'accuracy **seule est trompeuse** sur données déséquilibrées. Ce qui compte : **AUC-ROC (0,877)**, **AUC-PR (0,698)**, précision et rappel de la classe rare.

**Q45. Différence AUC-ROC vs AUC-PR ? Laquelle privilégier ici ?**
AUC-ROC : capacité à ordonner un positif au-dessus d'un négatif. AUC-PR : se concentre sur la classe positive rare. En **données déséquilibrées, l'AUC-PR est plus honnête** (référence = taux de base 0,16 ; mon 0,698 est ~4× mieux).

**Q46. (PIÈGE) Comment évitez-vous le surapprentissage (overfitting) ?**
(1) `max_depth=8` limite la complexité ; (2) bagging du RF ; (3) **validation croisée** 5 plis : CV AUC-ROC 0,842 ≈ test 0,877 → **écart faible = pas de surapprentissage** ; (4) features explicables, pas de fuite de données.

**Q47. (PIÈGE) Data leakage — l'avez-vous vérifié ? D'où vient `is_parti` ?**
`is_parti` vient de la source (`date_depart`) via `stg_employees` → `dim_employe`, en amont du calcul des features → pas de fuite de la cible dans les features. Point d'honnêteté : les départs sont **générés** (biaisés : sous-paiement, contrat, ancienneté + bruit) car pas d'historique réel. Le pipeline évite qu'une correction post-dbt écrase la cible.

**Q48. Précision 0,71 vs rappel 0,54 : pourquoi ce compromis ?**
Choix métier : je règle le seuil pour **privilégier la précision**. En RH, trop de fausses alertes → perte de confiance du RH → outil abandonné. Mieux vaut alerter moins mais juste : **7 alertes sur 10 sont correctes**. C'est réglable (mode `precision`/`recall`/`cost`).

**Q49. (PIÈGE) Qu'est-ce que le Brier score et pourquoi calibrer ?**
Brier = erreur quadratique des probabilités prédites (plus bas = mieux). Un RF brut donne des probas mal calibrées. `CalibratedClassifierCV` les corrige : Brier 0,117 → **0,082** → « 70 % de risque » veut vraiment dire 70 %. Essentiel si le RH agit sur la probabilité.

**Q50. K-Means et Prophet — points de vigilance ?**
K-Means : il faut **choisir k** (méthode du coude / silhouette), sensible à l'échelle (donc **standardisation** des features) et aux valeurs aberrantes ; clusters sphériques supposés. Prophet : adapté aux séries avec tendance/saisonnalité, mais **peu de recul historique** ici → prévisions à horizon court (6 mois) avec intervalles de confiance, à interpréter avec prudence.

---

# PARTIE 2 — 50 QCM CORRIGÉS

> Format : question, options, **[Réponse : X]** + justification courte.

**1.** L'architecture du projet est :
A) Monolithique B) Microservices C) Serverless D) P2P
**[Réponse : B]** — 4 services Spring Boot + passerelle.

**2.** Le point d'entrée unique du système est :
A) auth-service B) Keycloak C) API Gateway D) MySQL
**[Réponse : C]** — port 8080, valide le JWT et route.

**3.** Le routage entre services utilise :
A) Eureka B) Consul C) Routage statique Spring Cloud Gateway D) Kafka
**[Réponse : C]** — URIs fixes dans application.yml.

**4.** Pourquoi ne pas utiliser Eureka ?
A) Trop cher B) Nombre de services fixe et adresses stables C) Incompatible Spring D) Obligatoire pourtant
**[Réponse : B]**

**5.** Le JWT est :
A) Chiffré et secret B) Signé et sans état C) Stocké en session serveur D) Un cookie only
**[Réponse : B]** — stateless, signé.

**6.** L'algorithme de signature JWT maison est :
A) RS256 B) HS256 C) AES D) SHA-1
**[Réponse : B]** — symétrique, secret partagé.

**7.** Keycloak est un(e) :
A) Base de données B) Serveur d'identité (IAM) C) Broker de messages D) Cache
**[Réponse : B]**

**8.** Keycloak implémente :
A) SOAP B) OpenID Connect / OAuth2 C) FTP D) GraphQL
**[Réponse : B]**

**9.** Les mots de passe sont stockés :
A) En clair B) En MD5 C) Hachés BCrypt D) Base64
**[Réponse : C]**

**10.** Le SSO signifie :
A) Single Sign-On B) Secure Socket Output C) Service Side Object D) Single Service Only
**[Réponse : A]**

**11.** La défense en profondeur ici =
A) Validation JWT uniquement à la passerelle B) À la passerelle ET dans chaque service C) Aucune D) Firewall seul
**[Réponse : B]**

**12.** Le contrôle d'accès par rôles s'appelle :
A) ABAC B) RBAC C) MAC D) DAC
**[Réponse : B]**

**13.** L'extraction des compétences d'un CV utilise :
A) Une regex uniquement B) Gemini avec repli heuristique C) Un CNN D) OCR seul
**[Réponse : B]**

**14.** Le calcul du score de matching est :
A) Un réseau de neurones B) Un algorithme déterministe pondéré C) K-Means D) Une régression
**[Réponse : B]** — explicable.

**15.** Le score de base du matching =
A) Jaccard exact B) (compétences communes × 100) / compétences requises C) Cosinus D) Aléatoire
**[Réponse : B]** — coefficient de recouvrement.

**16.** Le bonus d'expérience pour 6 ans est de :
A) +2 B) +5 C) +8 D) +12
**[Réponse : C]** — palier ≥ 5 ans.

**17.** Le score final est plafonné à :
A) 50 B) 80 C) 100 D) illimité
**[Réponse : C]**

**18.** Adzuna est :
A) Un modèle IA B) Une API externe d'offres marché C) Un algorithme de tri D) Un chatbot
**[Réponse : B]**

**19.** Le chatbot ARIA en mode intelligent utilise :
A) Rasa B) Gemini + contexte offres C) Un arbre de décision D) SQL
**[Réponse : B]**

**20.** ARIA sans clé IA fonctionne :
A) Il plante B) En mode FAQ heuristique C) En appelant Adzuna D) Rien
**[Réponse : B]**

**21.** Protection contre l'abus du chatbot :
A) Aucune B) Rate limiting 10 req/h C) Captcha D) Paiement
**[Réponse : B]**

**22.** Contre les hallucinations de Gemini, on :
A) Fait confiance B) Valide les compétences contre le référentiel en base C) Ignore D) Recommence 10 fois
**[Réponse : B]**

**23.** dbt correspond au … de l'ELT :
A) Extract B) Load C) Transform D) Export
**[Réponse : C]**

**24.** Les transformations dbt sont écrites en :
A) Python B) Java C) SQL (SELECT) D) YAML seul
**[Réponse : C]**

**25.** Le modèle de l'entrepôt est :
A) Flocon B) Étoile / constellation C) Relationnel 3NF D) Graphe
**[Réponse : B]**

**26.** L'étoile est préférée au flocon car :
A) Moins d'espace B) Moins de jointures, requêtes plus rapides C) Plus normalisé D) Obligatoire
**[Réponse : B]**

**27.** SCD Type 2 sert à :
A) Écraser les données B) Historiser via de nouvelles versions C) Supprimer D) Compresser
**[Réponse : B]**

**28.** Le nombre de dashboards Superset est :
A) 3 B) 4 C) 5 D) 7
**[Réponse : C]** — dont Analyses ML.

**29.** Le graphe de lineage dbt montre :
A) L'ordre des tâches B) Les dépendances entre tables C) Les utilisateurs D) Le réseau
**[Réponse : B]**

**30.** Apache Airflow est un :
A) Entrepôt B) Orchestrateur de pipelines C) Dashboard D) Modèle ML
**[Réponse : B]**

**31.** Un DAG est un graphe :
A) Cyclique B) Orienté sans cycle C) Non orienté D) Complet
**[Réponse : B]**

**32.** L'ordre du pipeline `sirh_bi_pipeline` :
A) dbt_run → extract B) extract_staging → freshness → snapshot → dbt_run → dbt_test C) test → run D) aléatoire
**[Réponse : B]**

**33.** Le RLS dans Superset filtre :
A) Les colonnes B) Les lignes selon le rôle C) Les dashboards D) Les couleurs
**[Réponse : B]** — Row-Level Security.

**34.** Le modèle de prédiction du turnover est un :
A) SVM B) Random Forest C) KNN D) Réseau profond
**[Réponse : B]**

**35.** `class_weight='balanced'` sert à :
A) Accélérer B) Gérer le déséquilibre des classes C) Réduire la mémoire D) Normaliser
**[Réponse : B]**

**36.** L'AUC-ROC du modèle est :
A) 0,50 B) 0,698 C) 0,877 D) 0,999
**[Réponse : C]**

**37.** Sur données déséquilibrées, la métrique trompeuse est :
A) AUC-PR B) Accuracy C) Rappel D) Brier
**[Réponse : B]**

**38.** L'AUC-PR (0,698) est pertinente car :
A) Données équilibrées B) Elle se concentre sur la classe rare C) Elle mesure la vitesse D) Sans intérêt
**[Réponse : B]**

**39.** La validation croisée utilisée est :
A) LeaveOneOut B) StratifiedKFold 5 plis C) Holdout simple D) Aucune
**[Réponse : B]**

**40.** CV AUC-ROC (0,842) proche du test (0,877) indique :
A) Surapprentissage B) Sous-apprentissage C) Modèle stable, pas d'overfitting D) Fuite de données
**[Réponse : C]**

**41.** La précision (parti) = 0,707 signifie :
A) 70,7 % des partants détectés B) 70,7 % des alertes sont justes C) 70,7 % d'accuracy D) 70,7 % de rappel
**[Réponse : B]**

**42.** Le rappel (parti) = 0,537 signifie :
A) 53,7 % des alertes justes B) 53,7 % des vrais partants détectés C) 53,7 % accuracy D) seuil
**[Réponse : B]**

**43.** Le F1-score combine :
A) Accuracy et AUC B) Précision et rappel C) Brier et ROC D) TP et TN
**[Réponse : B]**

**44.** Le Brier score mesure :
A) La vitesse B) La qualité/calibration des probabilités C) L'accuracy D) Le rappel
**[Réponse : B]** — plus bas = mieux.

**45.** La calibration a fait passer le Brier de :
A) 0,082 → 0,117 B) 0,117 → 0,082 C) 0,50 → 0,10 D) inchangé
**[Réponse : B]** — amélioration.

**46.** L'explicabilité des prédictions se fait avec :
A) LIME B) SHAP (TreeExplainer) C) Grad-CAM D) Aucune
**[Réponse : B]**

**47.** Le facteur n°1 du turnover trouvé est :
A) L'âge B) Le salaire C) Le genre D) La ville
**[Réponse : B]**

**48.** La segmentation des employés utilise :
A) DBSCAN B) K-Means C) Hierarchical only D) PCA seul
**[Réponse : B]**

**49.** Pour choisir k dans K-Means, on utilise :
A) Au hasard B) Méthode du coude / silhouette C) k=2 toujours D) Le nombre de features
**[Réponse : B]**

**50.** La prévision des embauches utilise :
A) ARIMA B) Prophet C) LSTM D) Régression linéaire simple
**[Réponse : B]** — séries temporelles avec tendance/saisonnalité.

---

## 🎯 Conseils express pour l'examinateur ML/IA (à relire 5 min avant)

1. **Ne jamais dire que le matching est de l'IA** → « algorithme déterministe explicable ; l'IA (Gemini) n'extrait que les compétences ».
2. **Accuracy = piège** → toujours enchaîner sur AUC-ROC/AUC-PR + précision/rappel sur classe rare.
3. **Assumer les données synthétiques** de `is_parti` → protocole de re-validation sur données réelles.
4. **Overfitting** → réponse toute prête : CV 0,842 ≈ test 0,877 + max_depth=8.
5. **Calibration/Brier** → « mes probabilités sont fiables, 70 % veut dire 70 % ».
6. **Compromis précision/rappel** → décision métier assumée (confiance du RH).
7. **Hallucination LLM** → sortie contrainte + validation contre référentiel + repli heuristique.