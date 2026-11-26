"""
=============================================================================
SIRH BI — Rapport de Qualité des Données
=============================================================================
Remplace Great Expectations avec pandas + pymysql.
Génère un rapport HTML avec les résultats des tests qualité.

Usage :
    python data_quality_report.py

Sortie :
    quality_report.html  (ouvrir dans le navigateur)
=============================================================================
"""

import pymysql
import pandas as pd
from datetime import datetime
import os

# =============================================================================
# Configuration MySQL
# =============================================================================
DB_CONFIG = {
    'host':     os.getenv('SIRH_MYSQL_HOST', 'localhost'),
    'port':     int(os.getenv('SIRH_MYSQL_PORT', '3306')),
    'user':     os.getenv('SIRH_MYSQL_USER', 'root'),
    'password': os.getenv('SIRH_MYSQL_PASSWORD', 'root'),
    'charset':  'utf8mb4',
}

# =============================================================================
# Connexion et chargement des tables
# =============================================================================

def load_table(conn, schema, table):
    try:
        df = pd.read_sql(f"SELECT * FROM `{schema}`.`{table}`", conn)
        return df
    except Exception as e:
        print(f"  [ERREUR] Impossible de charger {schema}.{table} : {e}")
        return pd.DataFrame()

# =============================================================================
# Tests qualité
# =============================================================================

results = []

def test(nom, table, regle, passed, total, details=""):
    status = "PASS" if passed == total else ("WARN" if passed >= total * 0.95 else "FAIL")
    results.append({
        'table':   table,
        'test':    nom,
        'regle':   regle,
        'passed':  passed,
        'total':   total,
        'status':  status,
        'details': details,
    })
    icon = "✅" if status == "PASS" else ("⚠️" if status == "WARN" else "❌")
    print(f"  {icon} [{status}] {table} — {nom} ({passed}/{total})")


def run_not_null(df, table, col):
    if df.empty or col not in df.columns:
        return
    total = len(df)
    passed = int(df[col].notna().sum())
    test(f"not_null({col})", table, f"Aucune valeur NULL dans {col}", passed, total)


def run_unique(df, table, col):
    if df.empty or col not in df.columns:
        return
    total = len(df)
    passed = int(df[col].nunique())
    test(f"unique({col})", table, f"Pas de doublons dans {col}", passed, total,
         details=f"{total - passed} doublons détectés" if passed < total else "")


def run_accepted_values(df, table, col, accepted):
    if df.empty or col not in df.columns:
        return
    total = len(df)
    passed = int(df[col].isin(accepted).sum())
    test(f"accepted_values({col})", table,
         f"Valeurs autorisées : {', '.join(str(v) for v in accepted)}",
         passed, total,
         details=f"Valeurs inattendues : {df[~df[col].isin(accepted)][col].unique().tolist()}" if passed < total else "")


def run_between(df, table, col, min_val, max_val):
    if df.empty or col not in df.columns:
        return
    sub = df[df[col].notna()]
    total = len(sub)
    passed = int(((sub[col] >= min_val) & (sub[col] <= max_val)).sum())
    test(f"between({col}, {min_val}, {max_val})", table,
         f"{col} doit être entre {min_val} et {max_val}",
         passed, total)


def run_no_future_dates(df, table, col):
    if df.empty or col not in df.columns:
        return
    sub = df[df[col].notna()].copy()
    try:
        sub[col] = pd.to_datetime(sub[col])
    except Exception:
        return
    today = pd.Timestamp.now()
    total = len(sub)
    passed = int((sub[col] <= today).sum())
    test(f"no_future_dates({col})", table,
         f"Aucune date future dans {col}",
         passed, total)


def run_referential_integrity(df_child, table_child, col_child,
                               df_parent, table_parent, col_parent):
    if df_child.empty or df_parent.empty:
        return
    if col_child not in df_child.columns or col_parent not in df_parent.columns:
        return
    valid_keys = set(df_parent[col_parent].dropna())
    child_keys = df_child[col_child].dropna()
    total = len(child_keys)
    passed = int(child_keys.isin(valid_keys).sum())
    test(f"referential_integrity({col_child}→{table_parent})",
         table_child,
         f"{col_child} doit exister dans {table_parent}.{col_parent}",
         passed, total)

# =============================================================================
# Main
# =============================================================================

