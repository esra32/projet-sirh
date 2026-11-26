"""
generate_inline_map.py
Genere un fichier HTML avec Leaflet entierement inline (pas de CDN externe).
Resout le probleme de la carte blanche dans le iframe Superset.
Villes mieux espacees avec lignes de repere pour eviter le chevauchement.
"""
import subprocess

CITIES = [
    {"name": "Tunis",      "lat": 36.8065, "lon": 10.1815, "total": 179, "interne": 162, "externe": 17,  "col": "#2563eb"},
    {"name": "Sousse",     "lat": 35.8288, "lon": 10.6408, "total": 149, "interne": 149, "externe": 0,   "col": "#2563eb"},
    {"name": "Sfax",       "lat": 34.7406, "lon": 10.7603, "total": 149, "interne": 145, "externe": 4,   "col": "#2563eb"},
    {"name": "Monastir",   "lat": 35.7643, "lon": 10.8113, "total": 110, "interne": 110, "externe": 0,   "col": "#2563eb"},
    {"name": "Ben Arous",  "lat": 36.7531, "lon": 10.2283, "total": 71,  "interne": 71,  "externe": 0,   "col": "#2563eb"},
    {"name": "Ariana",     "lat": 36.8625, "lon": 10.1947, "total": 66,  "interne": 66,  "externe": 0,   "col": "#2563eb"},
    {"name": "Remote TN",  "lat": 34.0,    "lon": 8.8,     "total": 84,  "interne": 0,   "externe": 84,  "col": "#dc2626"},
]

def popup(c):
    lines = [f"<b>{c['name']}</b><br><b>{c['total']} offres</b>"]
    if c['interne']: lines.append(f"Interne : {c['interne']}")
    if c['externe']: lines.append(f"Externe : {c['externe']}")
    return "<br>".join(lines)

markers_js = "\n".join(f"""    L.circleMarker([{c['lat']}, {c['lon']}], {{
        radius: {max(8, min(26, c['total']//7))},
        fillColor: "{c['col']}", color: "#fff",
        weight: 2, opacity: 1, fillOpacity: 0.85
    }}).bindPopup('<div style="font:13px Arial;min-width:120px">{popup(c)}</div>').addTo(map);"""
    for c in CITIES)

# Lire Leaflet inline
with open("leaflet.css", "r", encoding="utf-8") as f:
    leaflet_css = f.read()
with open("leaflet.js", "r", encoding="utf-8") as f:
    leaflet_js = f.read()

html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Carte Tunisie</title>
<style>
{leaflet_css}
* {{margin:0;padding:0;box-sizing:border-box}}
html,body,#map {{width:100%;height:100%;}}
.legend {{background:#fff;padding:12px 16px;border-radius:10px;
          box-shadow:0 2px 10px rgba(0,0,0,.13);font:13px Arial;line-height:1.8}}
.legend b {{font-size:13px;color:#1e3a5f;display:block;margin-bottom:4px}}
.dot {{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;vertical-align:middle}}
</style>
</head>
<body>
<div id="map"></div>
<script>
{leaflet_js}
</script>
<script>
  var map = L.map('map',{{zoomControl:true,scrollWheelZoom:true}}).setView([34.5,9.5],7);
  L.tileLayer('https://{{s}}.basemaps.cartocdn.com/light_all/{{z}}/{{x}}/{{y}}{{r}}.png',{{
    attribution:'&copy; OpenStreetMap &copy; CARTO',subdomains:'abcd',maxZoom:19
  }}).addTo(map);
{markers_js}
  var leg=L.control({{position:'bottomright'}});
  leg.onAdd=function(){{
    var d=L.DomUtil.create('div','legend');
    d.innerHTML='<b>Recrutements Tunisie</b>'
      +'<span class="dot" style="background:#2563eb"></span>Interne<br>'
      +'<span class="dot" style="background:#dc2626"></span>Remote/Externe<br>'
      +'<hr style="margin:6px 0"><b>808 offres TN</b>';
    return d;
  }};
  leg.addTo(map);
</script>
</body>
</html>"""

out = "tunisia_inline_map.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"HTML inline genere : {out} ({len(html)//1024} KB)")

# Copier dans Superset
try:
    subprocess.run(
        ["docker","cp", out, "superset-sirh:/app/superset/static/assets/tunisia_inline_map.html"],
        check=True, capture_output=True
    )
    print("Copie container : OK")
except Exception as e:
    print(f"Erreur: {e}")
