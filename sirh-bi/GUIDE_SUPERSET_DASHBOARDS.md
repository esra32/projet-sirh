# GUIDE COMPLET — DASHBOARDS SUPERSET SIRH
## Cahier des Charges 1.4 — Visualisations et Tableaux de Bord
### Step by Step · Tous les détails · Impressionner le jury

---

## AVANT DE COMMENCER — CHECKLIST

### Datasets à créer (Datasets → + Dataset → SIRH DWH → sirh_dwh)

| Dataset | Table/Vue | Utilisé dans |
|---|---|---|
| kpi_rh | `kpi_rh` | Dashboard 1, 2, 4 |
| vw_effectifs_mensuels | `vw_effectifs_mensuels` | Dashboard 1, 4 |
| fait_recrutement | `fait_recrutement` | Dashboard 2 |
| fait_effectifs | `fait_effectifs` | Dashboard 4 |
| fait_competences | `fait_competences` | Dashboard 3 |
| fait_mobilite | `fait_mobilite` | Dashboard 1 |

**Créer les 6 datasets avant de commencer les charts.**

---

## CONFIGURATION GLOBALE — THÈME

Avant tout, configure un thème sombre professionnel :
1. Settings → Appearance → **Dark mode**
2. Donne un titre propre à chaque dashboard
3. Ajoute une description à chaque dashboard

---

# DASHBOARD 1 — VUE D'ENSEMBLE RH
## CDC : "Vue d'ensemble RH (effectifs, turnover, mobilité)"

**Nom du dashboard :** `01 - Vue d'ensemble RH`
**Dataset principal :** `kpi_rh`, `vw_effectifs_mensuels`, `fait_mobilite`

---

### CHART 1.1 — Big Number : Total Employés
**Type :** Big Number with Trendline
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| METRIC | `nb_employes` → SUM |
| SUBHEADER | `Employés actifs` |
| TIME GRAIN | (vide) |

**Nom :** `Total Employés`
**Pourquoi impressionnant :** Chiffre énorme en haut du dashboard, premier chiffre que le jury voit.

---

### CHART 1.2 — Big Number : Taux de Mobilité
**Type :** Big Number with Trendline
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| METRIC | `taux_mobilite_pct` → AVG |
| SUBHEADER | `Candidats internes recrutés / Effectif total` |

**Nom :** `Taux Mobilité`
**Modification Superset directe :** dashboard `VUE D'ENSEMBLE RH` / chart `Taux Mobilité` (id 70) / dataset `kpi_rh` : changer le champ **Subheader** dans l'éditeur du chart. La metric reste `ROUND(SUM(nb_mobilites) * 100.0 / NULLIF(SUM(nb_employes), 0), 1)` avec le label `Taux mobilité interne %`.

---

### CHART 1.3 — Big Number : Ancienneté Moyenne
**Type :** Big Number with Trendline
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| METRIC | `anciennete_moy_mois` → AVG |
| SUBHEADER | `Mois d'ancienneté moyenne` |

**Nom :** `Ancienneté Moyenne`

---

### CHART 1.4 — Évolution des Effectifs (graphique temporel)
**Type :** Area Chart
**Dataset :** `vw_effectifs_mensuels`
**CDC couvert :** "Graphiques temporels des tendances"

| Champ | Valeur |
|---|---|
| X-AXIS | `nom_mois` |
| METRICS | `effectif_cumule_fin_mois` → SUM |
| SERIES | `annee` |
| COLOR SCHEME | `Superset Colors` |

**Options avancées :**
- Cocher **Show area** → dégradé sous la courbe
- Cocher **Show markers**
- **OPACITY** → 0.4

**Nom :** `Évolution Effectifs Mensuelle`
**Pourquoi impressionnant :** Montre la croissance de l'entreprise dans le temps.

---

### CHART 1.5 — Répartition Effectifs par Département (Treemap)
**Type :** Treemap
**Dataset :** `kpi_rh`
**CDC couvert :** "Arbres hiérarchiques de l'organisation"

| Champ | Valeur |
|---|---|
| DIMENSIONS | `departement` |
| METRIC | `nb_employes` → SUM |

**Nom :** `Répartition par Département`
**Pourquoi impressionnant :** Visualisation hiérarchique moderne, bien mieux qu'un simple camembert.

---

