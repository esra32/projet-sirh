# GUIDE NAVIGATION & DESIGN AVANCÉ — SUPERSET SIRH
## Complément au GUIDE_SUPERSET_DASHBOARDS.md
## Navigation inter-dashboards · Design professionnel · Template avancé

---

# ÉTAPE 1 — TROUVER LES IDs DE TES DASHBOARDS

Avant tout, tu as besoin des IDs de tes 4 dashboards.

1. Va dans **Dashboards** (menu principal Superset)
2. Clique sur un dashboard
3. Regarde l'URL dans le navigateur :
   `http://localhost:8088/superset/dashboard/3/`
   → L'ID = le chiffre à la fin (ici : **3**)

Note tes IDs ici :
```
01 - Vue d'ensemble RH    → ID : ____
02 - Analyse Recrutement  → ID : ____
03 - Compétences & Talents→ ID : ____
04 - Démographie RH       → ID : ____
```

---

# ÉTAPE 2 — BARRE DE NAVIGATION (à coller dans chaque dashboard)

## Comment ajouter la barre dans un dashboard

1. Ouvre le dashboard → clique **EDIT DASHBOARD** (crayon en haut à droite)
2. Dans le panneau droit → fais glisser **Markdown** tout en **HAUT** du dashboard
3. Double-clique sur le bloc Markdown pour l'éditer
4. Colle le code HTML ci-dessous
5. Clique en dehors pour valider
6. Clique **SAVE** en haut à droite

---

## CODE BARRE NAVIGATION — Dashboard 1 (Vue générale = bouton actif rouge)

> Remplace `ID1` `ID2` `ID3` `ID4` par tes vrais numéros

```html
<div style="background:linear-gradient(90deg,#1a1a2e,#0f3460);padding:14px 20px;border-radius:10px;display:flex;align-items:center;gap:10px;border-bottom:3px solid #e94560;">
<span style="color:#e94560;font-size:18px;font-weight:bold;margin-right:10px;">🏢 SIRH BI</span>
<a href="/superset/dashboard/ID1/" style="background:#e94560;color:white;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;">📊 Vue Générale</a>
<a href="/superset/dashboard/ID2/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">🎯 Recrutement</a>
<a href="/superset/dashboard/ID3/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">💡 Compétences</a>
<a href="/superset/dashboard/ID4/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">👥 Démographie</a>
<span style="margin-left:auto;color:#888;font-size:11px;">🔄 Pipeline dbt · Airflow</span>
</div>
```

---

## CODE BARRE NAVIGATION — Dashboard 2 (Recrutement = bouton actif rouge)

```html
<div style="background:linear-gradient(90deg,#1a1a2e,#0f3460);padding:14px 20px;border-radius:10px;display:flex;align-items:center;gap:10px;border-bottom:3px solid #e94560;">
<span style="color:#e94560;font-size:18px;font-weight:bold;margin-right:10px;">🏢 SIRH BI</span>
<a href="/superset/dashboard/ID1/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">📊 Vue Générale</a>
<a href="/superset/dashboard/ID2/" style="background:#e94560;color:white;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;">🎯 Recrutement</a>
<a href="/superset/dashboard/ID3/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">💡 Compétences</a>
<a href="/superset/dashboard/ID4/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">👥 Démographie</a>
<span style="margin-left:auto;color:#888;font-size:11px;">🔄 Pipeline dbt · Airflow</span>
</div>
```

---

## CODE BARRE NAVIGATION — Dashboard 3 (Compétences = bouton actif rouge)

