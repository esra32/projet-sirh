"""
generate_final_map.py - SVG géographique Tunisie, design professionnel
Encart Grand Tunis pour éviter le chevauchement + lien interactif
"""
import json, math, subprocess, urllib.request

CITIES = [
    {"name":"Tunis",     "lat":36.8065,"lon":10.1815,"total":179,"interne":162,"externe":17, "col":"#1d4ed8"},
    {"name":"Sousse",    "lat":35.8288,"lon":10.6408,"total":149,"interne":149,"externe":0,  "col":"#1d4ed8"},
    {"name":"Sfax",      "lat":34.7406,"lon":10.7603,"total":149,"interne":145,"externe":4,  "col":"#1d4ed8"},
    {"name":"Monastir",  "lat":35.7643,"lon":10.8113,"total":110,"interne":110,"externe":0,  "col":"#1d4ed8"},
    {"name":"Ben Arous", "lat":36.7531,"lon":10.2283,"total":71, "interne":71, "externe":0,  "col":"#1d4ed8"},
    {"name":"Ariana",    "lat":36.8625,"lon":10.1947,"total":66, "interne":66, "externe":0,  "col":"#1d4ed8"},
    {"name":"Remote TN", "lat":34.0,   "lon":8.5,    "total":84, "interne":0,  "externe":84, "col":"#dc2626"},
]

W, H = 820, 580
MAP_X, MAP_Y, MAP_W, MAP_H = 20, 20, 500, 540
LON_MIN, LON_MAX = 7.3, 11.8
LAT_MIN, LAT_MAX = 29.8, 37.9

def merc(lat): return math.log(math.tan(math.pi/4 + math.radians(lat)/2))
MERC_TOP = merc(LAT_MAX); MERC_BOT = merc(LAT_MIN)

def geo2svg(lon, lat, ox=MAP_X, oy=MAP_Y, ow=MAP_W, oh=MAP_H):
    x = ox + (lon - LON_MIN)/(LON_MAX - LON_MIN) * ow
    y = oy + (MERC_TOP - merc(lat))/(MERC_TOP - MERC_BOT) * oh
    return round(x,1), round(y,1)

# Télécharger GeoJSON Tunisie
print("Chargement contour Tunisie...")
try:
    url = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/TUN.geo.json"
    with urllib.request.urlopen(url, timeout=15) as r:
        gd = json.loads(r.read())
    features = gd.get("features",[gd]) if "features" in gd else [gd]
    paths = []
    for feat in features:
        geom = feat.get("geometry", feat)
        rings = []
        if geom["type"] == "Polygon": rings = [geom["coordinates"][0]]
        elif geom["type"] == "MultiPolygon": rings = [p[0] for p in geom["coordinates"]]
        for ring in rings:
            if len(ring) < 8: continue
            pts = [geo2svg(c[0],c[1]) for c in ring]
            paths.append("M " + " L ".join(f"{x},{y}" for x,y in pts) + " Z")
    country_svg = "\n  ".join(f'<path d="{p}" fill="#d1fae5" stroke="#0d9488" stroke-width="1.2" stroke-linejoin="round"/>' for p in paths)
    print(f"  {len(paths)} polygones")
except Exception as e:
    print(f"Erreur: {e}")
    country_svg = ""