### CHART 1.6 — Mobilité par Département (Bar Chart horizontal)
**Type :** Bar Chart (horizontal)
**Dataset :** `kpi_rh`
**CDC couvert :** "Rapports de mobilité par département"

| Champ | Valeur |
|---|---|
| X-AXIS | `departement` |
| METRICS | `nb_mobilites` → SUM |
| ORIENTATION | Horizontal |
| COLOR SCHEME | `Google Category 10c` |

**Nom :** `Mobilité par Département`

---

### CHART 1.7 — Croissance Mensuelle par Type Contrat (Mixed Chart)
**Type :** Mixed Chart (Line + Bar)
**Dataset :** `vw_effectifs_mensuels`

| Champ | Valeur |
|---|---|
| X-AXIS | `nom_mois` |
| METRICS (Bar) | `nb_embauches_mois` → SUM |
| METRICS (Line) | `effectif_cumule_fin_mois` → SUM |

**Nom :** `Embauches vs Effectif Cumulé`
**Pourquoi impressionnant :** Deux métriques sur le même graphique = analyse croisée.

---

### CHART 1.8 — Répartition Contrats CDI/CDD/Stage (Donut)
**Type :** Pie Chart
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| DIMENSIONS | `departement` |
| METRIC | `nb_cdi` → SUM |
| DONUT | Cocher |
| SHOW LABELS | Cocher |

**Nom :** `Répartition Contrats`

---

### DISPOSITION DASHBOARD 1

```
┌─────────────────────────────────────────────────────┐
│  [Total Employés]  [Taux Mobilité]  [Ancienneté]    │  ← Big Numbers
├──────────────────────────┬──────────────────────────┤
│  Évolution Effectifs     │  Répartition Département  │  ← Area + Treemap
│  (Area Chart)            │  (Treemap)                │
├──────────────────────────┼──────────────────────────┤
│  Mobilité par Dép.       │  Embauches vs Effectif    │  ← Bars + Mixed
│  (Bar horizontal)        │  (Mixed Chart)            │
├──────────────────────────┴──────────────────────────┤
│              Répartition Contrats (Donut)            │
└─────────────────────────────────────────────────────┘
```

---

### FILTRES DASHBOARD 1

Dans Edit Dashboard → Filtres (entonnoir) → + Add Filter :

**Filtre 1 — Département**
- Type : Value
- Dataset : `kpi_rh`
- Colonne : `departement`
- Nom : `Département`
- Appliquer à : tous les charts

**Filtre 2 — Année**
- Type : Value
- Dataset : `vw_effectifs_mensuels`
- Colonne : `annee`
- Nom : `Année`

---

# DASHBOARD 2 — ANALYSE RECRUTEMENT
## CDC : "Analyse du recrutement interne (postes publiés, candidatures, délais)"

**Nom du dashboard :** `02 - Analyse Recrutement`
**Dataset principal :** `fait_recrutement`, `kpi_rh`

---

### CHART 2.1 — Big Number : Total Candidatures
**Type :** Big Number with Trendline
**Dataset :** `fait_recrutement`

| Champ | Valeur |
|---|---|
| METRIC | `id_candidature_nk` → COUNT |
| SUBHEADER | `Candidatures totales` |

**Nom :** `Total Candidatures`

---

### CHART 2.2 — Big Number : Score Moyen IA
**Type :** Big Number with Trendline
**Dataset :** `fait_recrutement`

| Champ | Valeur |
|---|---|
| METRIC | `match_score` → AVG |
| SUBHEADER | `Score matching IA moyen` |

**Nom :** `Score Moyen IA`

---

### CHART 2.3 — Big Number : Taux Acceptation
**Type :** Big Number with Trendline
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| METRIC | `taux_acceptation_pct` → AVG |
| SUBHEADER | `Taux d'acceptation moyen` |

**Nom :** `Taux Acceptation`

---

### CHART 2.4 — Score IA vs Délai (Scatter Plot)
**Type :** Scatter Plot
**Dataset :** `fait_recrutement`
**CDC couvert :** "Analyse des corrélations"

| Champ | Valeur |
|---|---|
| X-AXIS | `jours_depuis_candidature` → AVG |
| Y-AXIS | `match_score` → AVG |
| DIMENSIONS | `departement` |
| SIZE | `id_candidature_nk` → COUNT |

