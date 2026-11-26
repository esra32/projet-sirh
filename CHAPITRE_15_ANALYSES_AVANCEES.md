# CHAPITRE 1.5 — Analyses Avancées & Machine Learning RH
## Système d'Information des Ressources Humaines — Partie BI / ML
### Projet de Fin d'Études 2026

---

## Introduction

La partie Analyses Avancées constitue le cœur décisionnel du projet SIRH. Elle dépasse le simple reporting pour apporter une **intelligence prédictive et prescriptive** : au lieu de décrire ce qui s'est passé, elle prédit ce qui va se passer et recommande des actions concrètes aux équipes RH.

Six modèles de Machine Learning ont été développés, chacun répondant à une problématique RH précise. Ces modèles s'exécutent automatiquement chaque nuit via Apache Airflow, après que le pipeline ETL/dbt a rafraîchi le Data Warehouse.

**Architecture ML globale** :

```
sirh_dwh (Data Warehouse)
        │
        ├─► ML-1 : Prédiction Turnover     → ml_turnover_risk
        ├─► ML-2 : Segmentation Employés   → ml_employee_segments
        ├─► ML-3 : High Potentials         → ml_high_potentials
        ├─► ML-4 : Prévision Embauches     → ml_forecast_embauches
        ├─► ML-5 : Corrélations RH         → ml_correlations
        └─► ML-6 : Analyse de Rétention    → ml_retention_analysis
                │
                ▼
        Apache Superset (Dashboards ML)
```

**Dépendances entre modèles** :

```
ML-1 (Turnover) ──────────────────────────────┐
ML-2 (Segmentation) ──► ML-3 (High Potentials) ├──► ML-6 (Rétention)
                                               │
ML-4 (Forecast) ─── indépendant               │
ML-5 (Corrélations) ─── indépendant           ┘
```

Les modèles ML-1, ML-2 et ML-3 doivent s'exécuter dans cet ordre. ML-4 et ML-5 sont indépendants. ML-6 consolide les résultats de ML-1 et ML-3.

---

## 1.5.1 Analyse des Corrélations (Mobilité vs Performance)

### Objectif

Identifier les **relations statistiques significatives** entre les indicateurs RH : ancienneté, taux de CDI, score de matching recrutement, taux de mobilité, risque de turnover. Cette analyse permet de valider les hypothèses intuitions des managers ("les employés en CDD partent-ils vraiment plus souvent ?") avec des chiffres.

### Méthode — Corrélation de Pearson

Le coefficient de Pearson mesure la corrélation linéaire entre deux variables quantitatives. Sa valeur est comprise entre -1 et +1 :

| Valeur r | Interprétation |
|---|---|
| r > +0.7 | Corrélation forte positive |
| +0.4 < r < +0.7 | Corrélation modérée positive |
| -0.4 < r < +0.4 | Corrélation faible / négligeable |
| -0.7 < r < -0.4 | Corrélation modérée négative |
| r < -0.7 | Corrélation forte négative |

### Implémentation

Le script `ml/correlations.py` fusionne trois sources de données :

```python
# Source 1 : KPIs opérationnels par département (kpi_rh)
df_kpi = read_sql("SELECT * FROM kpi_rh")

# Source 2 : Métriques RH depuis les faits (ancienneté, % CDI)
df_effectifs = read_sql("""
    SELECT departement,
           AVG(anciennete_mois)                              AS anciennete_moy,
           SUM(CASE WHEN type_contrat='CDI' THEN 1 ELSE 0 END)
               * 100.0 / COUNT(*)                            AS pct_cdi,
           COUNT(*)                                          AS nb_employes
    FROM fait_effectifs
    GROUP BY departement
""")

# Source 3 : Risque de turnover prédit (ML-1)
df_turnover = read_sql("""
    SELECT departement, AVG(score_risque) AS risque_turnover_moy
    FROM ml_turnover_risk GROUP BY departement
""")
```

La matrice de corrélations est ensuite calculée avec pandas :

