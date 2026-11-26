"""
generate_geo_map.py
Genere un vrai SVG geographique de Tunisie avec les coordonnees GPS reelles.
Telecharge le GeoJSON de Tunisie, projette les coordonnees en SVG,
ajoute les villes avec taille de bulle proportionnelle aux offres.
"""
import json
import math
import subprocess
import urllib.request

# ── Villes avec coordonnees GPS reelles ──────────────────────────
CITIES = [
    {"name": "Tunis",     "lat": 36.8065, "lon": 10.1815, "total": 179, "interne": 162, "externe": 17,  "color": "#2563eb"},
    {"name": "Sousse",    "lat": 35.8288, "lon": 10.6408, "total": 149, "interne": 149, "externe": 0,   "color": "#2563eb"},
    {"name": "Sfax",      "lat": 34.7406, "lon": 10.7603, "total": 149, "interne": 145, "externe": 4,   "color": "#2563eb"},
    {"name": "Monastir",  "lat": 35.7643, "lon": 10.8113, "total": 110, "interne": 110, "externe": 0,   "color": "#2563eb"},
    {"name": "Ben Arous", "lat": 36.7531, "lon": 10.2283, "total": 71,  "interne": 71,  "externe": 0,   "color": "#2563eb"},
    {"name": "Ariana",    "lat": 36.8625, "lon": 10.1947, "total": 66,  "interne": 66,  "externe": 0,   "color": "#2563eb"},
    {"name": "Remote",    "lat": 34.5,    "lon": 8.8,     "total": 84,  "interne": 0,   "externe": 84,  "color": "#dc2626"},
]

# ── Projection geographique → SVG ─────────────────────────────────
# Zone Tunisia : lon 7.5-11.8, lat 30.0-37.7
SVG_W, SVG_H = 480, 560
MARGIN = 30
LON_MIN, LON_MAX = 7.5,  11.8
LAT_MIN, LAT_MAX = 30.0, 37.7

def geo_to_svg(lon, lat):
    """Mercator simplifie → coordonnees SVG."""
    def merc_y(lat_deg):
        lat_r = math.radians(lat_deg)
        return math.log(math.tan(math.pi / 4 + lat_r / 2))

    x = MARGIN + (lon - LON_MIN) / (LON_MAX - LON_MIN) * (SVG_W - 2 * MARGIN)
    y_top = merc_y(LAT_MAX)
    y_bot = merc_y(LAT_MIN)
    y = MARGIN + (y_top - merc_y(lat)) / (y_top - y_bot) * (SVG_H - 2 * MARGIN)
    return round(x, 1), round(y, 1)

# ── Telecharger le contour de la Tunisie ─────────────────────────
print("Telechargement du contour Tunisie...")
try:
    url = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/TUN.geo.json"
    with urllib.request.urlopen(url, timeout=15) as r:
        geo_data = json.loads(r.read())

    # Extraire les coordonnees du polygone principal
    features = geo_data.get("features", [geo_data]) if "features" in geo_data else [geo_data]
    polygons_svg = []
    for feature in features:
        geom = feature.get("geometry", feature)
        coords_list = geom.get("coordinates", [])
        geom_type   = geom.get("type", "")

        if geom_type == "Polygon":
            coords_list = [coords_list[0]]
        elif geom_type == "MultiPolygon":
            coords_list = [p[0] for p in coords_list]

        for ring in coords_list:
            if len(ring) < 10:
                continue
            pts = [geo_to_svg(c[0], c[1]) for c in ring]
            path = "M " + " L ".join(f"{x},{y}" for x, y in pts) + " Z"
            polygons_svg.append(path)

    print(f"  {len(polygons_svg)} polygone(s) charge(s)")
    country_path = "\n  ".join(
        f'<path d="{p}" fill="#ddf0ea" stroke="#0e7c7b" stroke-width="1.5" stroke-linejoin="round"/>'
        for p in polygons_svg
    )
except Exception as e:
    print(f"  Erreur: {e} — utilisation du contour simplifie")
    country_path = '<path d="M248 29 C298 10 358 26 407 18 C480 6 545 60 553 127 C560 180 540 219 577 263 C610 303 570 331 513 321 C461 312 424 287 375 300 C313 317 244 301 211 253 C180 208 199 164 184 125 C165 75 198 43 248 29 Z" fill="#ddf0ea" stroke="#0e7c7b" stroke-width="2"/>'