def main():
    print("=" * 60)
    print("  SIRH BI — Rapport de Qualité des Données")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    conn = pymysql.connect(**DB_CONFIG)
    print("\n[OK] Connexion MySQL établie\n")

    # --- Chargement des tables DWH ---
    print("Chargement des tables sirh_dwh...")
    dim_employe      = load_table(conn, 'sirh_dwh', 'dim_employe')
    dim_departement  = load_table(conn, 'sirh_dwh', 'dim_departement')
    dim_poste        = load_table(conn, 'sirh_dwh', 'dim_poste')
    dim_competence   = load_table(conn, 'sirh_dwh', 'dim_competence')
    dim_offre        = load_table(conn, 'sirh_dwh', 'dim_offre')
    dim_temps        = load_table(conn, 'sirh_dwh', 'dim_temps')
    fait_recrutement = load_table(conn, 'sirh_dwh', 'fait_recrutement')
    fait_effectifs   = load_table(conn, 'sirh_dwh', 'fait_effectifs')
    fait_mobilite    = load_table(conn, 'sirh_dwh', 'fait_mobilite')
    fait_competences     = load_table(conn, 'sirh_dwh', 'fait_competences')
    fait_gap_competences = load_table(conn, 'sirh_dwh', 'fait_gap_competences')
    kpi_rh               = load_table(conn, 'sirh_dwh', 'kpi_rh')

    # --- Chargement staging ---
    print("Chargement des tables sirh_staging...")
    stg_employees    = load_table(conn, 'sirh_staging', 'stg_employees')
    stg_applications = load_table(conn, 'sirh_staging', 'stg_applications')

    conn.close()
    print()

    # =========================================================================
    # TESTS — dim_employe
    # =========================================================================
    print("--- Tests : dim_employe ---")
    run_not_null(dim_employe, 'dim_employe', 'id_employe_nk')
    run_not_null(dim_employe, 'dim_employe', 'prenom')
    run_not_null(dim_employe, 'dim_employe', 'nom')
    run_not_null(dim_employe, 'dim_employe', 'email')
    run_unique(dim_employe, 'dim_employe', 'id_employe_nk')
    run_unique(dim_employe, 'dim_employe', 'email')
    run_accepted_values(dim_employe, 'dim_employe', 'type_contrat',
                        ['CDI', 'CDD', 'STAGE', 'FREELANCE', 'ALTERNANCE'])
    run_no_future_dates(dim_employe, 'dim_employe', 'date_embauche')

    # =========================================================================
    # TESTS — dim_departement
    # =========================================================================
    print("--- Tests : dim_departement ---")
    run_not_null(dim_departement, 'dim_departement', 'id_departement_nk')
    run_not_null(dim_departement, 'dim_departement', 'nom')
    run_unique(dim_departement, 'dim_departement', 'id_departement_nk')

    # =========================================================================
    # TESTS — dim_offre
    # =========================================================================
    print("--- Tests : dim_offre ---")
    run_not_null(dim_offre, 'dim_offre', 'id_offre_nk')
    run_unique(dim_offre, 'dim_offre', 'id_offre_nk')
    run_accepted_values(dim_offre, 'dim_offre', 'statut',
                        ['DRAFT', 'PENDING_VALIDATION', 'PUBLISHED', 'CLOSED', 'CANCELLED'])
    run_no_future_dates(dim_offre, 'dim_offre', 'date_publication')

    # =========================================================================
    # TESTS — fait_recrutement
    # =========================================================================
    print("--- Tests : fait_recrutement ---")
    run_not_null(fait_recrutement, 'fait_recrutement', 'id_candidature_nk')
    run_unique(fait_recrutement, 'fait_recrutement', 'id_candidature_nk')
    run_between(fait_recrutement, 'fait_recrutement', 'match_score', 0, 100)
    run_accepted_values(fait_recrutement, 'fait_recrutement', 'statut',
                        ['PENDING', 'REVIEWING', 'INTERVIEW_SCHEDULED', 'ACCEPTED', 'REJECTED',
                         'En attente', 'En révision', 'Entretien planifié', 'Accepté', 'Rejeté'])
    run_referential_integrity(fait_recrutement, 'fait_recrutement', 'id_offre_nk',
                               dim_offre, 'dim_offre', 'id_offre_nk')
    run_referential_integrity(fait_recrutement, 'fait_recrutement', 'id_departement_nk',
                               dim_departement, 'dim_departement', 'id_departement_nk')

    # =========================================================================
    # TESTS — fait_effectifs
    # =========================================================================
    print("--- Tests : fait_effectifs ---")
    run_not_null(fait_effectifs, 'fait_effectifs', 'id_employe_nk')
    run_accepted_values(fait_effectifs, 'fait_effectifs', 'type_contrat',
                        ['CDI', 'CDD', 'STAGE', 'FREELANCE', 'ALTERNANCE'])
    run_referential_integrity(fait_effectifs, 'fait_effectifs', 'id_employe_nk',
                               dim_employe, 'dim_employe', 'id_employe_nk')
    run_referential_integrity(fait_effectifs, 'fait_effectifs', 'id_departement_nk',
                               dim_departement, 'dim_departement', 'id_departement_nk')

    # =========================================================================
    # TESTS — fait_competences
    # =========================================================================
    print("--- Tests : fait_competences ---")
    run_not_null(fait_competences, 'fait_competences', 'id_competence_nk')
    run_not_null(fait_competences, 'fait_competences', 'id_offre_nk')
    run_not_null(fait_competences, 'fait_competences', 'nb_candidats')
    run_referential_integrity(fait_competences, 'fait_competences', 'id_offre_nk',
                               dim_offre, 'dim_offre', 'id_offre_nk')

    # =========================================================================
    # TESTS — kpi_rh
    # =========================================================================
    print("--- Tests : kpi_rh ---")
    run_not_null(kpi_rh, 'kpi_rh', 'departement')
    run_not_null(kpi_rh, 'kpi_rh', 'nb_candidatures')
    run_between(kpi_rh, 'kpi_rh', 'taux_acceptation_pct', 0, 100)

    # =========================================================================
    # TESTS — fait_gap_competences
    # =========================================================================
    print("--- Tests : fait_gap_competences ---")
    run_not_null(fait_gap_competences, 'fait_gap_competences', 'competence')
    run_unique(fait_gap_competences, 'fait_gap_competences', 'competence')
    run_not_null(fait_gap_competences, 'fait_gap_competences', 'nb_offres_requierent')
    run_not_null(fait_gap_competences, 'fait_gap_competences', 'nb_candidats_ont')
    run_between(fait_gap_competences, 'fait_gap_competences', 'taux_couverture_pct', 0, 9999)
    run_accepted_values(fait_gap_competences, 'fait_gap_competences', 'statut',
                        ['Gap critique', 'Partiel', 'Couvert', 'Sur-couvert',
                         'Non demandée', 'Faible demande'])

    # =========================================================================
    # TESTS — staging
    # =========================================================================
    print("--- Tests : sirh_staging ---")
    run_not_null(stg_employees, 'stg_employees', 'id')
    run_not_null(stg_employees, 'stg_employees', 'email')
    run_unique(stg_employees, 'stg_employees', 'email')
    run_between(stg_applications, 'stg_applications', 'match_score', 0, 100)

    # =========================================================================
    # Génération du rapport HTML
    # =========================================================================
    generate_html_report(results)