```python
corr_matrix = df[numeric_cols].corr().round(3)

# Extraction des corrélations significatives (|r| > 0.4)
for i in range(len(corr_matrix.columns)):
    for j in range(i + 1, len(corr_matrix.columns)):
        r = corr_matrix.iloc[i, j]
        if abs(r) > 0.4:
            # Force : "forte" si |r|>0.7, "modérée" sinon
            # Direction : "positive" si r>0, "négative" sinon
```

### Résultats et Interprétations

La matrice complète est stockée dans `sirh_dwh.ml_correlations` (toutes les paires de variables). Les corrélations significatives identifiées :

**Corrélations attendues (validées)** :
- **Ancienneté ↔ Profil CDI** : corrélation positive forte — les employés en CDI restent plus longtemps, ce qui confirme l'hypothèse de fidélisation par le type de contrat
- **Ancienneté ↔ Risque de turnover** : corrélation négative modérée — plus un employé est ancien, moins il risque de partir
- **Score de matching ↔ Taux d'acceptation** : corrélation positive forte — les candidats avec un score IA élevé ont plus de chances d'être acceptés

**Corrélation mobilité vs performance** :
La corrélation entre le taux de mobilité interne (`taux_mobilite_pct`) et le score moyen des candidats (`score_moy_candidatures`) révèle une relation positive modérée. Les départements avec des candidats de meilleure qualité tendent à avoir plus de mouvements internes — interprétation : les employés performants sont davantage sollicités en mobilité.

### Structure de la Table de Sortie

```sql
-- ml_correlations : matrice complète (n_variables²)
CREATE TABLE ml_correlations (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    variable_1   VARCHAR(100),   -- ex: 'anciennete_moy'
    variable_2   VARCHAR(100),   -- ex: 'risque_turnover_moy'
    correlation  DECIMAL(6,3),   -- valeur Pearson [-1, +1]
    generated_at DATETIME
)
```

**Visualisation Superset** : Heatmap de corrélations — chaque cellule est colorée du rouge (corrélation négative) au vert (corrélation positive), avec la valeur numérique affichée.

---

## 1.5.2 Segmentation des Employés (K-Means Clustering)

### Objectif

Regrouper automatiquement les 1 100+ employés en **segments homogènes** selon leur profil RH (ancienneté, type de contrat, fidélisation). Ces segments permettent d'adapter les politiques RH à chaque population plutôt qu'une approche uniforme.

### Méthode — K-Means Clustering

K-Means est un algorithme de clustering non supervisé. Il partitionne les données en k groupes en minimisant la variance intra-cluster. Aucune étiquette préexistante n'est requise — le modèle découvre lui-même les groupes naturels dans les données.

**Algorithme** :
1. Initialiser k centroïdes aléatoirement
2. Assigner chaque employé au centroïde le plus proche (distance euclidienne)
3. Recalculer les centroïdes comme moyenne du cluster
4. Répéter jusqu'à convergence

### Choix du Nombre Optimal de Clusters

Le nombre k n'est pas fixé à l'avance. Le script teste automatiquement k de 2 à 7 et sélectionne le k qui maximise le **score silhouette** :

```python
inertias    = []
silhouettes = []

for k in range(2, 8):
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(X_scaled)
    inertias.append(km.inertia_)
    silhouettes.append(silhouette_score(X_scaled, km.labels_))

best_k = K_range[np.argmax(silhouettes)]
# Résultat : k=5, silhouette = 0.544
```

Le **score silhouette** mesure la cohésion des clusters : 1.0 = clusters parfaitement séparés, 0.0 = clusters qui se chevauchent. Notre score de **0.544** indique des clusters bien distincts.

### Features Utilisées

```python
# 3 variables après normalisation StandardScaler
FEATURES = ['anciennete_mois', 'contrat_enc', 'profil_enc']

# StandardScaler obligatoire : K-Means est sensible aux échelles
# (ancienneté en mois = 0-120, contrat_enc = 0-4)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
```

### Labellisation Automatique des Clusters

Après clustering, chaque cluster reçoit un label RH métier calculé automatiquement à partir des statistiques du cluster :