**Nom :** `Score IA vs Délai de Traitement`
**Pourquoi impressionnant :** Montre la corrélation entre la vitesse de traitement et la qualité des candidats. Très analytique.

---

### CHART 2.5 — Distribution des Scores (Histogram)
**Type :** Histogram
**Dataset :** `fait_recrutement`

| Champ | Valeur |
|---|---|
| X-AXIS | `match_score` |
| BINS (tranches) | `10` |

**Nom :** `Distribution Scores IA`
**Pourquoi impressionnant :** Montre si les candidats sont globalement bons ou mauvais — analyse statistique.

---

### CHART 2.6 — Candidatures par Département (Bar Chart)
**Type :** Bar Chart
**Dataset :** `fait_recrutement`

| Champ | Valeur |
|---|---|
| X-AXIS | `departement` |
| METRICS | `id_candidature_nk` → COUNT |
| COLOR SCHEME | `Google Category 10c` |

**Nom :** `Candidatures par Département`

---

### CHART 2.7 — Catégories de Score (Pie Chart)
**Type :** Pie Chart
**Dataset :** `fait_recrutement`
**CDC couvert :** "Analyse des tendances de recrutement"

| Champ | Valeur |
|---|---|
| DIMENSIONS | `categorie_score` |
| METRIC | `id_candidature_nk` → COUNT |
| DONUT | Cocher |
| SHOW LABELS | Cocher |

**Nom :** `Répartition Catégories Score`

---

### CHART 2.8 — Score Moyen par Département (Bar horizontal)
**Type :** Bar Chart (horizontal)
**Dataset :** `fait_recrutement`

| Champ | Valeur |
|---|---|
| X-AXIS | `departement` |
| METRICS | `match_score` → AVG |
| SORT DESCENDING | Cocher |

**Nom :** `Score Moyen par Département`

---

### CHART 2.9 — Taux Acceptation par Département (Gauge)
**Type :** Gauge Chart
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| METRIC | `taux_acceptation_pct` → AVG |
| MIN | `0` |
| MAX | `100` |

**Nom :** `Gauge Taux Acceptation`
**Pourquoi impressionnant :** Jauge visuelle — très professionnel pour une soutenance.

---

### DISPOSITION DASHBOARD 2

```
┌─────────────────────────────────────────────────────┐
│  [Total Candid.]  [Score Moyen IA]  [Taux Accept.]  │  ← Big Numbers
├──────────────────────────┬──────────────────────────┤
│  Score vs Délai          │  Distribution Scores      │  ← Scatter + Histo
│  (Scatter Plot)          │  (Histogram)              │
├──────────────────────────┼──────────────────────────┤
│  Candidatures/Dép.       │  Catégories Score         │  ← Bar + Donut
│  (Bar Chart)             │  (Pie Chart)              │
├──────────────────────────┼──────────────────────────┤
│  Score Moyen/Dép.        │  Gauge Taux Acceptation   │
│  (Bar horizontal)        │  (Gauge)                  │
└─────────────────────────────────────────────────────┘
```

---

### FILTRES DASHBOARD 2

**Filtre 1 — Département**
- Dataset : `fait_recrutement`
- Colonne : `departement`

**Filtre 2 — Catégorie Score**
- Dataset : `fait_recrutement`
- Colonne : `categorie_score`

---

# DASHBOARD 3 — ANALYSE COMPÉTENCES
## CDC : "Analyse des compétences et gaps de talents"

**Nom du dashboard :** `03 - Compétences & Talents`
**Dataset principal :** `fait_competences`

---

### CHART 3.1 — Big Number : Total Compétences
**Type :** Big Number
**Dataset :** `fait_competences`

| Champ | Valeur |
|---|---|
| METRIC | `competence` → COUNT DISTINCT |
| SUBHEADER | `Compétences distinctes` |

**Nom :** `Total Compétences`

---

### CHART 3.2 — Top Compétences Demandées (Bar horizontal)
**Type :** Bar Chart (horizontal)
**Dataset :** `fait_competences`
**CDC couvert :** "Analyse des compétences et gaps"

| Champ | Valeur |
|---|---|
| X-AXIS | `competence` |
| METRICS | `nb_candidats` → SUM |
| SORT DESCENDING | Cocher |
| NOMBRE DE LIGNES | `15` |
| ORIENTATION | Horizontal |

