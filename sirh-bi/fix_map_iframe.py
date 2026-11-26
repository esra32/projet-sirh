"""
fix_map_iframe.py
Remplace le composant SVG par un iframe pointant vers la carte Leaflet interactive.
"""
import json
from superset.app import create_app

DASHBOARD_ID = 6
MARKDOWN_ID  = "MARKDOWN-geo-tunisie"

NEW_CODE = (
    '<iframe src="/static/assets/tunisia_map_leaflet.html" '
    'style="width:100%;height:520px;border:none;border-radius:12px;" '
    'title="Carte Tunisie - recrutements par ville">'
    '</iframe>'
)

def main():
    app = create_app()
    with app.app_context():
        from superset import db
        from superset.models.dashboard import Dashboard

        d = db.session.get(Dashboard, DASHBOARD_ID)
        if d is None:
            raise RuntimeError(f"Dashboard {DASHBOARD_ID} introuvable")

        pos = json.loads(d.position_json)
        if MARKDOWN_ID not in pos:
            raise RuntimeError(f"Composant {MARKDOWN_ID} introuvable")

        pos[MARKDOWN_ID]["meta"]["code"]   = NEW_CODE
        pos[MARKDOWN_ID]["meta"]["height"] = 72
        d.position_json = json.dumps(pos, ensure_ascii=False)
        db.session.commit()
        print("Carte Leaflet interactive installee sur le dashboard.")

if __name__ == "__main__":
    main()
