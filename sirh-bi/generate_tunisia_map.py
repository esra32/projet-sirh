"""
generate_tunisia_map.py
Genere une carte Leaflet.js interactive de Tunisie avec les recrutements par ville.
Utilise OpenStreetMap (gratuit, sans API key).
Copie le fichier HTML dans le container Superset puis met a jour le composant Markdown.
"""
import json
import subprocess

# ── Donnees des villes ────────────────────────────────────────────
CITIES = [
    {"name": "Tunis",      "lat": 36.8065, "lon": 10.1815, "interne": 162, "externe": 17,  "color": "#3266cc"},
    {"name": "Sousse",     "lat": 35.8288, "lon": 10.6408, "interne": 149, "externe": 0,   "color": "#3266cc"},
    {"name": "Sfax",       "lat": 34.7406, "lon": 10.7603, "interne": 145, "externe": 4,   "color": "#3266cc"},
    {"name": "Monastir",   "lat": 35.7643, "lon": 10.8113, "interne": 110, "externe": 0,   "color": "#3266cc"},
    {"name": "Ben Arous",  "lat": 36.7531, "lon": 10.2283, "interne": 71,  "externe": 0,   "color": "#3266cc"},
    {"name": "Ariana",     "lat": 36.8625, "lon": 10.1947, "interne": 66,  "externe": 0,   "color": "#3266cc"},
    {"name": "Remote TN",  "lat": 36.2,   "lon": 9.6,     "interne": 0,   "externe": 84,  "color": "#e4572e"},
]

# ── Generer le HTML Leaflet ────────────────────────────────────────
def make_marker(city):
    total  = city["interne"] + city["externe"]
    radius = max(12, total // 6)
    color  = city["color"]
    label  = (f"{city['name']}<br>"
              f"<b>{total} offres</b><br>"
              + (f"Interne : {city['interne']}<br>" if city["interne"] else "")
              + (f"Externe : {city["externe"]}" if city["externe"] else ""))
    return f"""
    L.circleMarker([{city['lat']}, {city['lon']}], {{
        radius: {radius},
        fillColor: "{color}",
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
    }}).bindPopup('<div style="font-family:Arial;font-size:13px;min-width:130px">{label}</div>')
      .addTo(map);"""

markers = "\n".join(make_marker(c) for c in CITIES)

html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carte Tunisie Recrutements</title>
  <link rel="stylesheet" href="/static/assets/leaflet.css"/>
  <script src="/static/assets/leaflet.js"></script>
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{ background: #f7fbfd; font-family: Arial, sans-serif; }}
    #map {{ width:100%; height:100vh; }}
    .legend {{
      background: white;
      padding: 14px 18px;
      border-radius: 10px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.13);
      font-size: 13px;
      line-height: 1.7;
    }}
    .legend h4 {{ margin-bottom: 8px; color: #1e2f43; font-size:14px; }}
    .dot {{ display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:6px; vertical-align:middle; }}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {{ zoomControl: true, scrollWheelZoom: true }})
               .setView([35.5, 10.0], 7);

    L.tileLayer('https://{{s}}.basemaps.cartocdn.com/light_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }}).addTo(map);

    {markers}

    // Legende
    var legend = L.control({{position: 'bottomright'}});
    legend.onAdd = function(map) {{
      var div = L.DomUtil.create('div', 'legend');
      div.innerHTML = '<h4>Recrutements TN</h4>'
        + '<span class="dot" style="background:#3266cc"></span> Recrutement Interne<br>'
        + '<span class="dot" style="background:#e4572e"></span> Remote / Externe<br>'
        + '<br><b>808</b> offres localisees';
      return div;
    }};
    legend.addTo(map);
  </script>
</body>
</html>"""

# ── Sauvegarder localement ────────────────────────────────────────
output_path = "tunisia_map_leaflet.html"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(html_content)
print(f"HTML genere : {output_path}")

# ── Copier dans le container Superset ────────────────────────────
try:
    subprocess.run(
        ["docker", "cp", output_path, "superset-sirh:/app/superset/static/assets/tunisia_map_leaflet.html"],
        check=True, capture_output=True
    )
    print("Copie dans le container : OK")
except Exception as e:
    print(f"Erreur docker cp : {e}")
    print("Lance manuellement :")
    print(f"  docker cp {output_path} superset-sirh:/app/superset/static/assets/")
