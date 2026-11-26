# 🎤 SPEECH SOUTENANCE TECHNIQUE — SIRH (A → Z)
### À lire pendant le meet (partage d'écran). `[🖥️ ...]` = ce que tu montres · le reste = ce que tu dis.
**Ordre : Introduction → Partie DEV (candidature + autres) → Partie BI → Partie ML → Conclusion**

> ⏱️ Durée cible ~15–18 min. Parle lentement, respire entre les blocs. Si on t'interrompt, réponds puis reprends « Je reprends… ».

---

## 0. INTRODUCTION (1 min)

« Bonjour à toutes et à tous. Je vais vous présenter mon projet de fin d'études réalisé au sein d'ARABSOFT, intitulé **« Développement d'une solution BI scalable, adossée à une architecture microservices »**.

C'est une plateforme **SIRH** — Système d'Information des Ressources Humaines — qui couvre tout le cycle de vie RH : la gestion des employés, le recrutement, la mobilité, et surtout le **pilotage décisionnel**.

Ma présentation suit le fil du projet en trois grandes parties :
1. d'abord la **partie développement** — l'application et le processus de candidature enrichi par l'IA,
2. ensuite la **partie Business Intelligence** — la chaîne de données et les tableaux de bord,
3. et enfin la **partie Machine Learning** — l'analyse prédictive.

Je vais faire une démonstration en direct. Commençons. »

---

## 1. PARTIE DÉVELOPPEMENT (5–6 min)

### 1.1 L'architecture (30 s — schéma)

`[🖥️ Affiche le schéma d'architecture microservices]`

« L'application repose sur une **architecture microservices**. Il y a quatre briques :
- une **API Gateway**, point d'entrée unique sur le port 8080, qui valide la sécurité et route les requêtes ;
- un **service d'authentification** avec Keycloak ;
- un **service employés** ;
- et un **service recrutement**.

Chaque service est indépendant, construit avec **Spring Boot**, et le front est en **Angular**. La sécurité est assurée par des **jetons JWT**. J'ai choisi cette architecture car mon sujet exige une solution **scalable** : je peux faire évoluer ou monter en charge chaque service séparément. »

### 1.2 Authentification (30 s)

`[🖥️ Écran de connexion — connecte-toi en tant qu'employé]`

« Je me connecte ici en tant qu'**employé**. L'authentification passe par **Keycloak**, notre serveur d'identité centralisé : l'utilisateur se connecte une seule fois et reçoit un jeton JWT signé que tous les services savent valider. Nous avons trois rôles : **Employé**, **Manager** et **RH**. »

### 1.3 LE PROCESSUS DE CANDIDATURE (le cœur — 2 min)

`[🖥️ Espace employé → liste des offres internes]`

« Voici l'espace employé. L'employé consulte les **offres internes** publiées. Je vais postuler à une offre.

`[🖥️ Clique "Postuler" → remplis lettre de motivation + joins un CV]`

Je remplis une **lettre de motivation** et je joins mon **CV**. Au moment où je soumets, c'est là que l'**intelligence artificielle** entre en jeu.

`[🖥️ Valide la candidature]`

Dès la soumission, le système fait deux choses automatiquement :

**Premièrement, l'extraction des compétences.** Le contenu du CV et de la lettre est envoyé à l'**IA générative Google Gemini**, qui **extrait automatiquement les compétences** du candidat. Si l'IA n'est pas disponible, un mode de secours par mots-clés prend le relais — la plateforme fonctionne toujours.

**Deuxièmement, le calcul d'un score de matching sur 100.** Un **algorithme déterministe** compare les compétences du candidat aux **compétences requises** par le poste. Le score combine trois éléments : le **taux de correspondance** des compétences, un **bonus d'expérience** détecté dans la lettre, et un **bonus de confiance** si le profil est riche. »

`[🖥️ Passe côté RH/Manager → interface de tri des candidatures]`

« Côté **recruteur**, voici le résultat : les candidats sont **classés automatiquement** du meilleur au moins pertinent. Pour chacun, je vois son **score**, les **compétences trouvées**, les **compétences manquantes**, et une **décision RH suggérée**.

`[🖥️ Ouvre le détail d'un candidat avec score élevé]`

Par exemple ce profil à **93/100** : le système indique la compétence secondaire manquante et propose même un **plan de formation**. Le recruteur gagne un temps considérable, et surtout la décision est **objective, explicable et traçable** — un point essentiel en RH. »

> 💡 Si on demande « c'est de l'IA le score ? » : « Non — l'IA *extrait* les compétences ; le *score* est un algorithme déterministe, choisi pour être explicable. »

### 1.4 Recrutement externe + Adzuna (45 s)

`[🖥️ Onglet Recrutement externe / Market Intelligence]`

« Le recrutement fonctionne aussi en **externe** : un candidat postule via un lien public, et il est classé par la même IA.