```python
def label_cluster(row):
    if row['anciennete_moy'] >= 80 and row['contrat_dominant'] == 'CDI':
        return 'Expert Stable'
    elif row['anciennete_moy'] >= 40:
        return 'Profil Confirmé'
    elif row['anciennete_moy'] >= 15:
        return 'Junior Prometteur'
    else:
        return 'Talent à Risque'
```

### Résultats — 5 Profils RH Identifiés

| Segment | Ancienneté moy. | Contrat dominant | % effectif | Profil RH |
|---|---|---|---|---|
| **Expert Stable** | 90+ mois (7,5 ans) | CDI | ~18% | Pilier de l'entreprise, très faible risque de départ |
| **Profil Confirmé** | 45-80 mois (3-6 ans) | CDI | ~25% | Performant, ancré, légèrement exposé à la concurrence |
| **Junior Prometteur** | 15-44 mois (1-3 ans) | CDI/CDD | ~30% | Fort potentiel de développement, surveillance prioritaire |
| **Talent à Risque** | 0-14 mois (<1 an) | CDD/STAGE | ~20% | Profil instable, risque de turnover élevé |
| **Profil Mixte** | Variable | Variable | ~7% | Cas atypiques, nécessitent analyse individuelle |

### Structure de la Table de Sortie

```sql
CREATE TABLE ml_employee_segments (
    id_employe_nk       VARCHAR(36) PRIMARY KEY,
    nom_complet         VARCHAR(255),
    departement         VARCHAR(100),
    type_contrat        VARCHAR(50),
    anciennete_mois     INT,
    profil_fidelisation VARCHAR(50),
    cluster_id          INT,         -- 0 à k-1
    segment             VARCHAR(50), -- Label lisible
    generated_at        DATETIME
)
```

**Utilisation RH** : Les équipes RH peuvent filtrer par segment dans Superset pour cibler les actions — plan de formation pour les "Junior Prometteurs", entretiens de fidélisation pour les "Profils Confirmés", etc.

---

## 1.5.3 Prévision du Turnover avec Machine Learning

### Objectif

Prédire pour chaque employé actif la **probabilité qu'il quitte l'entreprise** dans les prochains mois. Cette prédiction permet une intervention RH préventive avant que l'employé ne parte.

### Méthode — Random Forest Classifier

Le Random Forest est un algorithme d'ensemble : il entraîne plusieurs centaines d'arbres de décision sur des sous-ensembles aléatoires des données, puis agrège leurs prédictions. Ses avantages pour ce cas d'usage :

- **Robustesse** : résistant au surapprentissage (overfitting)
- **Interprétabilité** : compatible avec SHAP Values pour l'explicabilité
- **Gestion du déséquilibre** : paramètre `class_weight='balanced'` pour compenser le faible nombre de départs

### Données d'Entraînement

```python
# Source : dim_employe (actifs + anciens = tous les employés)
df = read_sql("""
    SELECT id_employe_nk, nom_complet, type_contrat,
           anciennete_mois, departement, profil_fidelisation,
           is_parti   -- 0=actif, 1=parti (variable cible)
    FROM dim_employe
    WHERE anciennete_mois IS NOT NULL
""")

# Distribution observée
# is_parti=0 (actifs)  : ~900 employés
# is_parti=1 (partis)  : ~200 employés  ← déséquilibre géré par class_weight
```

### Features Engineering

```python
# Variables catégorielles encodées numériquement (LabelEncoder)
le_contrat.fit_transform(df['type_contrat'])       # CDI=0, CDD=1, ...
le_dept.fit_transform(df['departement'])           # Numérique par département
le_profil.fit_transform(df['profil_fidelisation']) # Nouveau=0, Expert=4, ...

# 4 features finales
FEATURES = ['anciennete_mois', 'contrat_enc', 'dept_enc', 'profil_enc']
```

### Entraînement et Évaluation

```python
# Séparation 80% train / 20% test, stratifiée sur is_parti
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Modèle Random Forest avec équilibrage des classes
model = RandomForestClassifier(
    n_estimators=100,      # 100 arbres
    max_depth=6,           # Profondeur max (évite overfitting)
    min_samples_leaf=10,   # Chaque feuille = 10 exemples min
    class_weight='balanced',
    random_state=42
)
model.fit(X_train, y_train)
```

