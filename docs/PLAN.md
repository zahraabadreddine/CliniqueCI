# PLAN.md — CliniqueCI

## Phase 1 — Fondations (Semaine 1)

- [x] CLAUDE.md (~37 règles)
- [x] docs/PRD.md
- [x] docs/PLAN.md
- [x] Init repo Git + GitHub
- [x] `server/` : package.json, knexfile, structure Express
- [x] Migrations : organizations, users, patients, appointments, consultations, prescriptions, refresh_tokens
- [x] Seeds : 2 cliniques, utilisateurs de test, patients de test
- [x] Middleware : authenticate, tenant, authorize, errorHandler
- [x] Route auth : register, login, logout, refresh

## Phase 2 — API métier (Semaine 2)

- [x] Routes patients (CRUD + history + /me pour le rôle patient)
- [x] Routes appointments (créer, lister par date/médecin, changer statut)
- [x] Routes consultations (créer, lire)
- [x] Routes prescriptions (créer, lire)
- [x] Routes users (lister équipe, inviter, GET/:id, PATCH/:id)
- [x] Route awa (assistant IA Awa, mode démo sans clé API)
- [x] Validations Joi dans `src/validators/` (un fichier par route)
- [x] Tests Jest + Supertest : auth, isolation multi-tenant, routes métier (120 tests)

## Phase 3 — Frontend (Semaine 3)

- [x] `client/` : Vite + React + Tailwind (couleurs CliniqueCI)
- [x] Layout + navigation par rôle
- [x] Pages : Login, Dashboard (vue admin/médecin + vue patient)
- [x] AppointmentBooker (vue patient)
- [x] DoctorAgenda (vue médecin)
- [x] PatientFile + ConsultationForm + PrescriptionEditor
- [x] PatientHistory (vue patient)
- [x] TeamManager (vue admin)
- [x] AIPanel — assistant Awa intégré dans le dashboard

## Phase 4 — Déploiement (Semaine 4)

- [x] Dockerfile server + client
- [x] docker-compose.yml (postgres + server + client + nginx)
- [x] nginx.conf (reverse proxy + HTTPS Let's Encrypt + redirect HTTP→HTTPS)
- [x] PM2 ecosystem.config.js
- [x] GitHub Actions CI (tests + couverture)
- [ ] Déploiement VPS
- [x] README.md final avec pitch, instructions, structure, démo