**Nom :** `Top 15 Compétences Demandées`
**Pourquoi impressionnant :** Montre les compétences clés de l'entreprise en un coup d'œil.

---

### CHART 3.3 — Heatmap Compétences × Département
**Type :** Heatmap
**Dataset :** `fait_competences`
**CDC couvert :** "Heat maps de compétences par département"

| Champ | Valeur |
|---|---|
| X-AXIS | `departement_offre` |
| Y-AXIS | `competence` |
| METRIC | `nb_candidats` → SUM |
| COLOR SCHEME | `Reds` |
| NORMALIZE ACROSS | `heatmap` |

**Nom :** `Heatmap Compétences par Département`
**Pourquoi impressionnant :** C'est le chart le plus avancé du projet — exactement ce que demande le CDC. Le jury va adorer.

---

### CHART 3.4 — Compétences par Offre (Bubble Chart / Scatter)
**Type :** Scatter Plot
**Dataset :** `fait_competences`
**CDC couvert :** "Identification des high potentials"

| Champ | Valeur |
|---|---|
| X-AXIS | `nb_candidats` → SUM |
| Y-AXIS | `competence` → COUNT DISTINCT |
| DIMENSIONS | `departement_offre` |
| SIZE | `nb_candidats` → SUM |

**Nom :** `Compétences vs Candidats par Département`

---

### CHART 3.5 — Répartition Compétences (Treemap)
**Type :** Treemap
**Dataset :** `fait_competences`

| Champ | Valeur |
|---|---|
| DIMENSIONS | `competence` |
| METRIC | `nb_candidats` → SUM |

**Nom :** `Carte Compétences`
**Pourquoi impressionnant :** Alternative moderne à la carte géographique — arbre hiérarchique des compétences.

---

### CHART 3.6 — Sunburst : Organisation Hiérarchique
**Type :** Sunburst Chart
**Dataset :** `fait_competences`
**CDC couvert :** "Arbres hiérarchiques de l'organisation"

| Champ | Valeur |
|---|---|
| COLUMNS | `departement_offre`, `competence` |
| METRIC | `nb_candidats` → SUM |

**Nom :** `Hiérarchie Département → Compétence`
**Pourquoi impressionnant :** Remplace avantageusement la carte géographique. Montre l'organisation en cercles concentriques.

---

### DISPOSITION DASHBOARD 3

```
┌─────────────────────────────────────────────────────┐
│         [Total Compétences]  [autres KPIs]          │
├──────────────────────────┬──────────────────────────┤
│  Top 15 Compétences      │  Heatmap Compétences      │
│  (Bar horizontal)        │  (Heatmap)                │
├──────────────────────────┼──────────────────────────┤
│  Bubble Chart            │  Sunburst Hiérarchique    │
│  (Scatter)               │  (Sunburst)               │
├──────────────────────────┴──────────────────────────┤
│              Carte Compétences (Treemap)             │
└─────────────────────────────────────────────────────┘
```

---

### FILTRES DASHBOARD 3

**Filtre 1 — Département**
- Dataset : `fait_competences`
- Colonne : `departement_offre`

**Filtre 2 — Compétence**
- Dataset : `fait_competences`
- Colonne : `competence`

---

# DASHBOARD 4 — ANALYSE DÉMOGRAPHIQUE
## CDC : "Analyse démographique des employés"

**Nom du dashboard :** `04 - Démographie RH`
**Dataset principal :** `fait_effectifs`, `kpi_rh`

---

### CHART 4.1 — Big Number : CDI
**Type :** Big Number
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| METRIC | `nb_cdi` → SUM |
| SUBHEADER | `Employés en CDI` |

**Nom :** `Total CDI`

---

### CHART 4.2 — Big Number : CDD
**Type :** Big Number
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| METRIC | `nb_cdd` → SUM |
| SUBHEADER | `Employés en CDD` |

**Nom :** `Total CDD`

---

### CHART 4.3 — Big Number : Stagiaires
**Type :** Big Number
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| METRIC | `nb_stage` → SUM |
| SUBHEADER | `Stagiaires` |

**Nom :** `Total Stagiaires`

---

### CHART 4.4 — Distribution Ancienneté (Histogram)
**Type :** Histogram
**Dataset :** `fait_effectifs`
**CDC couvert :** "Analyse démographique"