**Métriques de performance** :

| Métrique | Valeur | Interprétation |
|---|---|---|
| **AUC-ROC** | **0.574** | Capacité à distinguer partants vs restants |
| Accuracy | ~62% | % de prédictions correctes (peu fiable sur classes déséquilibrées) |
| Recall (partants) | ~55% | 55% des vrais départs sont détectés |
| Precision (partants) | ~45% | 45% des alertes sont de vrais départs |

**Contexte du score AUC-ROC = 0.574** : Un modèle aléatoire donne 0.5, un modèle parfait donne 1.0. Notre score de 0.574 signifie que le modèle est **modérément prédictif**. Ce résultat est typique pour la prédiction de turnover RH car :
- Les données RH disponibles (ancienneté, contrat, département) sont des **proxies** du comportement réel — les vraies causes de départ (satisfaction, offres concurrentes, vie personnelle) ne sont pas mesurées
- Avec des données plus riches (évaluations de performance, enquêtes d'engagement), l'AUC atteint généralement 0.75-0.85

### Explicabilité — SHAP Values

L'un des ajouts les plus importants du projet est l'utilisation de **SHAP (SHapley Additive exPlanations)** pour expliquer individuellement chaque prédiction :

```python
explainer   = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X)

# Impact moyen par feature sur la prédiction
shap_importance = np.abs(shap_values[1]).mean(axis=0)
```

**Importance des features (résultats SHAP)** :

```
Ancienneté (mois)         ████████████████████  0.2843  ← facteur n°1
Type de contrat           ██████████████        0.1921  ← facteur n°2
Profil fidélisation       ████████████          0.1654  ← facteur n°3
Département               █████                 0.0712  ← facteur n°4
```

**Lecture SHAP** : L'ancienneté est le facteur le plus déterminant du turnover. Les employés avec moins de 12 mois d'ancienneté et en CDD/STAGE ont un score de risque de départ structurellement plus élevé.

### Calcul des Scores de Risque en Production

Pour chaque employé **actif** (is_parti=0), le modèle calcule sa probabilité de départ :

```python
scores = model.predict_proba(X_actifs)[:, 1]  # Probabilité classe 1 (départ)
df_actifs['score_risque'] = (scores * 100).round(1)  # En pourcentage 0-100

# Classification en 4 niveaux
def niveau_risque(score):
    if score >= 70:   return 'Critique'   # Action immédiate
    elif score >= 50: return 'Élevé'      # Surveillance prioritaire
    elif score >= 30: return 'Modéré'     # À surveiller
    else:             return 'Faible'     # Stable
```

**Distribution typique des niveaux de risque** :

```
Faible         : ~35% des employés actifs  (score < 30)
Modéré         : ~40% des employés actifs  (30 ≤ score < 50)
Élevé          : ~18% des employés actifs  (50 ≤ score < 70)
Critique       :  ~7% des employés actifs  (score ≥ 70)
```

### Structure de la Table de Sortie

```sql
CREATE TABLE ml_turnover_risk (
    id_employe_nk     VARCHAR(36) PRIMARY KEY,
    nom_complet       VARCHAR(255),
    departement       VARCHAR(100),
    type_contrat      VARCHAR(50),
    anciennete_mois   INT,
    profil_fidelisation VARCHAR(50),
    score_risque      DECIMAL(5,1),  -- 0.0 à 100.0
    niveau_risque     VARCHAR(20),   -- Faible/Modéré/Élevé/Critique
    generated_at      DATETIME
)
```

---

## 1.5.4 Analyse de la Rétention des Talents

### Objectif

L'analyse de rétention va au-delà de la simple prédiction de départ. Elle croise le **risque de départ** (ML-1) avec la **valeur de l'employé** (ML-3) pour identifier les priorités d'action RH. La question clé n'est pas "qui va partir ?" mais "**qui ne doit pas partir et risque de le faire ?**"

### Méthode — Score Composite Multi-Sources

Le modèle ML-6 est un modèle de scoring personnalisé. Il consolide les résultats de ML-1 et ML-3 pour calculer un **score de rétention** sur 100 points :

```
Score Rétention = (100 - Score Risque Turnover)
                + Bonus High Potential
                + Bonus Ancienneté
```

**Détail du calcul** :

```python
def compute_retention_score(row):
    # Base : inverse du risque (si risque=70%, rétention=30)
    base_score = 100 - row['score_risque']

    # Bonus HP : un talent de valeur mérite plus d'efforts de rétention
    hp_bonus = {
        'High Potential':     +10,  # Priorité maximale
        'Potentiel Confirmé': + 5,  # Priorité élevée
        'À Surveiller':       +  0,
        'Standard':           +  0,
    }
    base_score += hp_bonus.get(row['hp_niveau'], 0)

    # Bonus ancienneté : la fidélité passée prédit la fidélité future
    if row['anciennete_mois'] >= 60:   base_score += 8  # 5+ ans
    elif row['anciennete_mois'] >= 36: base_score += 4  # 3-5 ans

    return min(base_score, 100)  # Plafonné à 100
```

### Classification en 4 Niveaux de Rétention

| Niveau | Score | Signification |
|---|---|---|
| **Très fidèle** | ≥ 75 | Risque de départ minimal, employé ancré |
| **Fidèle** | 55-74 | Stable mais peut être sensible aux opportunités |
| **Fragile** | 35-54 | Surveillance recommandée, actions préventives |
| **À risque immédiat** | < 35 | Intervention RH urgente nécessaire |

### Priorités d'Action RH

La croisement HP × Rétention génère une **matrice de priorité** :

```python
def priorite_rh(row):
    if (row['hp_niveau'] == 'High Potential'
            and row['retention_niveau'] in ['Fragile', 'À risque immédiat']):
        return 'URGENT — Talent clé à risque'   # ← Alertes critiques
    elif row['retention_niveau'] == 'À risque immédiat':
        return 'ACTION REQUISE'                 # ← Intervention 48h
    elif row['retention_niveau'] == 'Fragile':
        return 'Surveillance'                   # ← Entretien mensuel
    else:
        return 'Stable'                         # ← Pas d'action spéciale
```

**Matrice HP × Risque de départ** :

```
                    RISQUE FAIBLE   RISQUE MODÉRÉ   RISQUE ÉLEVÉ/CRITIQUE
                   ┌─────────────┬───────────────┬─────────────────────┐
High Potential     │  ✅ Stable  │ 👁 Surveiller │ 🚨 URGENT (alertes) │
Potentiel Confirmé │  ✅ Stable  │ 👁 Surveiller │ ⚠️  Action requise   │
Standard           │  ✅ Stable  │  ✅ Stable    │ ⚠️  Action requise   │
                   └─────────────┴───────────────┴─────────────────────┘
```

### Analyse par Département

Le script calcule également les statistiques de rétention par département :

```python
dept_stats = df.groupby('departement').agg(
    score_retention_moy = ('score_retention', 'mean'),
    nb_a_risque         = ('retention_niveau', lambda x: (x == 'À risque immédiat').sum()),
    nb_hp_risque        = ('priorite_rh',      lambda x: (x == 'URGENT — Talent clé à risque').sum()),
    nb_total            = ('id_employe_nk',    'count')
)
```

Exemple de sortie :

```
Département                         Score Rét.   À risque   HP risque
──────────────────────────────────────────────────────────────────────
Finance & Contrôle de Gestion       45.2         12         3
Informatique                        52.8         8          2
Commercial & Ventes                 58.4         5          1
Ressources Humaines                 67.1         2          0
Marketing & Communication           71.3         1          0
```

### Structure de la Table de Sortie

```sql
CREATE TABLE ml_retention_analysis (
    id_employe_nk    VARCHAR(36) PRIMARY KEY,
    nom_complet      VARCHAR(255),
    departement      VARCHAR(100),
    type_contrat     VARCHAR(50),
    anciennete_mois  INT,
    segment          VARCHAR(50),   -- De ML-2
    hp_niveau        VARCHAR(30),   -- De ML-3
    score_risque     DECIMAL(5,1),  -- De ML-1
    score_retention  DECIMAL(5,1),  -- Calculé ML-6
    retention_niveau VARCHAR(30),   -- Très fidèle/Fidèle/Fragile/À risque immédiat
    priorite_rh      VARCHAR(50),   -- URGENT/ACTION REQUISE/Surveillance/Stable
    generated_at     DATETIME
)
```

---

## 1.5.5 Identification des High Potentials

### Objectif

Identifier automatiquement les employés à **haut potentiel de développement** — ceux qui combinent une forte employabilité, une progression rapide et un alignement avec les besoins stratégiques de l'entreprise. Ces profils doivent être prioritairement retenus et développés.

### Méthode — Scoring Multi-Critères

Le modèle HP ne repose pas sur un algorithme ML supervisé mais sur un **système de scoring expert** basé sur 4 critères pondérés. Cette approche a été choisie car :
1. Pas de données historiques d'étiquetage "HP" disponibles
2. Les critères métier sont connus et actionnables
3. Le score est directement interprétable par les RH

**Formule de scoring (100 points max)** :

```python
def compute_hp_score(row):
    score = 0

    # CRITÈRE 1 — Segment ML-2 (40 pts max)
    # Les "Junior Prometteurs" ont le plus grand potentiel de croissance
    segment_scores = {
        'Junior Prometteur':  40,  # Fort potentiel non encore exploité
        'Profil Confirmé':    25,  # Bon potentiel, déjà reconnu
        'Expert Stable':      15,  # Valeur acquise mais croissance limitée
    }
    score += segment_scores.get(row['segment'], 0)

    # CRITÈRE 2 — Score de matching recrutement (30 pts max)
    # Un score IA élevé à l'embauche prédit un employé de qualité
    score += min(30, row['score_moyen_recrutement'] * 0.3)
    # Exemple : score recrutement 85 → 85 × 0.3 = 25.5 pts

    # CRITÈRE 3 — Ancienneté courte = potentiel de croissance (20 pts max)
    # Les employés récents ont plus de marge de progression
    if row['anciennete_mois'] < 24:    score += 20  # < 2 ans
    elif row['anciennete_mois'] < 48:  score += 12  # 2-4 ans
    elif row['anciennete_mois'] < 72:  score += 6   # 4-6 ans

    # CRITÈRE 4 — Stabilité contractuelle (10 pts)
    if row['type_contrat'] == 'CDI':   score += 10

    return min(score, 100)  # Plafonné à 100
```

### Sources de Données Croisées

ML-3 est le modèle le plus riche en termes de sources de données :

```python
# Source 1 : Segments de ML-2 (segment, ancienneté, type contrat)
df_seg = read_sql("SELECT ... FROM ml_employee_segments")

# Source 2 : Score recrutement moyen (JOIN dim_employe ↔ fait_recrutement par email)
df_rec = read_sql("""
    SELECT de.id_employe_nk, AVG(fr.match_score) AS score_moyen_recrutement
    FROM fait_recrutement fr
    JOIN dim_employe de ON de.email = fr.applicant_email
    GROUP BY de.id_employe_nk
""")

# Source 3 : Compétences en gap critique (compétences rares valorisées)
df_gap = read_sql("""
    SELECT competence FROM fait_gap_competences
    WHERE statut = 'Gap critique'
""")
competences_rares = set(df_gap['competence'].str.lower())
```

### Classification en 4 Niveaux HP

| Niveau HP | Score | Description | % typique |
|---|---|---|---|
| **High Potential** | ≥ 75 | Profil d'exception, priorité de développement absolue | ~10-15% |
| **Potentiel Confirmé** | 55-74 | Fort potentiel identifié, plan de carrière à définir | ~20-25% |
| **À Surveiller** | 35-54 | Potentiel non encore révélé, mérite attention | ~35-40% |
| **Standard** | < 35 | Profil stable sans signal de développement accéléré | ~25-30% |

### Exemple de Calcul Concret

Un employé nommé "Mohammed Karim", Junior Prometteur, avec un score recrutement de 88/100, 18 mois d'ancienneté, contrat CDI :

```
Critère 1 (Segment "Junior Prometteur") : +40 pts
Critère 2 (Score recrutement 88 × 0.3) : +26 pts
Critère 3 (Ancienneté 18 mois < 24)    : +20 pts
Critère 4 (Contrat CDI)                : +10 pts
                                         ────────
Score HP total                          : 96 pts → "High Potential"
```

### Structure de la Table de Sortie

```sql
CREATE TABLE ml_high_potentials (
    id_employe_nk            VARCHAR(36) PRIMARY KEY,
    nom_complet              VARCHAR(255),
    departement              VARCHAR(100),
    type_contrat             VARCHAR(50),
    anciennete_mois          INT,
    segment                  VARCHAR(50),   -- De ML-2
    score_moyen_recrutement  DECIMAL(5,1),  -- Score IA recrutement
    hp_score                 DECIMAL(5,1),  -- Score HP 0-100
    hp_niveau                VARCHAR(30),   -- High Potential/Confirmé/...
    generated_at             DATETIME
)
```

---

## 1.5.6 Prévision des Embauches (Facebook Prophet)

### Objectif

Prévoir le **nombre d'embauches pour les 6 prochains mois** afin d'anticiper les besoins en recrutement, budgéter les ressources RH et planifier les onboardings.

### Méthode — Facebook Prophet

Prophet est un modèle de séries temporelles développé par Meta. Il est particulièrement adapté aux données RH car :
- **Gestion des saisonnalités** : pics de recrutement en janvier (rentrée) et septembre (rentrée académique)
- **Robustesse aux valeurs manquantes** : mois sans embauche ne cassent pas le modèle
- **Intervalles de confiance** : fournit une fourchette basse/haute, pas juste un point

**Modèle de décomposition de Prophet** :
```
y(t) = trend(t) + seasonality(t) + holidays(t) + error(t)
```

### Données d'Entraînement

```python
# Historique mensuel des embauches depuis fait_mobilite
df = read_sql("""
    SELECT annee_snapshot, mois_snapshot,
           SUM(nb_embauches_mois) AS nb_embauches
    FROM fait_mobilite
    GROUP BY annee_snapshot, mois_snapshot
    ORDER BY annee_snapshot, mois_snapshot
""")

# Format Prophet : colonnes 'ds' (date) et 'y' (valeur)
df['ds'] = pd.to_datetime(
    df['annee_snapshot'].astype(str) + '-' +
    df['mois_snapshot'].astype(str).str.zfill(2) + '-01'
)
df['y'] = df['nb_embauches'].astype(float)
```

### Entraînement et Prévision

```python
model = Prophet(
    yearly_seasonality=True,    # Saisonnalité annuelle (rentrées)
    weekly_seasonality=False,   # Pas de saisonnalité hebdomadaire (RH mensuel)
    daily_seasonality=False,
    seasonality_mode='additive',
    interval_width=0.80,        # Intervalle de confiance à 80%
)
model.fit(df_prophet)

# Prévision 6 mois futurs
future   = model.make_future_dataframe(periods=6, freq='MS')  # MS = month start
forecast = model.predict(future)
```

### Exemple de Résultats

```
Mois          Prévu   Min     Max
──────────────────────────────────
2026-07       8       4       12
2026-08       6       3       10
2026-09       11      7       16   ← pic rentrée sept.
2026-10       9       5       13
2026-11       7       3       11
2026-12       5       2       8    ← creux fin d'année
```

**Total prévu sur 6 mois** : ~46 embauches

### Structure de la Table de Sortie

```sql
CREATE TABLE ml_forecast_embauches (
    mois               DATE PRIMARY KEY,   -- Début du mois prévu
    embauches_prevues  INT,                -- Point central
    intervalle_bas     INT,                -- Borne basse (80% IC)
    intervalle_haut    INT,                -- Borne haute (80% IC)
    generated_at       DATETIME
)
```

**Visualisation Superset** : Graphique en courbe avec bande d'incertitude (area chart entre `intervalle_bas` et `intervalle_haut`), accompagné des données historiques pour le contexte.

---

## 1.5.7 Suivi des Expériences ML avec MLflow

### Objectif

MLflow permet de **tracer toutes les expériences ML** : pour chaque exécution, les paramètres, métriques, et modèles sont enregistrés. L'interface web (port 5000) permet de comparer les runs et sélectionner le meilleur modèle.

### Expériences Enregistrées

```python
# Expérience 1 : Turnover Prediction (3 configurations testées)
mlflow.set_experiment("SIRH_Turnover_Prediction")

configs = [
    {'n_estimators': 50,  'max_depth': 4},
    {'n_estimators': 100, 'max_depth': 6},  # ← Meilleur score
    {'n_estimators': 200, 'max_depth': 8},
]

for cfg in configs:
    with mlflow.start_run(run_name=f"RF_n{cfg['n_estimators']}_d{cfg['max_depth']}"):
        # Paramètres loggés
        mlflow.log_param("n_estimators", cfg['n_estimators'])
        mlflow.log_param("max_depth",    cfg['max_depth'])
        mlflow.log_param("class_weight", "balanced")

        # Métriques loggées
        mlflow.log_metric("auc_roc",    auc)
        mlflow.log_metric("accuracy",   accuracy)
        mlflow.log_metric("precision",  precision)
        mlflow.log_metric("recall",     recall)
        mlflow.log_metric("cv_auc_mean", cv_score)

        # Modèle sauvegardé comme artefact
        mlflow.sklearn.log_model(model, "random_forest_turnover")
```

```python
# Expérience 2 : Segmentation K-Means (4 valeurs de k testées)
mlflow.set_experiment("SIRH_Employee_Segmentation")

for k in [3, 4, 5, 6]:
    with mlflow.start_run(run_name=f"KMeans_k{k}"):
        mlflow.log_param("n_clusters", k)
        mlflow.log_metric("silhouette", sil)   # k=5 optimal : 0.544
        mlflow.log_metric("inertia",    km.inertia_)
```

### Interface MLflow — Comparaison des Runs

L'interface accessible à `http://localhost:5000` affiche :

| Run | n_estimators | max_depth | AUC-ROC | F1 | CV AUC |
|---|---|---|---|---|---|
| RF_n50_d4 | 50 | 4 | 0.558 | 0.41 | 0.551 |
| **RF_n100_d6** | **100** | **6** | **0.574** | **0.43** | **0.567** |
| RF_n200_d8 | 200 | 8 | 0.572 | 0.42 | 0.565 |

Le run `RF_n100_d6` est sélectionné comme meilleur modèle (AUC-ROC maximal avec meilleure généralisation en validation croisée).

---

## Résumé — 6 Modèles ML Opérationnels

| # | Modèle | Algorithme | Métrique clé | Table créée | Lignes |
|---|---|---|---|---|---|
| ML-1 | Prévision Turnover | Random Forest + SHAP | AUC = 0.574 | ml_turnover_risk | ~900 |
| ML-2 | Segmentation | K-Means (k=5) | Silhouette = 0.544 | ml_employee_segments | ~900 |
| ML-3 | High Potentials | Scoring multi-critères | HP = 10-15% effectif | ml_high_potentials | ~900 |
| ML-4 | Prévision Embauches | Facebook Prophet | 6 mois horizon | ml_forecast_embauches | 6 |
| ML-5 | Corrélations RH | Pearson | Matrice NxN | ml_correlations | N² |
| ML-6 | Analyse Rétention | Score composite | Alertes URGENT | ml_retention_analysis | ~900 |

### Impact Opérationnel

Ces 6 modèles permettent concrètement aux équipes RH de :

1. **Anticiper les départs** : liste priorisée d'employés à risque avec score et niveau d'urgence
2. **Cibler les politiques RH** : adapter les actions (formation, augmentation, mobilité) par segment
3. **Protéger les talents** : alertes "URGENT" pour les High Potentials à risque de départ
4. **Planifier le recrutement** : budget et ressources ajustés aux prévisions d'embauche sur 6 mois
5. **Comprendre les dynamics** : corrélations qui confirment ou infirment les hypothèses managériales
6. **Justifier les décisions** : SHAP Values expliquent chaque score individuellement (auditabilité)

---

*SIRH BI — Analyses Avancées & Machine Learning — PFE 2026*