# ── Marqueurs carte principale (sauf Tunis/Ariana/Ben Arous qui vont dans encart) ──
ENCART_CITIES = {"Tunis","Ariana","Ben Arous"}
main_markers = ""
for c in CITIES:
    if c["name"] in ENCART_CITIES: continue
    cx, cy = geo2svg(c["lon"], c["lat"])
    r = max(8, min(24, c["total"]//7))
    # label décalé vers la droite pour Sfax/Monastir/Sousse (côte est)
    lx = cx + r + 5
    anchor = "start"
    if c["name"] == "Remote TN": lx = cx + r + 5; anchor = "start"

    txt_interne = f"Interne : {c['interne']}" if c['interne'] else ""
    txt_externe = f"Externe : {c['externe']}" if c['externe'] else ""

    main_markers += f"""
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="{c['col']}" fill-opacity="0.85" stroke="white" stroke-width="2">
    <title>{c['name']} — {c['total']} offres&#10;{txt_interne}&#10;{txt_externe}</title>
  </circle>
  <text x="{lx}" y="{cy-3}" font-family="Arial" font-size="11.5" font-weight="700" fill="#1e3a5f" text-anchor="{anchor}">{c['name']}</text>
  <text x="{lx}" y="{cy+11}" font-family="Arial" font-size="10" fill="#64748b" text-anchor="{anchor}">{c['total']} offres</text>"""

# Marqueur Grand Tunis sur carte principale (petite étoile + ligne vers encart)
tunis_cx, tunis_cy = geo2svg(10.18, 36.79)
# Ligne pointillée vers l'encart
ENCART_X, ENCART_Y, ENCART_W, ENCART_H = 530, 20, 270, 250
main_markers += f"""
  <circle cx="{tunis_cx}" cy="{tunis_cy}" r="10" fill="#1d4ed8" fill-opacity="0.5" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="3,2"/>
  <text x="{tunis_cx-12}" y="{tunis_cy-13}" font-family="Arial" font-size="10" fill="#1e3a5f" text-anchor="end">Grand Tunis</text>
  <text x="{tunis_cx-12}" y="{tunis_cy-1}" font-family="Arial" font-size="9" fill="#64748b" text-anchor="end">316 offres</text>
  <line x1="{tunis_cx+8}" y1="{tunis_cy-8}" x2="{ENCART_X}" y2="{ENCART_Y+ENCART_H//2}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="5,3"/>"""

# ── Encart Grand Tunis ────────────────────────────────────────────
# Zone : lon 10.12-10.32, lat 36.68-36.92
EL_MIN, EL_MAX = 10.10, 10.35
ELAT_MIN, ELAT_MAX = 36.65, 36.95
EMERC_TOP = merc(ELAT_MAX); EMERC_BOT = merc(ELAT_MIN)

def geo2encart(lon, lat):
    x = ENCART_X + (lon - EL_MIN)/(EL_MAX - EL_MIN) * ENCART_W
    y = ENCART_Y + (EMERC_TOP - merc(lat))/(EMERC_TOP - EMERC_BOT) * ENCART_H
    return round(x,1), round(y,1)

encart_cities = [c for c in CITIES if c["name"] in ENCART_CITIES]
encart_markers = ""
for c in encart_cities:
    ex, ey = geo2encart(c["lon"], c["lat"])
    r = max(9, min(22, c["total"]//8))
    lx = ex + r + 6; anchor = "start"
    encart_markers += f"""
  <circle cx="{ex}" cy="{ey}" r="{r}" fill="{c['col']}" fill-opacity="0.88" stroke="white" stroke-width="2.5">
    <title>{c['name']} — {c['total']} offres</title>
  </circle>
  <text x="{lx}" y="{ey-2}" font-family="Arial" font-size="11" font-weight="700" fill="#1e3a5f" text-anchor="{anchor}">{c['name']}</text>
  <text x="{lx}" y="{ey+11}" font-family="Arial" font-size="10" fill="#64748b" text-anchor="{anchor}">{c['total']} offres</text>"""

encart_svg = f"""
  <!-- Encart Grand Tunis -->
  <rect x="{ENCART_X-2}" y="{ENCART_Y-2}" width="{ENCART_W+4}" height="{ENCART_H+4}" rx="10" fill="#f0f9ff" stroke="#0d9488" stroke-width="1.5"/>
  <text x="{ENCART_X+8}" y="{ENCART_Y+16}" font-family="Arial" font-size="11" font-weight="700" fill="#0d9488">Zoom — Grand Tunis</text>
  <!-- Grille de repère -->
  <line x1="{ENCART_X}" y1="{ENCART_Y+ENCART_H//2}" x2="{ENCART_X+ENCART_W}" y2="{ENCART_Y+ENCART_H//2}" stroke="#e2e8f0" stroke-width="1"/>
  <line x1="{ENCART_X+ENCART_W//2}" y1="{ENCART_Y}" x2="{ENCART_X+ENCART_W//2}" y2="{ENCART_Y+ENCART_H}" stroke="#e2e8f0" stroke-width="1"/>
  {encart_markers}"""

# ── Légende ───────────────────────────────────────────────────────
LEG_X, LEG_Y = 530, 295
legend_svg = f"""
  <rect x="{LEG_X}" y="{LEG_Y}" width="270" height="140" rx="10" fill="white" fill-opacity="0.95" stroke="#e2e8f0" stroke-width="1.2"/>
  <text x="{LEG_X+14}" y="{LEG_Y+24}" font-family="Arial" font-size="13" font-weight="700" fill="#1e3a5f">Recrutements Tunisie</text>
  <circle cx="{LEG_X+24}" cy="{LEG_Y+48}" r="7" fill="#1d4ed8" fill-opacity="0.85"/>
  <text x="{LEG_X+38}" y="{LEG_Y+53}" font-family="Arial" font-size="11.5" fill="#334155">Recrutement Interne</text>
  <circle cx="{LEG_X+24}" cy="{LEG_Y+72}" r="7" fill="#dc2626" fill-opacity="0.85"/>
  <text x="{LEG_X+38}" y="{LEG_Y+77}" font-family="Arial" font-size="11.5" fill="#334155">Remote / Externe</text>
  <line x1="{LEG_X+14}" y1="{LEG_Y+93}" x2="{LEG_X+256}" y2="{LEG_Y+93}" stroke="#e2e8f0"/>
  <text x="{LEG_X+14}" y="{LEG_Y+113}" font-family="Arial" font-size="12" font-weight="700" fill="#1e3a5f">808 offres localisées TN</text>
  <text x="{LEG_X+14}" y="{LEG_Y+131}" font-family="Arial" font-size="10" fill="#94a3b8">Données 2021-2025 • SIRH Recrutement</text>"""

# ── Lien vers carte interactive ────────────────────────────────────
link_svg = f"""
  <rect x="530" y="455" width="270" height="105" rx="10" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.2"/>
  <text x="544" y="478" font-family="Arial" font-size="12" font-weight="700" fill="#1d4ed8">Carte interactive disponible</text>
  <text x="544" y="497" font-family="Arial" font-size="10.5" fill="#475569">Ouvrir dans un nouvel onglet :</text>
  <text x="544" y="516" font-family="Arial" font-size="9.5" fill="#1d4ed8">localhost:8088/static/assets/</text>
  <text x="544" y="532" font-family="Arial" font-size="9.5" fill="#1d4ed8">tunisia_inline_map.html</text>
  <text x="544" y="550" font-family="Arial" font-size="10" fill="#64748b">Zoom + clic sur les villes disponible</text>"""

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"
     role="img" aria-label="Carte géographique Tunisie - recrutements par ville">
  <defs>
    <filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-opacity="0.10"/></filter>
  </defs>
  <rect width="{W}" height="{H}" fill="#f0f9ff" rx="14"/>
  <!-- Contour géographique réel -->
  <g filter="url(#sh)">{country_svg}</g>
  <!-- Marqueurs carte principale -->
  {main_markers}
  <!-- Encart Grand Tunis -->
  {encart_svg}
  <!-- Légende -->
  {legend_svg}
  <!-- Lien interactif -->
  {link_svg}
</svg>"""

out = "tunisia_final_map.svg"
with open(out, "w", encoding="utf-8") as f:
    f.write(svg)
print(f"SVG final : {out}")

subprocess.run(["docker","cp", out, "superset-sirh:/app/superset/static/assets/tunisia_final_map.svg"], check=True, capture_output=True)
print("Copie container : OK")