| Champ | Valeur |
|---|---|
| X-AXIS | `anciennete_mois` |
| BINS | `12` |

**Nom :** `Distribution Ancienneté`
**Pourquoi impressionnant :** Montre la pyramide d'ancienneté — info RH critique.

---

### CHART 4.5 — Embauches par Année (Area Chart)
**Type :** Area Chart
**Dataset :** `fait_effectifs`
**CDC couvert :** "Graphiques temporels des tendances"

| Champ | Valeur |
|---|---|
| X-AXIS | `annee_embauche` |
| METRICS | `id_employe_nk` → COUNT |
| COLOR SCHEME | `Superset Colors` |

**Options :**
- Cocher **Show area** avec opacity 0.4
- Cocher **Show markers**

**Nom :** `Évolution Embauches par Année`

---

### CHART 4.6 — Répartition par Type Contrat (Donut)
**Type :** Pie Chart (Donut)
**Dataset :** `fait_effectifs`

| Champ | Valeur |
|---|---|
| DIMENSIONS | `type_contrat` |
| METRIC | `id_employe_nk` → COUNT |
| DONUT | Cocher |
| SHOW LABELS | Cocher |
| SHOW LEGEND | Cocher |

**Nom :** `Répartition CDI / CDD / Stage`

---

### CHART 4.7 — Ancienneté Moyenne par Département (Bar)
**Type :** Bar Chart
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| X-AXIS | `departement` |
| METRICS | `anciennete_moy_mois` → AVG |
| COLOR SCHEME | `Superset Colors` |
| SORT DESCENDING | Cocher |

**Nom :** `Ancienneté Moyenne par Département`

---

### CHART 4.8 — Effectifs par Département et Contrat (Stacked Bar)
**Type :** Bar Chart (Stacked)
**Dataset :** `kpi_rh`

| Champ | Valeur |
|---|---|
| X-AXIS | `departement` |
| METRICS | `nb_cdi` → SUM, `nb_cdd` → SUM, `nb_stage` → SUM |
| STACKED | Cocher |

**Nom :** `Effectifs Empilés par Département`
**Pourquoi impressionnant :** 3 métriques empilées = vue complète de la composition RH.

---

### DISPOSITION DASHBOARD 4

```
┌─────────────────────────────────────────────────────┐
│     [Total CDI]      [Total CDD]    [Stagiaires]    │  ← Big Numbers
├──────────────────────────┬──────────────────────────┤
│  Distribution Ancienneté │  Embauches par Année      │  ← Histo + Area
│  (Histogram)             │  (Area Chart)             │
├──────────────────────────┼──────────────────────────┤
│  Répartition Contrats    │  Ancienneté/Département   │  ← Donut + Bar
│  (Donut)                 │  (Bar Chart)              │
├──────────────────────────┴──────────────────────────┤
│         Effectifs Empilés (Stacked Bar Chart)        │
└─────────────────────────────────────────────────────┘
```

---

### FILTRES DASHBOARD 4

**Filtre 1 — Type Contrat**
- Dataset : `fait_effectifs`
- Colonne : `type_contrat`

**Filtre 2 — Département**
- Dataset : `kpi_rh`
- Colonne : `departement`

---

# TOUCHES AVANCÉES POUR IMPRESSIONNER LE JURY

## 1. Cross-filtering (filtrage croisé)
Dans chaque dashboard → Edit → **Enable Cross Filters**
→ Cliquer sur un département dans un chart filtre TOUS les autres charts automatiquement.
→ Exactement comme Power BI. Le jury sera impressionné.

## 2. Titres et descriptions
Pour chaque chart → **Edit** → ajouter une description :
```
Ex: "Ce scatter plot montre la corrélation entre le délai de traitement 
des candidatures et le score IA attribué par le système de matching."
```

## 3. Couleurs cohérentes
Utiliser **le même color scheme** dans tous les dashboards :
- `Google Category 10c` pour les catégories
- `Reds` pour les heatmaps
- `Superset Colors` pour les séries temporelles

## 4. Markdown sur le dashboard
Dans Edit Dashboard → **+ Markdown** :
```markdown
## Dashboard SIRH — Vue d'ensemble RH
Analyse des effectifs, de la mobilité et des contrats par département.
Données mises à jour quotidiennement via le pipeline dbt/Airflow.
```

