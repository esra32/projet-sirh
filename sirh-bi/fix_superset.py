# fix_superset.py - Corrections et ajouts automatiques SIRH BI dans Superset
# Executer : python fix_superset.py
import urllib.request
import urllib.error
import http.cookiejar
import json

BASE = 'http://localhost:8088'

# Session avec cookie jar (requis pour CSRF Superset)
_JAR     = http.cookiejar.CookieJar()
_OPENER  = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_JAR))
_TOKEN   = None
_CSRF    = None

def api(method, path, data=None):
    url = f'{BASE}/api/v1{path}'
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header('Content-Type', 'application/json')
    if _TOKEN:
        req.add_header('Authorization', f'Bearer {_TOKEN}')
    if _CSRF and method in ('POST', 'PUT', 'DELETE', 'PATCH'):
        req.add_header('X-CSRFToken', _CSRF)
        req.add_header('Referer', BASE)
    try:
        resp = _OPENER.open(req, timeout=15)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode('utf-8', errors='replace')
        print(f'  [HTTP {e.code}] {method} {path} -> {err[:250]}')
        return None

def sql_metric(sql, label):
    return {
        'expressionType': 'SQL',
        'sqlExpression': sql,
        'column': None,
        'aggregate': None,
        'datasourceWarning': False,
        'hasCustomLabel': True,
        'label': label,
        'optionName': f'metric_{label.replace(" ","_")}'
    }

def simple_metric(col, agg='COUNT', label=None):
    return {
        'expressionType': 'SIMPLE',
        'column': {'column_name': col, 'type': 'BIGINT'},
        'aggregate': agg,
        'hasCustomLabel': bool(label),
        'label': label or f'{agg}({col})',
        'optionName': f'metric_{col}'
    }

def big_number_params(metric, subheader='', number_format='.3~s', **kw):
    return json.dumps({
        'viz_type': 'big_number_total',
        'metric': metric,
        'subheader': subheader,
        'number_format': number_format,
        'y_axis_format': number_format,
        'adhoc_filters': [],
        **kw
    })

def bar_params(metrics, groupby, x_axis=None, row_limit=100, **kw):
    return json.dumps({
        'viz_type': 'echarts_timeseries_bar',
        'metrics': metrics if isinstance(metrics, list) else [metrics],
        'groupby': groupby if isinstance(groupby, list) else [groupby],
        'x_axis': x_axis or groupby[0] if isinstance(groupby, list) else groupby,
        'row_limit': row_limit,
        'adhoc_filters': [],
        'x_axis_rotate_label': 0,
        'show_legend': False,
        'show_value': True,
        **kw
    })

def create_chart(name, viz_type, ds_id, params_dict, description=''):
    params_str = json.dumps(params_dict) if isinstance(params_dict, dict) else params_dict
    payload = {
        'slice_name': name,
        'viz_type': viz_type,
        'datasource_id': ds_id,
        'datasource_type': 'table',
        'params': params_str,
        'description': description,
    }
    r = api('POST', '/chart/', payload)
    if r and 'id' in r:
        print(f'  [OK] Chart cree  id={r["id"]}  "{name}"')
        return r['id']
    elif r and 'result' in r:
        cid = r['result'].get('id')
        print(f'  [OK] Chart cree  id={cid}  "{name}"')
        return cid
    print(f'  [ERR] Echec creation chart "{name}"')
    return None

def update_chart(chart_id, **kwargs):
    r = api('PUT', f'/chart/{chart_id}', kwargs)
    ok = r is not None
    print(f'  {"[OK]" if ok else "[ERR]"} Chart {chart_id} mis a jour')
    return ok

def add_charts_to_dashboard(dashboard_id, new_chart_ids):
    """Associe les nouveaux charts au dashboard via l'API chart (dashboards field)."""
    ok_count = 0
    for cid in new_chart_ids:
        if not cid:
            continue
        # Recuperer les dashboards actuels du chart
        info = api('GET', f'/chart/{cid}')
        if not info:
            continue
        existing_dbs = [d['id'] for d in info['result'].get('dashboards', [])]
        if dashboard_id not in existing_dbs:
            existing_dbs.append(dashboard_id)
        r = api('PUT', f'/chart/{cid}', {'dashboards': existing_dbs})
        if r:
            ok_count += 1
        else:
            print(f'  [ERR] Impossible d associer chart {cid} au dashboard {dashboard_id}')
    print(f'  [OK] {ok_count}/{len([x for x in new_chart_ids if x])} charts associes au dashboard {dashboard_id}')