```html
<div style="background:linear-gradient(90deg,#1a1a2e,#0f3460);padding:14px 20px;border-radius:10px;display:flex;align-items:center;gap:10px;border-bottom:3px solid #e94560;">
<span style="color:#e94560;font-size:18px;font-weight:bold;margin-right:10px;">🏢 SIRH BI</span>
<a href="/superset/dashboard/ID1/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">📊 Vue Générale</a>
<a href="/superset/dashboard/ID2/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">🎯 Recrutement</a>
<a href="/superset/dashboard/ID3/" style="background:#e94560;color:white;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;">💡 Compétences</a>
<a href="/superset/dashboard/ID4/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">👥 Démographie</a>
<span style="margin-left:auto;color:#888;font-size:11px;">🔄 Pipeline dbt · Airflow</span>
</div>
```

---

## CODE BARRE NAVIGATION — Dashboard 4 (Démographie = bouton actif rouge)

```html
<div style="background:linear-gradient(90deg,#1a1a2e,#0f3460);padding:14px 20px;border-radius:10px;display:flex;align-items:center;gap:10px;border-bottom:3px solid #e94560;">
<span style="color:#e94560;font-size:18px;font-weight:bold;margin-right:10px;">🏢 SIRH BI</span>
<a href="/superset/dashboard/ID1/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">📊 Vue Générale</a>
<a href="/superset/dashboard/ID2/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">🎯 Recrutement</a>
<a href="/superset/dashboard/ID3/" style="background:#0f3460;color:#ccc;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;border:1px solid #e94560;">💡 Compétences</a>
<a href="/superset/dashboard/ID4/" style="background:#e94560;color:white;padding:7px 16px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;">👥 Démographie</a>
<span style="margin-left:auto;color:#888;font-size:11px;">🔄 Pipeline dbt · Airflow</span>
</div>
```

---

# ÉTAPE 3 — TITRE DE SECTION (sous la barre de navigation)

Ajoute un **2ème bloc Markdown** juste en dessous de la barre.
Un code différent pour chaque dashboard :

## Titre Dashboard 1
```html
<div style="padding:10px 4px 4px 8px;border-left:4px solid #e94560;margin-top:8px;">
<h2 style="color:white;margin:0;font-size:18px;">📊 Vue d'ensemble RH</h2>
<p style="color:#aaa;margin:2px 0 0 0;font-size:12px;">Effectifs · Mobilité interne · Contrats · Évolution mensuelle</p>
</div>
```

## Titre Dashboard 2
```html
<div style="padding:10px 4px 4px 8px;border-left:4px solid #e94560;margin-top:8px;">
<h2 style="color:white;margin:0;font-size:18px;">🎯 Analyse Recrutement</h2>
<p style="color:#aaa;margin:2px 0 0 0;font-size:12px;">Candidatures · Score IA · Délais de traitement · Taux d'acceptation</p>
</div>
```

## Titre Dashboard 3
```html
<div style="padding:10px 4px 4px 8px;border-left:4px solid #e94560;margin-top:8px;">
<h2 style="color:white;margin:0;font-size:18px;">💡 Compétences & Talents</h2>
<p style="color:#aaa;margin:2px 0 0 0;font-size:12px;">Top compétences · Heatmap · Hiérarchie organisationnelle</p>
</div>
```

## Titre Dashboard 4
```html
<div style="padding:10px 4px 4px 8px;border-left:4px solid #e94560;margin-top:8px;">
<h2 style="color:white;margin:0;font-size:18px;">👥 Démographie RH</h2>
<p style="color:#aaa;margin:2px 0 0 0;font-size:12px;">Types de contrats · Ancienneté · Embauches par année</p>
</div>
```

---

# ÉTAPE 4 — CROSS-FILTERING (filtrage interactif entre charts)

Comme les **slicers Power BI** — cliquer sur un département filtre tous les charts.

**Activer dans chaque dashboard :**
1. Edit Dashboard
2. En haut à droite → **···** (trois points)
3. Cocher **Enable cross filters**
4. **Save**

---

# ÉTAPE 5 — AUTO-REFRESH

1. Dans le dashboard (pas en mode Edit)
2. En haut à droite → **···** → **Set auto-refresh interval**
3. Choisir **10 minutes**

---