J'ai aussi intégré **Adzuna**, une API du marché de l'emploi : j'importe des offres réelles avec leurs **salaires de marché**. Le système compare le salaire interne au marché et **détecte un écart** — ce qui alimente notre analyse salariale. »

### 1.5 Chatbot ARIA (30 s)

`[🖥️ Ouvre le chatbot ARIA → tape "Offres Java"]`

« Enfin, un **chatbot RH nommé ARIA** assiste l'employé. Il fonctionne avec **Gemini** et connaît le contexte des offres publiées. Je peux chercher en langage naturel — par exemple « offres Java » — ou demander comment postuler. Il est protégé par une **limitation de débit** et chaque appel est **journalisé**. »

### 1.6 Mobilité interne (30 s)

`[🖥️ Espace employé → demande de mobilité / espace RH validation]`

« La plateforme gère aussi la **mobilité interne** avec un workflow de validation : l'employé fait une demande, le manager la valide, puis le RH décide. Chaque étape est suivie par une frise de progression. »

**Transition :**
« Voilà pour la partie applicative. Toutes ces actions — candidatures, employés, offres — **génèrent des données**. La question devient : comment les **exploiter pour décider** ? C'est tout l'objet de ma partie Business Intelligence. »

---

## 2. PARTIE BUSINESS INTELLIGENCE (4–5 min)

### 2.1 L'idée générale (30 s — schéma BI)

`[🖥️ Schéma de l'architecture BI]`

« L'objectif : transformer les données brutes des microservices en **information décisionnelle fiable**. Ma chaîne est une **ELT** — Extract, Load, Transform :
1. j'**extrais** les données des microservices,
2. je les **charge** dans un entrepôt,
3. je les **transforme** avec **dbt**,
4. et je les restitue dans des tableaux de bord **Apache Superset**,
5. le tout **orchestré par Apache Airflow**. »

### 2.2 L'entrepôt & la modélisation (1 min)

`[🖥️ Schéma en étoile / constellation du sirh_dwh]`

« Mon entrepôt s'appelle **sirh_dwh**. Je l'ai modélisé en **étoile**, plutôt qu'en flocon, parce que l'étoile réduit les jointures et rend les requêtes **plus rapides** — ce qui est idéal pour la BI.

Comme j'ai plusieurs processus métier — recrutement, effectifs, mobilité — qui partagent les mêmes dimensions, j'obtiens une **constellation** : des tables de **faits** au centre, entourées de **dimensions** partagées comme `dim_employe`, `dim_departement`, `dim_temps`.

`[🖥️ Montre l'historique d'un employé — SCD Type 2]`

Point important : j'ai implémenté le **SCD Type 2**. Quand un employé change de poste ou de salaire, je ne **écrase pas** l'ancienne valeur — je crée une **nouvelle version** avec des dates de validité. Ici par exemple, cet employé a **3 versions** : je garde tout son historique de carrière. »

### 2.3 dbt (1 min)

`[🖥️ dbt docs / le graphe de lineage]`

« La transformation est faite avec **dbt**. Concrètement, j'écris mes transformations en **simples requêtes SQL**, organisées en **couches** : staging pour le nettoyage, puis dimensions et faits, puis reporting pour les KPIs.

`[🖥️ Montre le graphe de lineage]`

Voici le **graphe de lineage** : c'est la **carte de mes données**. Il montre d'où vient chaque table et ce qu'elle alimente — du staging jusqu'au dashboard. Ça me donne une **traçabilité totale**.

Et dbt apporte la **qualité** : j'ai des **tests automatiques** — unicité, non-nullité, cohérence — qui vérifient mes données à chaque exécution. »

### 2.4 Airflow (45 s)

`[🖥️ Interface Airflow — DAG sirh_bi_pipeline, vue Graph]`

« Tout ce pipeline est **automatisé** par **Apache Airflow**, l'orchestrateur. Voici mon pipeline **sirh_bi_pipeline**. C'est un **DAG** — un graphe orienté sans cycle — qui enchaîne dans le bon ordre : **extraction → contrôle de fraîcheur → snapshot historique → transformation dbt → tests**.

Chaque nuit, tout se rafraîchit automatiquement, sans intervention. Et je **supervise** l'état de chaque exécution ici. »

### 2.5 Les dashboards Superset (1 min)

`[🖥️ Parcours les 5 dashboards Superset]`

« La restitution se fait dans **Apache Superset**, avec **5 tableaux de bord interactifs** :
- **Vue d'ensemble RH** — les KPIs globaux, les effectifs, le turnover par département ;
- **Recrutement** — l'entonnoir des candidatures, les scores IA, les délais ;
- **Compétences & Talents** — la heatmap compétences × département, l'analyse des écarts ;
- **Démographie** — la pyramide des âges, la répartition par contrat ;
- et le dashboard **Analyses ML** que je vais détailler.

`[🖥️ Montre le RBAC / RLS dans Superset]`