# ??????????????????????????????????????????????
# Main
# ??????????????????????????????????????????????

def main():
    global _TOKEN, _CSRF

    # 1. Auth + CSRF
    print('\n=== 1. AUTHENTIFICATION ===')
    r = api('POST', '/security/login', {
        'username': 'admin', 'password': 'admin',
        'provider': 'db', 'refresh': True
    })
    _TOKEN = r['access_token']

    # Recuperer le CSRF token - le cookie de session est maintenu par _JAR
    csrf_r = api('GET', '/security/csrf_token/')
    _CSRF = csrf_r.get('result') if csrf_r else None
    print(f'  [OK] Auth OK  CSRF obtenu' if _CSRF else '  [WARN] Auth OK  mais pas de CSRF')
    # 2. Datasets existants
    print('\n=== 2. DATASETS ===')
    datasets = api('GET', '/dataset/?q=(page_size:50)')
    ds_map = {d['table_name']: d['id'] for d in datasets['result']}

    # Ajouter dim_employe si absent
    if 'dim_employe' not in ds_map:
        r2 = api('POST', '/dataset/', {
            'database': 1, 'schema': 'sirh_dwh', 'table_name': 'dim_employe'
        })
        if r2:
            nid = r2.get('id') or r2.get('result', {}).get('id')
            ds_map['dim_employe'] = nid
            print(f'  [OK] dim_employe cree  id={nid}')
    else:
        print(f'  [v]  dim_employe existant  id={ds_map["dim_employe"]}')

    # Ajouter dim_competence si absent
    if 'dim_competence' not in ds_map:
        r2 = api('POST', '/dataset/', {
            'database': 1, 'schema': 'sirh_dwh', 'table_name': 'dim_competence'
        })
        if r2:
            nid = r2.get('id') or r2.get('result', {}).get('id')
            ds_map['dim_competence'] = nid
            print(f'  [OK] dim_competence cree  id={nid}')
    else:
        print(f'  [v]  dim_competence existant  id={ds_map["dim_competence"]}')

    DS = ds_map  # alias court

    # 3. Corriger charts existants
    print('\n=== 3. CORRECTIONS CHARTS EXISTANTS ===')

    # Chart 70 ? Taux de mobilite interne : afficher % au lieu du count brut
    print('  Chart 70 ? Taux mobilite : correction metrique -> percentage')
    update_chart(70,
        params=json.dumps({
            'viz_type': 'big_number_total',
            'metric': sql_metric(
                'ROUND(SUM(nb_mobilites) * 100.0 / NULLIF(SUM(nb_employes), 0), 1)',
                'Taux mobilité interne %'
            ),
            'subheader': 'Candidats internes recrutés / Effectif total',
            'number_format': '.1f',
            'adhoc_filters': [],
        })
    )

    # Chart 49 ? Effectif par departement : changer dataset fait_mobilite -> dim_employe
    print('  Chart 49 ? Effectif par departement : dataset -> dim_employe')
    update_chart(49,
        datasource_id=DS.get('dim_employe'),
        datasource_type='table',
        params=json.dumps({
            'viz_type': 'echarts_timeseries_bar',
            'metrics': [simple_metric('id', 'COUNT', 'Effectif')],
            'groupby': ['departement'],
            'x_axis': 'departement',
            'adhoc_filters': [
                {
                    'expressionType': 'SQL',
                    'sqlExpression': "est_actuel = 1",
                    'filterOptionName': 'filter_est_actuel',
                    'clause': 'WHERE',
                }
            ],
            'row_limit': 20,
            'x_axis_rotate_label': 15,
            'show_value': True,
            'show_legend': False,
            'orientation': 'horizontal',
        })
    )

    # Chart 65 & 69 ? Turnover : mettre a jour subheader pour clarifier la formule
    for cid in [65, 69]:
        print(f'  Chart {cid} ? Turnover : ajouter sous-titre explicatif')
        update_chart(cid,
            params=json.dumps({
                'viz_type': 'big_number_total',
                'metric': sql_metric('ROUND(AVG(taux_turnover), 1)', 'Taux turnover moyen %'),
                'subheader': 'Departs 2024, annualise ?2 (estimation semestrielle)',
                'number_format': '.1f',
                'adhoc_filters': [],
            })
        )

    # Chart 47 ? Taux acceptation : s'assurer qu'il utilise est_accepte unifie
    print('  Chart 47 ? Taux acceptation : verification source unifiee')
    update_chart(47,
        params=json.dumps({
            'viz_type': 'gauge_chart',
            'metric': sql_metric(
                'ROUND(SUM(est_accepte) * 100.0 / NULLIF(COUNT(*), 0), 1)',
                'Taux acceptation %'
            ),
            'adhoc_filters': [],
            'min_val': 0,
            'max_val': 100,
            'start_angle': 225,
            'end_angle': -45,
            'font_size': 36,
            'number_format': '.1f',
        })
    )

    # 4. Nouveaux charts ? VUE D'ENSEMBLE RH (dashboard id=2)
    print('\n=== 4. NOUVEAUX CHARTS ? Vue d\'ensemble RH ===')
    new_ids_dash2 = []

    c1 = create_chart(
        'Score IA moyen des candidatures',
        'big_number_total',
        DS['fait_recrutement'],
        {
            'viz_type': 'big_number_total',
            'metric': sql_metric('ROUND(AVG(match_score), 1)', 'Score IA moyen'),
            'subheader': 'Score moyen sur 100',
            'number_format': '.1f',
            'adhoc_filters': [],
        }
    )
    new_ids_dash2.append(c1)

    c2 = create_chart(
        'Anciennete moyenne (annees)',
        'big_number_total',
        DS.get('dim_employe'),
        {
            'viz_type': 'big_number_total',
            'metric': sql_metric('ROUND(AVG(anciennete_mois) / 12.0, 1)', 'Anciennete moy. (ans)'),
            'subheader': 'Employes actifs uniquement',
            'number_format': '.1f',
            'adhoc_filters': [
                {
                    'expressionType': 'SQL',
                    'sqlExpression': 'est_actuel = 1',
                    'filterOptionName': 'f_actuel',
                    'clause': 'WHERE',
                }
            ],
        }
    )
    new_ids_dash2.append(c2)

    add_charts_to_dashboard(2, [cid for cid in new_ids_dash2 if cid])

    # 5. Nouveaux charts ? ANALYSE RECRUTEMENT (dashboard id=4)
    print('\n=== 5. NOUVEAUX CHARTS ? Analyse Recrutement ===')
    new_ids_dash4 = []

    c3 = create_chart(
        'Time-to-Hire moyen par departement',
        'echarts_timeseries_bar',
        DS['fait_recrutement'],
        {
            'viz_type': 'echarts_timeseries_bar',
            'metrics': [sql_metric('ROUND(AVG(duree_offre_jours), 0)', 'Duree moy. (jours)')],
            'groupby': ['departement_normalise'],
            'x_axis': 'departement_normalise',
            'adhoc_filters': [
                {
                    'expressionType': 'SQL',
                    'sqlExpression': "departement_normalise IS NOT NULL",
                    'filterOptionName': 'f_dept',
                    'clause': 'WHERE',
                }
            ],
            'row_limit': 20,
            'x_axis_rotate_label': 20,
            'show_value': True,
            'show_legend': False,
            'orientation': 'horizontal',
        }
    )
    new_ids_dash4.append(c3)

    # Corriger la gauge doublon sur le dashboard recrutement
    # (chart 47 est deja correct, le doublon 18.53% a supprimer manuellement)
    # On ajoute une gauge corrigee comme remplacement
    c4 = create_chart(
        'Taux acceptation global (unifie)',
        'gauge_chart',
        DS['fait_recrutement'],
        {
            'viz_type': 'gauge_chart',
            'metric': sql_metric(
                'ROUND(SUM(est_accepte) * 100.0 / NULLIF(COUNT(*), 0), 1)',
                'Taux acceptation %'
            ),
            'adhoc_filters': [],
            'min_val': 0,
            'max_val': 100,
            'font_size': 36,
            'number_format': '.1f',
        }
    )
    new_ids_dash4.append(c4)

    add_charts_to_dashboard(4, [cid for cid in new_ids_dash4 if cid])

    # 6. Nouveaux charts ? ANALYSE COMP?TENCES (dashboard id=5)
    print('\n=== 6. NOUVEAUX CHARTS ? Analyse Competences ===')
    new_ids_dash5 = []

    c5 = create_chart(
        'Total Competences (43)',
        'big_number_total',
        DS.get('dim_competence'),
        {
            'viz_type': 'big_number_total',
            'metric': sql_metric('COUNT(DISTINCT id_competence_nk)', 'Total competences'),
            'subheader': 'Competences distinctes referencees',
            'number_format': 'd',
            'adhoc_filters': [],
        }
    )
    new_ids_dash5.append(c5)

    c6 = create_chart(
        'Gap Competences ? Couverture par competence',
        'table',
        DS.get('dim_competence'),
        {
            'viz_type': 'table',
            'metrics': [],
            'groupby': ['nom_competence', 'categorie_competence'],
            'adhoc_filters': [],
            'row_limit': 43,
            'include_time': False,
            'order_desc': True,
        }
    )
    new_ids_dash5.append(c6)

    add_charts_to_dashboard(5, [cid for cid in new_ids_dash5 if cid])

    # Publier le dashboard Competences (etait en brouillon)
    print('  Publier dashboard 5 (Competences)...')
    r = api('PUT', '/dashboard/5', {'published': True})
    if r:
        print('  [OK] Dashboard Competences publie')
    else:
        print('  [ERR] ?chec publication dashboard Competences')

    # 7. Nouveaux charts ? ANALYSE D?MOGRAPHIQUE (dashboard id=6)
    print('\n=== 7. NOUVEAUX CHARTS ? Analyse Demographique ===')
    new_ids_dash6 = []

    c7 = create_chart(
        'Pyramide des anciennetes',
        'echarts_timeseries_bar',
        DS.get('dim_employe'),
        {
            'viz_type': 'echarts_timeseries_bar',
            'metrics': [simple_metric('id', 'COUNT', 'Nb employes')],
            'groupby': ['tranche_anciennete'],
            'x_axis': 'tranche_anciennete',
            'adhoc_filters': [
                {
                    'expressionType': 'SQL',
                    'sqlExpression': 'est_actuel = 1',
                    'filterOptionName': 'f_actuel',
                    'clause': 'WHERE',
                }
            ],
            'row_limit': 10,
            'show_value': True,
            'show_legend': False,
            'orientation': 'horizontal',
        }
    )
    new_ids_dash6.append(c7)

    c8 = create_chart(
        'Risque attrition par departement',
        'table',
        DS.get('dim_employe'),
        {
            'viz_type': 'table',
            'metrics': [
                simple_metric('id', 'COUNT', 'Effectif'),
                sql_metric(
                    'SUM(CASE WHEN anciennete_mois >= 120 THEN 1 ELSE 0 END)',
                    'Seniors 10+ ans'
                ),
                sql_metric(
                    'ROUND(SUM(CASE WHEN anciennete_mois >= 120 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1)',
                    'Risque attrition %'
                ),
            ],
            'groupby': ['departement'],
            'adhoc_filters': [
                {
                    'expressionType': 'SQL',
                    'sqlExpression': "est_actuel = 1",
                    'filterOptionName': 'f_dept',
                    'clause': 'WHERE',
                }
            ],
            'row_limit': 15,
            'include_time': False,
            'order_desc': True,
        }
    )
    new_ids_dash6.append(c8)

    c9 = create_chart(
        'Heatmap Anciennete ? Type de Contrat',
        'heatmap',
        DS.get('dim_employe'),
        {
            'viz_type': 'heatmap',
            'all_columns_x': 'type_contrat',
            'all_columns_y': 'tranche_anciennete',
            'metric': simple_metric('id', 'COUNT', 'Nb employes'),
            'adhoc_filters': [
                {
                    'expressionType': 'SQL',
                    'sqlExpression': 'est_actuel = 1',
                    'filterOptionName': 'f_actuel',
                    'clause': 'WHERE',
                }
            ],
            'normalize_across': 'heatmap',
            'left_margin': 'auto',
        }
    )
    new_ids_dash6.append(c9)

    add_charts_to_dashboard(6, [cid for cid in new_ids_dash6 if cid])

    # ??????????????????????????????????????????????
    # Resume final
    # ??????????????????????????????????????????????
    print('\n' + '='*55)
    print('R?SUM?')
    print('='*55)
    print(f'  Datasets ajoutes     : dim_employe, dim_competence')
    print(f'  Charts corriges      : 70 (mobilite %), 49 (effectif), 47 (acceptation), 65/69 (turnover label)')
    print(f'  Charts crees         : {len([x for x in [c1,c2,c3,c4,c5,c6,c7,c8,c9] if x])} / 9')
    print(f'  Dashboard publie     : ANALYSE COMP?TENCES (id=5)')
    print()
    print('-> Ouvre http://localhost:8088 pour voir le resultat')
    print('-> Pour chaque dashboard : ? > Rafra?chir le cache si les anciens KPIs persistent')


if __name__ == '__main__':
    main()
