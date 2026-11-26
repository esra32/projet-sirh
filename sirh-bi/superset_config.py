# =============================================================================
# Superset Configuration — SIRH BI
# =============================================================================

import os

# Clé secrète
SECRET_KEY = "sirh_superset_secret_key_2026"

# Activer la connexion MySQL
PREVENT_UNSAFE_DB_CONNECTIONS = False

# Langue française
BABEL_DEFAULT_LOCALE = "fr"
BABEL_DEFAULT_FOLDER = "superset/translations"

# Permet la connexion à MySQL local (host.docker.internal)
SQLALCHEMY_EXAMPLES_URI = "sqlite:////app/superset_home/examples.db"

# Feature flags utiles
FEATURE_FLAGS = {
    "ENABLE_TEMPLATE_PROCESSING": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_RBAC": False,      # Désactivé : dashboards visibles à tous les connectés
    "ROW_LEVEL_SECURITY": True,   # RLS actif : données filtrées par département
}

# Timeout des requêtes (secondes)
SUPERSET_WEBSERVER_TIMEOUT = 300
HTML_SANITIZATION = False
HTML_SANITIZATION_SCHEMA_EXTENSIONS = {}

# =============================================================================
# Carte géographique — MapTiler (gratuit, sans carte bancaire)
# mapbox-gl 1.x charge le style MapTiler ; la clé sert de token react-map-gl
# =============================================================================
MAPBOX_API_KEY = "7LtWqh6nJb55xvALcrCx"

# Désactiver Talisman/CSP pour autoriser les tuiles externes api.maptiler.com
TALISMAN_ENABLED = False