J'ai aussi ajouté la **gouvernance** : un contrôle d'accès par rôles (**RBAC**) et surtout le **Row-Level Security** — un manager ne voit que **les données de son périmètre**, filtrées automatiquement ligne par ligne. »

**Transition :**
« Cette base décisionnelle fiable m'a permis d'aller plus loin : passer de l'analyse **descriptive** — ce qui s'est passé — à l'analyse **prédictive** — ce qui va se passer. C'est ma partie Machine Learning. »

---

## 3. PARTIE MACHINE LEARNING (3–4 min)

### 3.1 Les modèles (45 s)

`[🖥️ Dashboard Analyses ML]`

« J'ai développé **quatre analyses** de Machine Learning, en Python, qui lisent l'entrepôt et réécrivent leurs résultats dans des tables `ml_`, affichées ici :
1. la **prédiction du turnover** — qui risque de partir — avec un **Random Forest** ;
2. la **segmentation des employés** — avec **K-Means** ;
3. la **détection des hauts potentiels** ;
4. et la **prévision des embauches** — avec **Prophet**.

Le tout est suivi dans **MLflow** pour tracer les versions et les métriques. »

### 3.2 Le modèle de turnover — l'entraînement (1 min)

« Concentrons-nous sur le modèle phare : la **prédiction du turnover**.

Je pars des données historiques des employés — salaire par rapport à la médiane du département, ancienneté, type de contrat. J'entraîne un **Random Forest**, une forêt de 300 arbres. Comme les départs sont **rares**, j'utilise l'option **class_weight balanced** pour gérer le déséquilibre.

Ensuite, deux étapes importantes :
- je **calibre les probabilités** — pour qu'un « 70 % de risque » veuille **vraiment dire** 70 % ;
- et j'**optimise le seuil de décision** pour privilégier la **fiabilité des alertes**.

Enfin, j'utilise **SHAP** pour **expliquer** chaque prédiction — le premier facteur de départ identifié est le **salaire**. »

### 3.3 Les résultats (1 min)

`[🖥️ Métriques du modèle / MLflow]`

« Les résultats du modèle `model_rf_v4_p70` :
- un **AUC-ROC de 0,88** — le modèle **distingue très bien** un partant d'un fidèle ;
- une **précision de 71 %** — quand il alerte sur un départ, **il a raison 7 fois sur 10** ;
- et une **validation croisée à 0,84**, très proche du test, ce qui prouve que le modèle est **stable et ne surapprend pas**.

`[🖥️ éventuellement montrer précision/rappel]`

J'ai fait un **choix métier assumé** : privilégier la **précision** plutôt que le rappel. Pourquoi ? En RH, si le modèle crie « au loup » sur trop d'employés fidèles, le RH perd confiance. Je préfère **alerter moins, mais juste**. »

> 💡 Si le prof ML attaque « accuracy 0,886 c'est facile » : « L'accuracy seule est trompeuse car les départs sont rares — c'est pourquoi je m'appuie sur l'AUC-PR à 0,70 et la précision à 0,71, qui mesurent la vraie performance sur la classe rare. »

### 3.4 La valeur métier (30 s)

« La valeur ajoutée finale : le RH passe d'une posture **réactive** — constater les départs — à une posture **proactive** — les **anticiper** et agir avec un **plan de rétention** pour les talents clés à risque. »

---

## 4. CONCLUSION (1 min)

« Pour conclure, j'ai livré une plateforme SIRH **complète et cohérente de bout en bout** :
- une application **microservices sécurisée** et un recrutement **enrichi par l'IA** ;
- une chaîne décisionnelle **industrialisée** — dbt, entrepôt en étoile historisé, Airflow, Superset ;
- et une couche **prédictive** qui transforme la donnée en **anticipation**.

Le résultat est un outil **unique, scalable et piloté par la donnée**, à disposition des équipes RH d'ARABSOFT.

**Perspectives** : valider le modèle de turnover sur des données réelles, migrer le stockage des CV vers un stockage objet, et industrialiser le déploiement avec la conteneurisation.

Je vous remercie pour votre attention, et je suis prête à répondre à vos questions. »

---

## 📌 MÉMO ANTI-STRESS (à garder sous les yeux)

- **Toujours** : définition courte → puis image/démo. Jamais l'inverse.
- **Matching** = algorithme déterministe (PAS de l'IA). Gemini = extraction seulement.
- **Accuracy 0,886** = piège → enchaîne AUC-ROC 0,88 / précision 0,71.
- **Overfitting** → « CV 0,84 ≈ test 0,88, donc stable ».
- **Données turnover synthétiques** → assume + « à revalider sur données réelles ».
- Si tu bugs à l'écran : « Le temps que ça charge, je vous explique… » et continue à parler.
- Si tu ne sais pas : « Bonne question, je ne l'ai pas traité dans ce périmètre, mais l'approche serait… ».