def generate_html_report(results):
    df = pd.DataFrame(results)
    total   = len(df)
    passed  = (df['status'] == 'PASS').sum()
    warned  = (df['status'] == 'WARN').sum()
    failed  = (df['status'] == 'FAIL').sum()

    print()
    print("=" * 60)
    print(f"  RÉSUMÉ : {passed} PASS | {warned} WARN | {failed} FAIL | {total} total")
    print("=" * 60)

    def row_color(status):
        return {'PASS': '#d4edda', 'WARN': '#fff3cd', 'FAIL': '#f8d7da'}.get(status, '#fff')

    rows_html = ""
    for _, r in df.iterrows():
        icon = {'PASS': '✅', 'WARN': '⚠️', 'FAIL': '❌'}.get(r['status'], '')
        rows_html += f"""
        <tr style="background:{row_color(r['status'])}">
            <td><code>{r['table']}</code></td>
            <td>{r['test']}</td>
            <td>{r['regle']}</td>
            <td style="text-align:center">{r['passed']}</td>
            <td style="text-align:center">{r['total']}</td>
            <td style="text-align:center"><strong>{icon} {r['status']}</strong></td>
            <td style="color:#666;font-size:0.85em">{r['details']}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>SIRH BI — Rapport Qualité des Données</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f5f7fa; color: #333; }}
        h1   {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        h2   {{ color: #34495e; margin-top: 30px; }}
        .summary {{ display: flex; gap: 20px; margin: 20px 0; }}
        .card {{ padding: 20px 30px; border-radius: 8px; text-align: center; min-width: 120px; }}
        .card-pass {{ background: #27ae60; color: white; }}
        .card-warn {{ background: #f39c12; color: white; }}
        .card-fail {{ background: #e74c3c; color: white; }}
        .card-total {{ background: #2980b9; color: white; }}
        .card .num  {{ font-size: 2.5em; font-weight: bold; }}
        .card .lbl  {{ font-size: 0.9em; opacity: 0.9; }}
        table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px;
                 overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        th    {{ background: #2c3e50; color: white; padding: 12px 15px; text-align: left; }}
        td    {{ padding: 10px 15px; border-bottom: 1px solid #eee; }}
        tr:last-child td {{ border-bottom: none; }}
        .footer {{ margin-top: 30px; color: #999; font-size: 0.85em; text-align: center; }}
    </style>
</head>
<body>
    <h1>SIRH BI — Rapport de Qualité des Données</h1>
    <p>Généré le : <strong>{datetime.now().strftime('%Y-%m-%d à %H:%M:%S')}</strong></p>

    <div class="summary">
        <div class="card card-pass"><div class="num">{passed}</div><div class="lbl">PASS</div></div>
        <div class="card card-warn"><div class="num">{warned}</div><div class="lbl">WARN</div></div>
        <div class="card card-fail"><div class="num">{failed}</div><div class="lbl">FAIL</div></div>
        <div class="card card-total"><div class="num">{total}</div><div class="lbl">TOTAL</div></div>
    </div>

    <h2>Détail des tests</h2>
    <table>
        <thead>
            <tr>
                <th>Table</th>
                <th>Test</th>
                <th>Règle</th>
                <th>Passés</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Détails</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>

    <div class="footer">
        SIRH BI — Projet de Fin d'Études 2025/2026 — Pipeline de Qualité des Données
    </div>
</body>
</html>"""

    output_path = os.path.join(os.path.dirname(__file__), 'quality_report.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\n[OK] Rapport généré : {output_path}")
    print("     Ouvre ce fichier dans ton navigateur pour voir le rapport.\n")


if __name__ == '__main__':
    main()