"""
generate_final_map_v2.py
- Titre ajouté
- Bulles plus petites
- Labels décalés sans chevauchement
- Remote TN hors carte (cadre dédié)
- Clic sur SVG → ouvre carte Leaflet interactive
"""
import json, math, subprocess, urllib.request

CITIES_MAIN = [
    {"name":"Tunis",     "lat":36.8065,"lon":10.1815,"total":199,"interne":173,"externe":26, "col":"#1d4ed8"},
    # svg_dy=-18 = décalage visuel vers le haut pour séparer de Monastir (elles sont à ~20km)
    {"name":"Sousse",    "lat":35.8288,"lon":10.6408,"total":166,"interne":144,"externe":22, "col":"#1d4ed8","label_side":"left","svg_dy":-18},
    {"name":"Sfax",      "lat":34.7406,"lon":10.7603,"total":160,"interne":147,"externe":13, "col":"#1d4ed8","label_side":"left"},
    # svg_dy=+18 = décalage visuel vers le bas pour séparer de Sousse
    {"name":"Monastir",  "lat":35.7643,"lon":10.8113,"total":121,"interne":103,"externe":18, "col":"#1d4ed8","label_side":"right","svg_dy":+18},
    {"name":"Ben Arous", "lat":36.7531,"lon":10.2283,"total":88, "interne":74, "externe":14, "col":"#1d4ed8"},
    {"name":"Ariana",    "lat":36.8625,"lon":10.1947,"total":81, "interne":71, "externe":10, "col":"#1d4ed8"},
    {"name":"Bizerte",   "lat":37.2746,"lon":9.8739, "total":20, "interne":16, "externe":4,  "col":"#1d4ed8","label_side":"left"},
    {"name":"Gafsa",     "lat":34.4250,"lon":8.7842, "total":15, "interne":13, "externe":2,  "col":"#1d4ed8","label_side":"right"},
    {"name":"Djerba",    "lat":33.8076,"lon":10.8451,"total":11, "interne":9,  "externe":2,  "col":"#1d4ed8","label_side":"left"},
    {"name":"Kairouan",  "lat":35.6781,"lon":10.1002,"total":10, "interne":8,  "externe":2,  "col":"#1d4ed8","label_side":"right"},
    {"name":"Le Kef",    "lat":36.1822,"lon":8.7147, "total":8,  "interne":7,  "externe":1,  "col":"#1d4ed8","label_side":"right"},
]
REMOTE = {"total":104,"interne":91,"externe":13}
ENCART_CITIES = {"Tunis","Ariana","Ben Arous"}

W, H = 820, 620
MAP_X, MAP_Y, MAP_W, MAP_H = 20, 60, 490, 520
# Tunisie complète — bornes alignées sur le contour réel (forme reconnaissable)
LON_MIN, LON_MAX = 7.4, 11.7
LAT_MIN, LAT_MAX = 30.1, 37.6

def merc(lat): return math.log(math.tan(math.pi/4 + math.radians(lat)/2))
MT, MB = merc(LAT_MAX), merc(LAT_MIN)

def geo2svg(lon, lat):
    x = MAP_X + (lon-LON_MIN)/(LON_MAX-LON_MIN)*MAP_W
    y = MAP_Y + (MT-merc(lat))/(MT-MB)*MAP_H
    return round(x,1), round(y,1)

