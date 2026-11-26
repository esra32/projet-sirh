"""
fix_map_scroll.py
Met a jour le composant Markdown de la carte Tunisie :
- Hauteur augmentee (80 unites grid au lieu de 58)
- overflow:auto pour permettre le scroll
- Image a taille naturelle (pas scale down)
"""
import json
from superset.app import create_app

DASHBOARD_ID  = 6
MARKDOWN_ID   = "MARKDOWN-geo-tunisie"

NEW_CODE = (
    '<div style="width:100%;height:100%;overflow:auto;'
    'background:#f7fbfd;border-radius:12px;">'
    '<img src="/static/assets/tunisia_recruitment_map.svg" '
    'alt="Carte Tunisie - recrutements par ville" '
    'style="min-width:900px;width:100%;display:block;" />'
    '</div>'
)

def main():
    app = create_app()
    with app.app_context():
        from superset import db
        from superset.models.dashboard import Dashboard

        dashboard = db.session.get(Dashboard, DASHBOARD_ID)
        if dashboard is None:
            raise RuntimeError(f"Dashboard {DASHBOARD_ID} introuvable")

        position = json.loads(dashboard.position_json)

        if MARKDOWN_ID not in position:
            raise RuntimeError(f"Composant {MARKDOWN_ID} introuvable dans le layout")

        comp = position[MARKDOWN_ID]
        comp["meta"]["code"]   = NEW_CODE
        comp["meta"]["height"] = 80   # unites Superset grid (etait 58)

        dashboard.position_json = json.dumps(position, ensure_ascii=False)
        db.session.commit()
        print("Carte Tunisie mise a jour : scroll active, hauteur 80 unites.")

if __name__ == "__main__":
    main()