## 5. Paramètres de dashboard
- **Auto-refresh** : 10 minutes
- **Filter Scoping** : restreindre les filtres par section

---

# RÉPONSES AUX QUESTIONS JURY SUR LES DASHBOARDS

**Q : Pourquoi Superset et pas Power BI ?**
R : "Apache Superset est open-source, déployable on-premise, et s'intègre nativement avec notre stack Python/dbt/Airflow. Power BI nécessite une licence Microsoft et un déploiement cloud. Dans un contexte SIRH avec des données RH sensibles, garder les données on-premise est un avantage sécurité."

**Q : Comment fonctionne le cross-filtering ?**
R : "Superset implémente le cross-filtering natif — cliquer sur 'Informatique' dans le Treemap filtre automatiquement tous les charts du dashboard sur ce département. C'est équivalent aux slicers Power BI, mais basé sur des requêtes SQL dynamiques vers MySQL."

**Q : Comment sont calculés les KPIs ?**
R : "Les KPIs sont calculés dans la vue `kpi_rh` construite par dbt. Par exemple, le taux d'acceptation = nombre de candidatures acceptées / nombre total de candidatures × 100, calculé par département via un GROUP BY. Superset lit cette vue directement — pas de calcul dans le dashboard."

**Q : Pourquoi pas de carte géographique ?**
R : "Notre SIRH est un système mono-site — les employés n'ont pas d'attribut géographique (ville, région). La carte géographique est remplacée par le Sunburst Chart qui montre la hiérarchie Département → Compétence, plus pertinente pour un SIRH. Si des données géographiques étaient disponibles, Superset supporte les cartes choroplèthes nativement."

**Q : Comment garantissez-vous la fraîcheur des données ?**
R : "Le pipeline dbt est planifié via Airflow. Chaque nuit, extract_staging.py récupère les données de l'application Spring Boot, dbt transforme et charge le DWH, et les dashboards Superset lisent les données fraîches au prochain refresh (auto-refresh configuré à 10 minutes)."

---

# ORDRE DE DÉMONSTRATION RECOMMANDÉ

## Séquence soutenance (15 minutes dashboards)

1. **Dashboard 1** (5 min) — Vue d'ensemble RH
   - Montrer les Big Numbers en premier
   - Interagir avec le filtre département → les charts changent en direct
   - Pointer l'Area Chart : "voici la croissance de l'entreprise depuis 2018"

2. **Dashboard 2** (4 min) — Recrutement
   - Montrer le Scatter Plot : "corrélation score IA vs délai de traitement"
   - Montrer le Gauge : "taux d'acceptation global"
   - Filtrer sur une catégorie de score → impact sur tous les charts

3. **Dashboard 3** (3 min) — Compétences
   - Montrer la Heatmap : "intensité des compétences par département"
   - Montrer le Sunburst : "hiérarchie organisationnelle"

4. **Dashboard 4** (3 min) — Démographie
   - Montrer l'Histogram ancienneté : "pyramide d'ancienneté"
   - Montrer le Stacked Bar : "composition CDI/CDD/Stage par département"

---

# RÉCAPITULATIF — CE QUE COUVRE CHAQUE POINT DU CDC

| Point CDC | Dashboard | Charts |
|---|---|---|
| Vue d'ensemble RH | Dashboard 1 | Big Numbers, Area, Treemap |
| Effectifs & turnover | Dashboard 1 | Évolution mensuelle, Mobilité |
| Recrutement (postes, candidatures) | Dashboard 2 | Bar, Scatter, Histogram |
| Délais recrutement | Dashboard 2 | Scatter Plot (délai vs score) |
| Compétences & gaps | Dashboard 3 | Heatmap, Bar horizontal |
| Analyse démographique | Dashboard 4 | Histogram, Donut, Area |
| Graphiques temporels | Dashboard 1 & 4 | Area Charts |
| Heat maps compétences | Dashboard 3 | Heatmap ✅ |
| Arbres hiérarchiques | Dashboard 3 | Sunburst Chart ✅ |
| Tableaux géographiques | Dashboard 3 | Sunburst (remplacement justifié) |
| Mobilité par département | Dashboard 1 | Bar horizontal |
| Tendances recrutement | Dashboard 2 | Scatter, Histogram |
| Analyse prédictive | → Partie ML (1.5) | À faire après dashboards |