def radius(total): return max(7, min(16, total//11))

# GeoJSON Tunisie — source haute résolution (399 pts, forme précise)
print("Chargement GeoJSON...")
try:
    GEO_URL = "https://raw.githubusercontent.com/georgique/world-geojson/develop/countries/tunisia.json"
    req = urllib.request.Request(GEO_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        gd = json.loads(r.read())
    feats = gd.get("features",[gd]) if "features" in gd else [gd]
    paths = []
    for feat in feats:
        geom = feat.get("geometry", feat)
        rings = geom["coordinates"] if geom["type"]=="Polygon" else [r for p in geom["coordinates"] for r in p]
        for ring in rings:
            if len(ring)<8: continue
            # Forme exacte de la Tunisie préservée (pas de simplification)
            pts = [geo2svg(c[0],c[1]) for c in ring]
            paths.append("M "+" L ".join(f"{x},{y}" for x,y in pts)+" Z")
    country_svg = "\n  ".join(f'<path d="{p}" fill="#d1fae5" stroke="#0d9488" stroke-width="1.3" stroke-linejoin="round"/>' for p in paths)
    print(f"  {len(paths)} contour(s) chargé(s)")
except Exception as e:
    print(f"Erreur GeoJSON: {e}")
    country_svg = ""

# ── Marqueurs carte principale (hors Grand Tunis) ─────────────────
markers = ""
for c in CITIES_MAIN:
    if c["name"] in ENCART_CITIES: continue
    cx, cy_geo = geo2svg(c["lon"], c["lat"])
    r = radius(c["total"])
    dy = c.get("svg_dy", 0)  # décalage visuel (Sousse/Monastir)
    cy = cy_geo + dy         # position bulle décalée
    side = c.get("label_side", "right")
    lx = cx - r - 5 if side == "left" else cx + r + 5
    anchor = "end" if side == "left" else "start"
    details = f"Source interne: {c['interne']}" + (f" | externe: {c['externe']}" if c['externe'] else "")
    # Ligne pointillée entre position réelle et bulle déplacée
    leader = f'<line x1="{cx}" y1="{cy_geo}" x2="{cx}" y2="{cy}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>' if dy != 0 else ""
    markers += f"""
  {leader}
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="{c['col']}" fill-opacity="0.85" stroke="white" stroke-width="2">
    <title>{c['name']} — {c['total']} candidatures ({details})</title>
  </circle>
  <text x="{lx}" y="{cy-2}" font-family="Arial" font-size="11" font-weight="700" fill="#1e3a5f" text-anchor="{anchor}">{c['name']}</text>
  <text x="{lx}" y="{cy+11}" font-family="Arial" font-size="10" fill="#64748b" text-anchor="{anchor}">{c['total']} candid.</text>"""

# Point Grand Tunis sur carte principale
tcx, tcy = geo2svg(10.18, 36.79)
markers += f"""
  <circle cx="{tcx}" cy="{tcy}" r="9" fill="#1d4ed8" fill-opacity="0.4" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="3,2"/>
  <text x="{tcx-12}" y="{tcy-12}" font-family="Arial" font-size="10" font-weight="700" fill="#1e3a5f" text-anchor="end">Grand Tunis</text>
  <text x="{tcx-12}" y="{tcy}" font-family="Arial" font-size="9.5" fill="#64748b" text-anchor="end">368 candidatures</text>
  <line x1="{tcx+7}" y1="{tcy-5}" x2="530" y2="145" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3"/>"""

# ── Encart Grand Tunis ─────────────────────────────────────────────
EX, EY, EW, EH = 530, 60, 270, 210
ELMIN,ELMAX = 10.09,10.32; ELATMIN,ELATMAX = 36.68,36.95
EMT,EMB = merc(ELATMAX), merc(ELATMIN)

def geo2enc(lon, lat):
    x = EX + (lon-ELMIN)/(ELMAX-ELMIN)*EW
    y = EY + (EMT-merc(lat))/(EMT-EMB)*EH
    return round(x,1), round(y,1)

encart = f"""
  <rect x="{EX}" y="{EY}" width="{EW}" height="{EH}" rx="10" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.5"/>
  <text x="{EX+10}" y="{EY+18}" font-family="Arial" font-size="11" font-weight="700" fill="#1d4ed8">Zoom — Grand Tunis</text>"""

label_offsets = {"Tunis":(18,0),"Ariana":(18,-8),"Ben Arous":(18,8)}
for c in CITIES_MAIN:
    if c["name"] not in ENCART_CITIES: continue
    ex, ey = geo2enc(c["lon"], c["lat"])
    r = radius(c["total"])
    ox, oy = label_offsets.get(c["name"], (15,0))
    encart += f"""
  <circle cx="{ex}" cy="{ey}" r="{r}" fill="{c['col']}" fill-opacity="0.88" stroke="white" stroke-width="2.5">
    <title>{c['name']} — {c['total']} candidatures</title>
  </circle>
  <text x="{ex+ox}" y="{ey+oy-2}" font-family="Arial" font-size="11" font-weight="700" fill="#1e3a5f">{c['name']}</text>
  <text x="{ex+ox}" y="{ey+oy+10}" font-family="Arial" font-size="10" fill="#64748b">{c['total']} candid.</text>"""

# ── Remote TN — cadre séparé ───────────────────────────────────────
remote_box = f"""
  <rect x="530" y="285" width="270" height="75" rx="10" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.3"/>
  <circle cx="555" cy="323" r="10" fill="#7c3aed" fill-opacity="0.85" stroke="white" stroke-width="2"/>
  <text x="572" y="315" font-family="Arial" font-size="12" font-weight="700" fill="#5b21b6">Remote / Télétravail</text>
  <text x="572" y="330" font-family="Arial" font-size="11" fill="#7c3aed">104 candidatures — Toute la Tunisie</text>
  <text x="572" y="346" font-family="Arial" font-size="10" fill="#64748b">Poste sans localisation fixe</text>"""

# ── Légende ────────────────────────────────────────────────────────
legend = f"""
  <rect x="530" y="375" width="270" height="120" rx="10" fill="white" fill-opacity="0.95" stroke="#e2e8f0" stroke-width="1.2"/>
  <text x="544" y="397" font-family="Arial" font-size="12" font-weight="700" fill="#1e3a5f">Localisation des candidatures</text>
  <circle cx="546" cy="416" r="6" fill="#1d4ed8" fill-opacity="0.85"/>
  <text x="558" y="420" font-family="Arial" font-size="11" fill="#334155">Ville physique (879)</text>
  <circle cx="546" cy="436" r="6" fill="#7c3aed" fill-opacity="0.85"/>
  <text x="558" y="440" font-family="Arial" font-size="11" fill="#334155">Remote / Télétravail (104)</text>
  <line x1="540" y1="452" x2="790" y2="452" stroke="#e2e8f0"/>
  <text x="544" y="470" font-family="Arial" font-size="12" font-weight="700" fill="#1e3a5f">983 candidatures — 7 villes</text>
  <text x="544" y="485" font-family="Arial" font-size="10" fill="#94a3b8">Source : 857 interne · 126 externe (LinkedIn…)</text>"""

# ── Bouton carte interactive ────────────────────────────────────────
btn = f"""
  <rect x="530" y="510" width="270" height="80" rx="10" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.5"/>
  <text x="544" y="533" font-family="Arial" font-size="11.5" font-weight="700" fill="#1d4ed8">Carte interactive — zoom + clic</text>
  <text x="544" y="551" font-family="Arial" font-size="10" fill="#475569">Ouvrir dans un nouvel onglet :</text>
  <text x="544" y="568" font-family="Arial" font-size="9.5" fill="#1d4ed8">localhost:8088/static/assets/tunisia_inline_map.html</text>
  <text x="544" y="583" font-family="Arial" font-size="9" fill="#94a3b8">Cliquer sur les bulles pour voir les détails</text>"""

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"
     role="img" aria-label="Carte géographique Tunisie recrutements">
  <rect width="{W}" height="{H}" fill="#f0f9ff" rx="14"/>
  <!-- TITRE -->
  <text x="{W//2}" y="38" font-family="Arial" font-size="17" font-weight="700" fill="#1e3a5f" text-anchor="middle">Candidatures par Ville — Tunisie 2021-2025</text>
  <!-- Contour géographique -->
  {country_svg}
  <!-- Marqueurs -->
  {markers}
  <!-- Encart Grand Tunis -->
  {encart}
  <!-- Remote -->
  {remote_box}
  <!-- Légende -->
  {legend}
  <!-- Bouton interactif -->
  {btn}
</svg>"""

out = "tunisia_final_v2.svg"
with open(out,"w",encoding="utf-8") as f: f.write(svg)
print(f"SVG v2 : {out}")
subprocess.run(["docker","cp",out,"superset-sirh:/app/superset/static/assets/tunisia_final_v2.svg"],check=True,capture_output=True)
print("Container : OK")