# ÉTAPE 6 — ORGANISATION DU LAYOUT (disposition des charts)

## Layout recommandé pour tous les dashboards

```
LIGNE 1 : [Barre navigation - pleine largeur]
LIGNE 2 : [Titre section - pleine largeur]
LIGNE 3 : [BIG NUMBER] [BIG NUMBER] [BIG NUMBER] [BIG NUMBER]
LIGNE 4 : [Chart large 60%          ] [Chart 40%        ]
LIGNE 5 : [Chart 50%        ] [Chart 50%                ]
LIGNE 6 : [Chart pleine largeur                         ]
```

**Comment redimensionner un chart :**
- Edit Dashboard → glisse les bords des charts pour les agrandir/réduire
- Les Big Numbers → petits (1/4 de largeur chacun)
- Charts principaux → grands (1/2 ou 2/3 de largeur)
- Tableaux/Stacked Bar → pleine largeur

---

# ÉTAPE 7 — SÉPARATEURS ET ESPACEMENT

Dans Edit Dashboard → panneau droit → glisse **Divider** entre les sections.
Ajoute des séparateurs visuels entre :
- La barre de navigation et les Big Numbers
- Les Big Numbers et les charts
- Les sections thématiques

---

# CHECKLIST FINALE — Avant soutenance

## Navigation
- [ ] Barre HTML ajoutée dans Dashboard 1 (bouton "Vue Générale" rouge)
- [ ] Barre HTML ajoutée dans Dashboard 2 (bouton "Recrutement" rouge)
- [ ] Barre HTML ajoutée dans Dashboard 3 (bouton "Compétences" rouge)
- [ ] Barre HTML ajoutée dans Dashboard 4 (bouton "Démographie" rouge)
- [ ] ID1, ID2, ID3, ID4 remplacés par les vrais IDs dans les 4 barres
- [ ] Test : cliquer sur chaque bouton navigue bien vers le bon dashboard

## Design
- [ ] Mode sombre activé (Settings → Appearance → Dark mode)
- [ ] Titre Markdown ajouté sous la barre dans chaque dashboard
- [ ] Même color scheme partout : `Google Category 10c`
- [ ] Dividers entre sections

## Fonctionnalités
- [ ] Cross-filtering activé dans les 4 dashboards
- [ ] Auto-refresh 10 min configuré dans les 4 dashboards
- [ ] Filtres Département configurés dans chaque dashboard

## Données
- [ ] Airflow tourne : `docker compose up -d` (dossier airflow/)
- [ ] Superset tourne : `docker compose -f docker-compose.superset.yml up -d`
- [ ] Tous les charts affichent des données (pas "No data")

---

# RÉSULTAT FINAL ATTENDU

```
┌──────────────────────────────────────────────────────────┐
│ 🏢 SIRH BI  [📊 Vue Générale] [🎯 Recrut.] [💡 Compét.] [👥 Démo]  🔄│
├──────────────────────────────────────────────────────────┤
│ 📊 Vue d'ensemble RH                                     │
│ Effectifs · Mobilité · Contrats · Évolution mensuelle    │
├──────────┬──────────┬──────────┬────────────────────────┤
│    99    │  12.4%   │ 38 mois  │        87%             │
│ Employés │ Mobilité │Ancienneté│   Taux Acceptation     │
├──────────┴──────────┼──────────┴────────────────────────┤
│  Évolution mensuelle│     Répartition Département       │
│    (Area Chart)     │          (Treemap)                 │
├─────────────────────┼───────────────────────────────────┤
│   Mobilité/Dép.     │    Embauches vs Effectif          │
│  (Bar horizontal)   │       (Mixed Chart)               │
├─────────────────────┴───────────────────────────────────┤
│              Répartition Contrats (Donut)               │
└──────────────────────────────────────────────────────────┘
```

Naviguer vers Dashboard 2 en cliquant sur **🎯 Recrutement** dans la barre.