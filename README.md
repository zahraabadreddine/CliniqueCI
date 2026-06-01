# CliniqueCI

> Logiciel SaaS multi-tenant de gestion de cliniques privées pour Abidjan — prise de RDV en ligne, dossiers médicaux numériques, ordonnances, facturation, rappels SMS, file d'attente, gestion des stocks et conformité RGPD.

[![CI](https://github.com/zahraabadreddine/CliniqueCI/actions/workflows/ci.yml/badge.svg)](https://github.com/zahraabadreddine/CliniqueCI/actions/workflows/ci.yml)

---

## Pitch

Les cliniques privées d'Abidjan gèrent encore leurs patients sur papier : registres de RDV manuels, dossiers physiques, ordonnances manuscrites. **CliniqueCI** digitalise tout ça — chaque clinique obtient son espace isolé, son équipe, ses patients. Conçu pour la réalité africaine : fonctionne sur téléphone, économe en bande passante.

---

## Démo en ligne

| | URL |
|---|---|
| 🌐 **Frontend** | https://cliniqueci.vercel.app |
| ⚙️ **API** | https://cliniqueci-api.onrender.com |

> ⏱️ L'API est hébergée sur Render (free tier) — le serveur se met en veille après 15 min d'inactivité. La première connexion peut prendre 30–60 secondes. Le frontend est sur Vercel (toujours disponible, routing SPA natif).

**Comptes de démonstration** (créés par `npm run seed`) :

| Clinique | Rôle | Email | Mot de passe |
|---|---|---|---|
| Clinique du Plateau | Admin | `admin@clinique-plateau.ci` | `Password123!` |
| Clinique du Plateau | Médecin | `dr.kone@clinique-plateau.ci` | `Password123!` |
| Clinique du Plateau | Médecin | `dr.traore@clinique-plateau.ci` | `Password123!` |
| Clinique du Plateau | Secrétaire | `secretaire@clinique-plateau.ci` | `Password123!` |
| Clinique du Plateau | Patient | `karim.meite@email.ci` | `Password123!` |
| Cabinet Médical Cocody | Admin | `admin@cabinet-cocody.ci` | `Password123!` |
| Cabinet Médical Cocody | Médecin | `dr.bamba@cabinet-cocody.ci` | `Password123!` |

---

## Stack technique

| Couche | Technologies |
|---|---|
| **Backend** | Node.js 20, Express 4, Knex 3, PostgreSQL 16 |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, TanStack Query v5 |
| **Auth** | JWT (httpOnly cookies) + Refresh tokens révocables |
| **Formulaires** | react-hook-form v7 |
| **SMS** | Twilio (mode mock en dev, réel en production) |
| **Notifications push** | Web Push API + VAPID (web-push) |
| **Assistant IA** | Anthropic Claude — assistant Awa |
| **Tests** | Jest 29, Supertest — 17 suites, couverture ≥ 70% |
| **Déploiement** | Docker Compose, nginx, PM2, Let's Encrypt |
| **CI/CD** | GitHub Actions |

---

## Architecture multi-tenant

```
┌──────────────────────────────────────────────────┐
│                  nginx (HTTPS)                    │
│             cliniqueci.votredomaine.com            │
└────────────┬────────────────────┬────────────────┘
             │                    │
     ┌───────▼──────┐    ┌───────▼──────┐
     │  React/Vite  │    │  Express API  │
     │   (client)   │    │   /api/*      │
     └──────────────┘    └───────┬──────┘
                                 │
                     ┌───────────▼───────────┐
                     │      PostgreSQL        │
                     │  organization_id sur   │
                     │  toutes les tables     │
                     └───────────────────────┘
```

Chaque clinique = un **tenant isolé**. Un médecin de la Clinique A ne voit jamais les patients de la Clinique B — filtrage systématique par `organization_id` à chaque query, injecté automatiquement par le middleware `tenant`.

**Pipeline middleware sur chaque route protégée :**
```
authenticate → tenant → authorize(roles)
```

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
# Variables racine (Docker production)
cp .env.example .env

# Variables serveur (développement)
cp server/.env.example server/.env
```

Éditer `server/.env` :

```env
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173

DATABASE_URL=postgresql://cliniqueci:devpassword@localhost:5432/cliniqueci_dev
TEST_DATABASE_URL=postgresql://cliniqueci:devpassword@localhost:5432/cliniqueci_test

JWT_SECRET=changez-moi-secret-long-aleatoire-64-chars
JWT_REFRESH_SECRET=changez-moi-autre-secret-long-64-chars

# Optionnel — laisser vide pour le mode démo d'Awa
ANTHROPIC_API_KEY=

# Optionnel — laisser vide pour mock SMS (logs console)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=

# Optionnel — requis pour les notifications push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:admin@votre-clinique.ci
```

> Générer des clés VAPID : `npx web-push generate-vapid-keys`

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
createdb cliniqueci_test   # pour les tests

cd server
npm run migrate    # knex migrate:latest  (20 migrations)
npm run seed       # knex seed:run  (2 cliniques, 7 users, 15 patients, RDV...)
```

### 5. Démarrer en développement

```bash
# Terminal 1 — API (port 3001)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Ouvrir **http://localhost:5173**

---

## Lancer avec Docker (développement)

`docker-compose.dev.yml` démarre **uniquement PostgreSQL**. Le serveur et le frontend tournent en local via `npm run dev`.

```bash
cp .env.example .env

# Démarre uniquement PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Puis dans deux terminaux :
cd server && npm run dev   # API sur :3001
cd client && npm run dev   # Frontend sur :5173
```

---

## Tests

```bash
cd server

# Lancer les tests
npm test

# Avec rapport de couverture
npm run test:coverage
```

**17 suites de tests, couverture ≥ 70% sur `src/routes/` et `src/middleware/`**

Chaque suite couvre :
- ✅ Happy path (200/201)
- ✅ Accès refusé (401 sans token, 403 mauvais rôle)
- ✅ Validation payload (400)
- ✅ Isolation multi-tenant (org A ≠ org B)

| Suite de tests | Routes couvertes |
|---|---|
| `auth.test.js` | `/api/auth` — register, login, logout, refresh |
| `users.test.js` | `/api/users` — CRUD utilisateurs |
| `patients.test.js` | `/api/patients` — CRUD patients |
| `appointments.test.js` | `/api/appointments` — RDV, statuts |
| `consultations.test.js` | `/api/consultations` — dossiers médicaux |
| `prescriptions.test.js` | `/api/prescriptions` — ordonnances |
| `invoices.test.js` | `/api/invoices` — facturation |
| `auditLogs.test.js` | `/api/audit-logs` — journaux d'audit |
| `notifications.test.js` | `/api/notifications` — push, VAPID |
| `gdpr.test.js` | `/api/gdpr` — export, anonymisation |
| `consent.test.js` | `/api/consent` — formulaires, signatures |
| `recordShares.test.js` | `/api/record-shares` — partage dossiers |
| `smsReminders.test.js` | `/api/sms-reminders` — rappels SMS |
| `stock.test.js` | `/api/stock` — inventaire médicaments |
| `queue.test.js` | `/api/queue` — file d'attente |
| `awa.test.js` | `/api/awa` — assistant IA |
| `tenant-isolation.test.js` | Isolation cross-routes |

---

## Routes API

| Méthode | Route | Description | Rôles |
|---|---|---|---|
| POST | `/api/auth/register` | Créer une clinique + admin | Public |
| POST | `/api/auth/login` | Connexion (rate-limited : 10/15min) | Public |
| POST | `/api/auth/logout` | Déconnexion | Authentifié |
| POST | `/api/auth/refresh` | Renouveler le token | Authentifié |
| GET/POST | `/api/users` | Lister / créer utilisateurs | Admin |
| GET/PATCH/DELETE | `/api/users/:id` | Détail / modifier / désactiver | Admin |
| GET/POST | `/api/patients` | Lister / créer patients | Admin, Médecin, Secrétaire |
| GET/PATCH/DELETE | `/api/patients/:id` | Détail / modifier / archiver | Admin, Médecin, Secrétaire |
| GET/POST | `/api/appointments` | Lister / créer RDV | Tous |
| PATCH/DELETE | `/api/appointments/:id` | Modifier statut / annuler | Tous |
| GET/POST | `/api/consultations` | Dossiers médicaux | Admin, Médecin |
| GET/PATCH | `/api/consultations/:id` | Détail / modifier | Admin, Médecin |
| GET/POST | `/api/prescriptions` | Ordonnances | Admin, Médecin |
| GET | `/api/prescriptions/:id` | Détail ordonnance | Admin, Médecin, Patient |
| GET/POST | `/api/invoices` | Factures | Admin, Secrétaire |
| PATCH | `/api/invoices/:id` | Marquer payée | Admin, Secrétaire |
| GET | `/api/audit-logs` | Journal d'audit (paginé) | Admin |
| GET | `/api/notifications` | Notifications utilisateur | Authentifié |
| PATCH | `/api/notifications/:id/read` | Marquer lue | Authentifié |
| GET | `/api/notifications/vapid-public-key` | Clé VAPID publique | Public |
| POST/DELETE | `/api/notifications/push-subscribe` | Abonnement push | Authentifié |
| GET | `/api/gdpr/export/:patientId` | Export données RGPD | Admin, Médecin |
| POST | `/api/gdpr/anonymize/:patientId` | Anonymiser patient | Admin |
| GET/POST | `/api/consent/forms` | Formulaires de consentement | Secrétaire |
| PATCH | `/api/consent/forms/:id` | Modifier formulaire | Secrétaire |
| GET/POST | `/api/consent/signatures` | Signatures | Secrétaire |
| PATCH | `/api/consent/signatures/:id/sign` | Signer | Secrétaire |
| POST | `/api/record-shares/consent-code` | Générer code partage | Admin |
| GET | `/api/record-shares/outgoing` | Demandes sortantes | Admin |
| GET | `/api/record-shares/incoming` | Demandes entrantes | Admin |
| POST | `/api/record-shares` | Créer demande | Admin |
| PATCH | `/api/record-shares/:id` | Approuver / refuser | Admin |
| GET | `/api/record-shares/:id/records` | Accéder dossiers partagés | Admin |
| GET/POST | `/api/sms-reminders` | Rappels SMS | Admin, Secrétaire |
| GET/POST | `/api/stock` | Inventaire produits | Admin, Secrétaire |
| POST | `/api/stock/:id/movement` | Mouvement stock | Admin, Secrétaire |
| GET/POST | `/api/queue` | File d'attente | Admin, Secrétaire, Médecin |
| PATCH | `/api/queue/:id` | Appeler / terminer | Admin, Secrétaire, Médecin |
| POST | `/api/awa` | Assistant IA Awa | Authentifié |

---

## Fonctionnalités

### Admin (propriétaire de la clinique)
- ✅ Tableau de bord — KPIs, RDV du jour, revenus, taux d'occupation
- ✅ Gestion de l'équipe (inviter médecins et secrétaires, activer/désactiver)
- ✅ Vue globale de l'agenda de tous les médecins
- ✅ Accès à tous les dossiers patients
- ✅ Journal d'audit des actions sensibles
- ✅ Export et anonymisation RGPD des données patients
- ✅ Gestion des partages de dossiers inter-cliniques

### Médecin
- ✅ Agenda personnel du jour + planning hebdomadaire
- ✅ Démarrer une consultation depuis un RDV
- ✅ Saisir compte-rendu (motif, examen clinique, diagnostic)
- ✅ Émettre une ordonnance numérique
- ✅ Historique complet du patient (consultations, prescriptions, factures)
- ✅ Statistiques personnelles (patients vus, consultations par mois)

### Secrétaire
- ✅ Créer / modifier / archiver des dossiers patients
- ✅ Prendre / modifier / annuler des RDV pour tous les médecins
- ✅ Gérer la file d'attente en salle d'attente
- ✅ Envoyer des rappels SMS manuels ou automatiques
- ✅ Gérer le stock de médicaments et fournitures
- ✅ Créer et faire signer les formulaires de consentement

### Patient
- ✅ Prendre un RDV en ligne
- ✅ Consulter ses RDV passés et à venir
- ✅ Accéder à ses ordonnances
- ✅ Vérifier une ordonnance par QR code

### Assistant IA — Awa
- ✅ Assistant médical contextuel (adapté au rôle connecté)
- ✅ Aide au diagnostic différentiel (médecins)
- ✅ Gestion des RDV par langage naturel (secrétaires)
- ✅ Mode démo sans clé API (réponses simulées)

---

## Structure du projet

```
CliniqueCI/
├── .github/
│   └── workflows/ci.yml          # Pipeline CI (tests + build)
├── client/                        # Frontend React/Vite
│   ├── public/
│   │   ├── favicon.svg
│   │   └── sw.js                  # Service worker (push notifications)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopBar.jsx
│   │   │   ├── Logo.jsx
│   │   │   ├── NotificationsDropdown.jsx
│   │   │   ├── Icon.jsx
│   │   │   └── AIPanel.jsx        # Assistant Awa
│   │   ├── hooks/
│   │   │   └── usePushNotifications.js
│   │   ├── pages/                 # 28 pages
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── DoctorHomePage.jsx
│   │   │   ├── SecretaryHomePage.jsx
│   │   │   ├── AppointmentsPage.jsx
│   │   │   ├── NewAppointmentPage.jsx
│   │   │   ├── WeeklyPlanningPage.jsx
│   │   │   ├── PatientsPage.jsx
│   │   │   ├── ConsultationsPage.jsx
│   │   │   ├── PrescriptionsPage.jsx
│   │   │   ├── InvoicesPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   ├── QueuePage.jsx
│   │   │   ├── StockPage.jsx
│   │   │   ├── SmsRemindersPage.jsx
│   │   │   ├── NotificationsPage.jsx
│   │   │   ├── AuditLogsPage.jsx
│   │   │   ├── GdprPage.jsx
│   │   │   ├── ConsentPage.jsx
│   │   │   ├── RecordSharesPage.jsx
│   │   │   ├── DoctorStatsPage.jsx
│   │   │   ├── WhatsAppLogsPage.jsx
│   │   │   ├── MyAppointmentsPage.jsx
│   │   │   ├── MyRecordsPage.jsx
│   │   │   ├── PatientShellPage.jsx
│   │   │   └── VerifyPrescriptionPage.jsx
│   │   ├── lib/api.js             # Fetch wrapper (token refresh auto)
│   │   └── App.jsx                # Routing + PrivateRoute
│   ├── tailwind.config.js
│   └── index.html
├── server/                        # Backend Express
│   ├── migrations/                # 20 migrations Knex (001–020)
│   ├── seeds/
│   │   ├── 001_seed_cliniqueci.js # 2 cliniques, 7 users, 15 patients, RDV…
│   │   └── 002_seed_new_features.js
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── authenticate.js    # Vérifie le JWT
│   │   │   ├── tenant.js          # Injecte organization_id
│   │   │   ├── authorize.js       # Vérifie le rôle
│   │   │   ├── errorHandler.js    # Centralise les erreurs 500
│   │   │   └── auditLog.js        # Journalise les actions sensibles
│   │   ├── routes/                # 16 routeurs Express
│   │   │   ├── auth.js            # + rate limiting login
│   │   │   ├── users.js
│   │   │   ├── patients.js
│   │   │   ├── appointments.js
│   │   │   ├── consultations.js
│   │   │   ├── prescriptions.js
│   │   │   ├── invoices.js
│   │   │   ├── auditLogs.js
│   │   │   ├── notifications.js
│   │   │   ├── gdpr.js
│   │   │   ├── consent.js
│   │   │   ├── recordShares.js
│   │   │   ├── smsReminders.js
│   │   │   ├── stock.js
│   │   │   ├── queue.js
│   │   │   └── awa.js
│   │   ├── services/
│   │   │   ├── smsService.js      # Twilio (mock si env vide)
│   │   │   ├── smsCron.js         # Rappels automatiques node-cron
│   │   │   └── notifications.js   # Web Push VAPID
│   │   ├── validators/            # Schémas Joi par route
│   │   ├── lib/db.js              # Instance Knex
│   │   └── app.js                 # Express + montage routes
│   ├── tests/                     # 17 suites Jest + Supertest
│   └── package.json
├── docs/
│   ├── PRD.md                     # Product Requirements Document
│   └── PLAN.md                    # Plan de développement
├── docker-compose.yml             # Production (postgres + server + client + nginx)
├── docker-compose.dev.yml         # Dev (postgres uniquement)
├── nginx.conf                     # Reverse proxy HTTPS + SPA routing
├── ecosystem.config.js            # PM2
├── CLAUDE.md                      # Règles du projet (37+ règles)
├── .env.example                   # Variables Docker production
└── server/.env.example            # Variables serveur documentées
```

---

## Base de données — migrations

| # | Fichier | Contenu |
|---|---|---|
| 001 | `create_organizations` | Table `organizations` |
| 002 | `create_users` | Table `users` + rôles |
| 003 | `create_patients` | Table `patients` |
| 004 | `create_appointments` | Table `appointments` |
| 005 | `create_consultations` | Table `consultations` |
| 006 | `create_prescriptions` | Table `prescriptions` |
| 007 | `create_refresh_tokens` | Table `refresh_tokens` |
| 008 | `patch_appointments` | Index + champs doctor_id |
| 009 | `create_invoices` | Table `invoices` |
| 010 | `add_waiting_status` | Statut `waiting` sur appointments |
| 011 | `add_specialty_to_users` | Champ `specialty` sur users |
| 012 | `add_isactive_and_audit_logs` | `is_active` + table `audit_logs` |
| 013 | `invoices_collection_tracking` | Suivi encaissement factures |
| 014 | `create_whatsapp_logs` | Table `whatsapp_logs` |
| 015 | `create_notifications` | Table `notifications` |
| 016 | `create_push_subscriptions` | Table `push_subscriptions` |
| 017 | `appointments_unique_slot` | Contrainte unicité créneau |
| 018 | `new_features` | Tables : `sms_reminders`, `stock_items`, `stock_movements`, `queue_tokens`, `consent_forms`, `consent_signatures`, `record_share_requests` |
| 019 | `add_chronic_diseases_to_patients` | Champ `chronic_diseases` |
| 020 | `sms_retry_count` | Compteur de tentatives SMS |

---

## Déploiement (production actuelle)

Le frontend est hébergé sur **Vercel** et le backend sur **Render** :

| Service | Plateforme | Type | URL |
|---|---|---|---|
| `cliniqueci-client` | Vercel | Static (Vite) | https://cliniqueci.vercel.app |
| `cliniqueci-api` | Render | Web Service (Node) | https://cliniqueci-api.onrender.com |
| `cliniqueci-db` | Render | PostgreSQL | *(interne Render)* |

### Déployer le frontend sur Vercel

1. Aller sur [vercel.com](https://vercel.com) → **Add New Project** → importer le repo GitHub
2. Configurer :
   - **Root Directory** : `client`
   - **Build Command** : `npm run build` *(auto-détecté)*
   - **Output Directory** : `dist` *(auto-détecté)*
3. Ajouter la variable d'environnement :
   - `VITE_API_URL` = `https://cliniqueci-api.onrender.com/api`
4. Cliquer **Deploy**

> ✅ Vercel gère le routing SPA nativement — plus de 404 au Ctrl+Shift+R.

### Variables d'environnement requises

**cliniqueci-api** (Render) :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(Internal Database URL de Render PostgreSQL)* |
| `JWT_SECRET` | *(chaîne secrète longue)* |
| `CLIENT_URL` | `https://cliniqueci.vercel.app` |

**cliniqueci-client** (Vercel) :

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | `https://cliniqueci-api.onrender.com/api` |

### Migrations & Seeds

Les migrations et seeds s'exécutent **automatiquement au démarrage** du serveur (`src/index.js`) — aucune commande manuelle requise.

---

## Déploiement VPS

### Prérequis serveur

- Ubuntu 22.04+
- Docker + Docker Compose v2
- Domaine pointant vers l'IP du VPS

### Étapes

```bash
# 1. Cloner sur le serveur
git clone https://github.com/zahraabadreddine/CliniqueCI.git
cd CliniqueCI

# 2. Configurer l'environnement de production
cp .env.example .env
cp server/.env.example server/.env
# (éditer les deux .env avec les vraies valeurs)

# 3. Obtenir le certificat Let's Encrypt
docker run --rm -p 80:80 \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d cliniqueci.votredomaine.com

# 4. Lancer en production
docker compose up -d --build

# 5. (Optionnel) PM2 hors Docker
cd server && pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

---

## Sécurité

- **JWT** dans cookies `httpOnly; Secure; SameSite=None` (production) / `SameSite=Strict` (dev) — pas de `localStorage`
- **Refresh tokens** stockés en base et révocables à la déconnexion
- **Rate limiting** : 10 tentatives de connexion / 15 min par IP
- **Bcrypt** rounds = 12 pour tous les mots de passe
- **Multi-tenant** : `organization_id` vérifié sur 100% des queries
- **Audit log** : toutes les actions sensibles (create/update/delete) sont tracées
- **RGPD** : export complet et anonymisation des données patients disponibles

---

## Auteur

**Zahraa Badreddine** — Capstone · Engineering with Claude Code, juin 2026  
Encadrant : George E. Salloum · Frontal

---

## Licence

MIT