# ── Generer les marqueurs de villes ──────────────────────────────
def make_city_marker(city):
    cx, cy = geo_to_svg(city["lon"], city["lat"])
    radius = max(8, min(28, city["total"] // 7))
    color  = city["color"]

    # Popup info dans le title SVG
    if city["externe"] > 0:
        info = f"{city['name']} — {city['total']} offres (Interne: {city['interne']}, Externe: {city['externe']})"
    else:
        info = f"{city['name']} — {city['total']} offres internes"

    # Position du label (droite ou gauche selon la ville)
    label_x = cx + radius + 5
    anchor  = "start"
    if city["lon"] > 10.5:  # villes cote est → label a gauche
        label_x = cx - radius - 5
        anchor  = "end"

    return f"""
  <circle cx="{cx}" cy="{cy}" r="{radius}" fill="{color}" fill-opacity="0.82" stroke="#ffffff" stroke-width="2">
    <title>{info}</title>
  </circle>
  <text x="{label_x}" y="{cy - radius - 3}" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#1e3a5f" text-anchor="{anchor}">{city['name']}</text>
  <text x="{label_x}" y="{cy - radius + 10}" font-family="Arial,sans-serif" font-size="10" fill="#526577" text-anchor="{anchor}">{city['total']} offres</text>"""

markers = "\n".join(make_city_marker(c) for c in CITIES)

# ── Legende ────────────────────────────────────────────────────────
legend = """
  <g transform="translate(310, 360)">
    <rect x="0" y="0" width="155" height="110" rx="8" fill="white" fill-opacity="0.92" stroke="#d7e4ed" stroke-width="1"/>
    <text x="12" y="22" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#1e3a5f">Recrutements TN</text>
    <circle cx="22" cy="42" r="7" fill="#2563eb" fill-opacity="0.82"/>
    <text x="35" y="47" font-family="Arial,sans-serif" font-size="11" fill="#334155">Recrutement Interne</text>
    <circle cx="22" cy="64" r="7" fill="#dc2626" fill-opacity="0.82"/>
    <text x="35" y="69" font-family="Arial,sans-serif" font-size="11" fill="#334155">Remote / Externe</text>
    <line x1="12" y1="80" x2="143" y2="80" stroke="#e2e8f0"/>
    <text x="12" y="97" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#1e3a5f">808 offres localisées TN</text>
  </g>"""

# ── Assembler le SVG final ────────────────────────────────────────
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SVG_W} {SVG_H}" role="img" aria-label="Carte géographique Tunisie - recrutements par ville">
  <defs>
    <filter id="shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#163447" flood-opacity="0.10"/>
    </filter>
  </defs>
  <rect width="{SVG_W}" height="{SVG_H}" fill="#eaf6fb" rx="14"/>

  <!-- Mer Méditerranée label -->
  <text x="55" y="90" font-family="Arial,sans-serif" font-size="11" fill="#94a3b8" transform="rotate(-15,55,90)">Méditerranée</text>

  <!-- Contour géographique réel de la Tunisie -->
  {country_path}

  <!-- Marqueurs villes -->
  {markers}

  <!-- Légende -->
  {legend}

  <!-- Titre -->
  <text x="14" y="530" font-family="Arial,sans-serif" font-size="10" fill="#94a3b8">
    Source: SIRH Recrutement — Données 2021-2025
  </text>
</svg>"""

# ── Sauvegarder ──────────────────────────────────────────────────
output = "tunisia_geo_map.svg"
with open(output, "w", encoding="utf-8") as f:
    f.write(svg)
print(f"SVG genere : {output}")

# ── Copier dans Superset ─────────────────────────────────────────
try:
    subprocess.run(
        ["docker", "cp", output, "superset-sirh:/app/superset/static/assets/tunisia_geo_map.svg"],
        check=True, capture_output=True
    )
    print("Copie dans container : OK")
except Exception as e:
    print(f"Erreur docker cp : {e}")
