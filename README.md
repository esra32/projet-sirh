# SIRH — Système d'Information des Ressources Humaines

Plateforme RH complète : gestion des employés, recrutement avec IA, et Business Intelligence.

Le projet est composé de trois parties :

| Partie | Dossier | Technologies |
|---|---|---|
| **Backend** (microservices) | `sirh-backend/` | Java 17, Spring Boot, MySQL, Keycloak |
| **Frontend** | `sirh-frontend/` | Angular 17 |
| **Business Intelligence** | `sirh-bi/` | Python, Airflow, dbt, Superset |

---

## Prérequis

- **Java 17**
- **Maven** (ou `mvnd`)
- **Node.js 18+** et **npm** (pour le frontend)
- **MySQL 8+** sur `localhost:3306` (identifiants `root` / `root`)
- **Docker** + **Docker Compose** (pour la partie BI : Airflow, Superset)
- **Python 3.10+** (pour les scripts BI)
- **Keycloak 26.5.6** (voir ci-dessous)

---

## Installation de Keycloak

Keycloak n'est **pas** inclus dans ce dépôt (c'est un logiciel tiers). À télécharger séparément :

1. Télécharger **Keycloak 26.5.6** : https://www.keycloak.org/downloads
2. Décompresser l'archive (ex : `C:\keycloak-26.5.6`)
3. Lancer le serveur :
   ```bash
   # Windows
   bin\kc.bat start-dev
   # Linux / Mac
   bin/kc.sh start-dev
   ```
4. Keycloak démarre sur http://localhost:8080 (adapter le port si besoin dans la config backend).

---

## Lancer le backend

Le backend est composé de 4 microservices. **Démarrer les services avant le gateway.**

```bash
cd sirh-backend

# Variable d'environnement obligatoire (identique pour tous les services)
export JWT_SECRET="a-very-long-random-secret-key-at-least-256-bits-long-abc123"
# Optionnel (IA) :
export GEMINI_API_KEY="votre-cle-google-gemini"

# Chaque commande dans un terminal séparé :
mvn -pl auth-service spring-boot:run          # port 8081
mvn -pl employee-service spring-boot:run       # port 8082
mvn -pl recruitment-service spring-boot:run    # port 8083
mvn -pl api-gateway spring-boot:run            # port 8080  (point d'entrée)
```

Point d'entrée unique : **http://localhost:8080**

### Comptes de démonstration

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@hr.sirh.com` | `admin123` | HR_ADMIN |
| `manager@mgr.sirh.com` | `manager123` | MANAGER |
| `employee@sirh.com` | `employee123` | EMPLOYEE |

---

## Lancer le frontend

```bash
cd sirh-frontend
npm install
npm start
```

Application disponible sur **http://localhost:4200**

---

## Lancer la Business Intelligence

```bash
cd sirh-bi

# Airflow (orchestration ETL)
cd airflow
docker compose up -d

# Superset (dashboards)
cd ..
docker compose -f docker-compose.superset.yml up -d
```

- **Airflow** : http://localhost:8080 (adapter le port si conflit avec le gateway)
- **Superset** : http://localhost:8088

Les transformations de données sont dans `sirh-bi/dbt_sirh/` (dbt).

---

## Structure du projet

```
essra/
├── sirh-backend/     → microservices Spring Boot (auth, employee, recruitment, gateway)
├── sirh-frontend/    → application Angular
└── sirh-bi/          → ETL Airflow, modèles dbt, dashboards Superset, scripts Python
```

---

## Notes

- Les **secrets** (clés API, mots de passe) ne sont pas versionnés : à définir via variables d'environnement.
- Les clés JWT (`JWT_SECRET`) doivent être **identiques** sur les 4 microservices.
- Keycloak est optionnel (SSO) ; l'authentification JWT interne fonctionne sans.