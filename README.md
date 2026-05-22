# CliniqueCI

> Logiciel SaaS multi-tenant de gestion de cliniques privées pour Abidjan — prise de RDV en ligne, dossiers médicaux numériques, ordonnances, facturation.

[![CI](https://github.com/zahraabadreddine/CliniqueCI/actions/workflows/ci.yml/badge.svg)](https://github.com/zahraabadreddine/CliniqueCI/actions/workflows/ci.yml)

---

## Pitch

Les cliniques privées d'Abidjan gèrent encore leurs patients sur papier : registres de RDV manuels, dossiers physiques, ordonnances manuscrites. **CliniqueCI** digitalise tout ça — chaque clinique obtient son espace isolé, son équipe, ses patients. Conçu pour la réalité africaine : fonctionne sur téléphone, économe en bande passante.

---

## Captures d'écran

> Screenshots disponibles après déploiement VPS.

---

## Démo en ligne

> 🚧 Déploiement VPS en cours — la démo sera disponible prochainement.

Pour tester en local, utiliser les comptes créés par `node scripts/seed-demo.js` :

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@clinique-plateau.ci` | `Password123!` |
| Médecin | `aminata@clinique-plateau.ci` | `Password123!` |
| Secrétaire | `rana@clinique-plateau.ci` | `Password123!` |
| Patient | `karim@email.ci` | `Password123!` |

---

## Stack technique

| Couche | Technologies |
|---|---|
| **Backend** | Node.js 20, Express, Knex, PostgreSQL 16 |
| **Frontend** | React 18, Vite, Tailwind CSS, TanStack Query |
| **Auth** | JWT (httpOnly cookies) + Refresh tokens |
| **IA** | Anthropic Claude (assistant Awa) |
| **Tests** | Jest, Supertest (120 tests, couverture ≥ 70%) |
| **Déploiement** | Docker Compose, nginx, PM2, Let's Encrypt |
| **CI/CD** | GitHub Actions |

---

## Architecture multi-tenant

```
┌─────────────────────────────────────────────────┐
│                   nginx (HTTPS)                  │
│              cliniqueci.votredomaine.com          │
└────────────┬───────────────────┬────────────────┘
             │                   │
     ┌───────▼──────┐   ┌───────▼──────┐
     │  React/Vite  │   │  Express API  │
     │   (client)   │   │   /api/*      │
     └──────────────┘   └───────┬──────┘
                                │
                    ┌───────────▼───────────┐
                    │      PostgreSQL        │
                    │  organization_id sur   │
                    │  toutes les tables     │
                    └───────────────────────┘
```

Chaque clinique = un **tenant isolé**. Un médecin de la Clinique A ne voit jamais les patients de la Clinique B — filtrage systématique par `organization_id` à chaque query.

---

## Installation locale

### Prérequis

- Node.js 20+
- PostgreSQL 16+
- npm

### 1. Cloner le repo

```bash
git clone https://github.com/zahraabadreddine/CliniqueCI.git
cd CliniqueCI
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer `.env` :

```env
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=cliniqueci_dev
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=changez-moi-secret-long-aleatoire
JWT_REFRESH_SECRET=changez-moi-autre-secret-long

# Optionnel — laisser vide pour utiliser le mode démo d'Awa
ANTHROPIC_API_KEY=
```

### 3. Installer les dépendances

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 4. Créer la base de données et lancer les migrations

```bash
createdb cliniqueci_dev

cd server
npm run migrate    # knex migrate:latest
npm run seed       # knex seed:run
```

### 5. Démarrer en développement

```bash
# Terminal 1 — API
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Ouvrir **http://localhost:5173**

Comptes de test (créés par le seed) :

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@cabinet-cocody.ci` | `password123` |
| Médecin | `aminata@clinique-plateau.ci` | `password123` |
| Secrétaire | `rana@clinique-plateau.ci` | `password123` |
| Patient | `karim@email.ci` | `password123` |

> Pour des données de démo plus riches : `cd server && node scripts/seed-demo.js`

---

## Lancer avec Docker

```bash
cp .env.example .env
# (éditer .env avec vos valeurs)

docker compose -f docker-compose.dev.yml up --build
```

Ouvrir **http://localhost:5173**

---

## Tests

```bash
cd server

# Créer la base de test (une seule fois)
createdb cliniqueci_test

# Lancer les tests
npm test

# Avec couverture
npm test -- --coverage
```

**Résultat attendu : 120 tests, 9 suites, couverture ≥ 70%**

---

## Déploiement VPS

### Prérequis serveur

- Ubuntu 22.04+
- Docker + Docker Compose
- Domaine pointant vers l'IP du VPS

### Étapes

```bash
# 1. Cloner sur le serveur
git clone https://github.com/zahraabadreddine/CliniqueCI.git
cd CliniqueCI

# 2. Configurer l'environnement de production
cp .env.example .env
# (éditer .env avec les vraies valeurs)

# 3. Obtenir le certificat Let's Encrypt (remplacer le domaine)
docker run --rm -p 80:80 \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d cliniqueci.votredomaine.com

# 4. Lancer en production
docker compose up -d --build

# 5. (Optionnel) PM2 pour le serveur Node hors Docker
cd server && pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

---

## Structure du projet

```
CliniqueCI/
├── .github/
│   └── workflows/ci.yml          # Pipeline CI/CD
├── client/                        # Frontend React/Vite
│   ├── src/
│   │   ├── components/            # Composants réutilisables
│   │   ├── pages/                 # Pages par fonctionnalité
│   │   ├── lib/api.js             # Fetch wrapper
│   │   └── App.jsx                # Routing + PrivateRoute
│   └── nginx-spa.conf             # Config nginx SPA
├── server/                        # Backend Express
│   ├── migrations/                # Migrations Knex (001–008)
│   ├── seeds/                     # Données de test
│   ├── src/
│   │   ├── middleware/            # authenticate, tenant, authorize, errorHandler
│   │   ├── routes/                # auth, users, patients, appointments…
│   │   └── validators/            # Schémas Joi par route
│   └── tests/                     # Tests Jest + Supertest
├── docs/
│   ├── PRD.md                     # Product Requirements Document
│   └── PLAN.md                    # Plan de développement
├── docker-compose.yml             # Production
├── docker-compose.dev.yml         # Développement local
├── nginx.conf                     # Reverse proxy + HTTPS
├── ecosystem.config.js            # PM2
├── CLAUDE.md                      # Règles du projet (37 règles)
└── .env.example                   # Variables d'environnement documentées
```

---

## Fonctionnalités

### Pour l'admin (médecin propriétaire)
- ✅ Tableau de bord : KPIs du jour, RDV à venir
- ✅ Gestion de l'équipe (inviter médecins, secrétaires)
- ✅ Vue globale de l'agenda
- ✅ Accès à tous les dossiers patients

### Pour le médecin
- ✅ Agenda personnel du jour
- ✅ Démarrer une consultation depuis un RDV
- ✅ Saisir compte-rendu (motif, examen, diagnostic)
- ✅ Émettre une ordonnance
- ✅ Historique patient complet

### Pour la secrétaire
- ✅ Créer/modifier des dossiers patients
- ✅ Prendre/modifier/annuler des RDV
- ✅ Gérer l'agenda de tous les médecins

### Pour le patient
- ✅ Prendre un RDV en ligne
- ✅ Consulter ses RDV passés et à venir
- ✅ Accéder à ses ordonnances

### Assistant IA — Awa
- ✅ Assistant médical contextuel (adapté au rôle)
- ✅ Aide au diagnostic différentiel (médecins)
- ✅ Gestion des RDV (secrétaires)
- ✅ Mode démo sans clé API

---

## Auteur

**Zahraa Badreddine** — Capstone · Engineering with Claude Code, juin 2026  
Encadrant : George E. Salloum · Frontal

---

## Licence

MIT
