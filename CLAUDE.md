# CLAUDE.md — CliniqueCI

## Contexte projet
Application SaaS multi-tenant de gestion de cliniques privées pour Abidjan.
Stack : Node.js + Express + Knex + PostgreSQL (backend) · React + Vite + Tailwind (frontend).

---

## Architecture & Multi-tenancy

1. Chaque clinique est un **tenant** isolé via `organization_id` sur toutes les tables métier.
2. Toute requête authentifiée extrait `organization_id` du JWT et l'injecte via le middleware `tenant`.
3. Un utilisateur ne peut jamais accéder aux données d'une autre organisation — vérification systématique dans chaque query.
4. Les migrations Knex ajoutent `organization_id NOT NULL` + index sur toutes les tables métier.
5. Les seeds créent au minimum 2 organisations distinctes pour tester l'isolation.

---

## Backend (server/)

6. Toutes les routes API sont préfixées `/api/`.
7. Chaque routeur Express reçoit `db` en paramètre (injection de dépendance, pas d'import global).
8. Les erreurs sont centralisées via un middleware `errorHandler` — jamais de `res.status(500).json(...)` éparpillé.
9. Les mots de passe sont hashés avec `bcrypt` (rounds = 12) — jamais en clair en base.
10. Les tokens JWT sont dans des cookies `httpOnly; Secure; SameSite=Strict` — jamais dans `localStorage`.
11. Le refresh token est stocké en base (table `refresh_tokens`) et révocable.
12. Chaque route protégée passe par les middlewares dans cet ordre : `authenticate` → `tenant` → `authorize(roles)`.
13. Les validations de payload utilisent `joi` — une schema par endpoint, définie dans `src/validators/`.
14. Jamais de `SELECT *` en production — lister explicitement les colonnes retournées.
15. Les transactions Knex (`trx`) sont utilisées pour toute opération multi-table.

---

## Base de données

16. Les migrations sont numérotées `NNN_description.js` et jamais modifiées après merge sur `main`.
17. Toutes les tables ont `id` (uuid, default `gen_random_uuid()`), `created_at`, `updated_at`.
18. Les clés étrangères ont des contraintes FK explicites avec `onDelete('CASCADE')` ou `'RESTRICT'` selon la logique.
19. Les index sont créés sur : `organization_id`, colonnes de filtre fréquent (`doctor_id`, `date`, `patient_id`).
20. Les enums PostgreSQL (`status`, `role`) sont définis comme `CHECK` constraints en migration.

---

## Frontend (client/)

21. Couleur primaire : `#0d7a5f` (vert teal) · Fond : `#faf9f5` · Texte clair : `#faf8f3`.
22. Chaque composant a 3 états : `loading`, `error`, `success` — jamais de rendu conditionnel incomplet.
23. Les appels API passent par `src/lib/api.js` (fetch wrapper avec gestion token/refresh).
24. Les formulaires utilisent `react-hook-form` + validation côté client avant envoi.
25. L'app est responsive — conçue mobile-first (cliniques utilisent des téléphones).
26. Les routes sont protégées via un composant `PrivateRoute` qui vérifie le rôle.
27. Les données distantes sont gérées avec `@tanstack/react-query` (cache, refetch, loading states).

---

## Tests

28. Chaque route API a au minimum : test du happy path, test d'accès refusé (mauvais tenant), test de validation.
29. Les tests d'intégration utilisent une base PostgreSQL de test réelle — pas de mocks DB.
30. La couverture minimale sur les fichiers `src/routes/` et `src/middleware/` est de 70%.
31. Les tests d'isolation multi-tenant sont obligatoires : org A ne peut pas lire les données de org B.

---

## Déploiement

32. Docker Compose orchestre : `postgres`, `server`, `client` (nginx), `nginx` (reverse proxy).
33. Les variables d'environnement sensibles sont dans `.env` (jamais committé) — `.env.example` documente les clés.
34. PM2 gère le processus Node en production (`ecosystem.config.js`).
35. HTTPS via Let's Encrypt + nginx — HTTP redirige automatiquement vers HTTPS.

---

## CI/CD

36. GitHub Actions lance `npm test` sur chaque push et pull request sur `main`.
37. Le pipeline bloque le merge si les tests échouent ou si la couverture < 70%.

---

## Sécurité — Rate Limiting

38. Le endpoint `POST /api/auth/login` est protégé par `express-rate-limit` : **10 requêtes / 15 minutes par IP**.
    - En environnement `test`, le limiter est désactivé via `skip: () => process.env.NODE_ENV === 'test'` pour ne pas bloquer les suites Jest.
    - Configuration : `standardHeaders: true`, `legacyHeaders: false`.
    - Message d'erreur : `{ error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }`.
    - Pattern à reproduire sur tout endpoint sensible à brute-force (reset password, 2FA…).

---

## SMS — Pattern Twilio / Mock

39. Le service SMS (`src/services/smsService.js`) fonctionne en **deux modes** :
    - **Mode réel** : si `TWILIO_ACCOUNT_SID` et `TWILIO_AUTH_TOKEN` sont définis dans l'env, le SDK Twilio est utilisé.
    - **Mode mock** : si ces variables sont absentes ou vides, les messages sont loggués en console (`[SMS MOCK]`) — aucun envoi réel, aucune erreur levée.
    - `africastalking` est listé en dépendance comme alternative régionale, mais non activé par défaut.
    - Les rappels automatiques sont planifiés via `node-cron` dans `src/services/smsCron.js` — le cron ne démarre que si `NODE_ENV !== 'test'`.
    - Les tests SMS (`smsReminders.test.js`) testent uniquement l'API REST, jamais l'envoi effectif.

---

## Notifications Push — Pattern VAPID

40. Les notifications push Web utilisent `web-push` avec des clés VAPID.
    - Les clés sont stockées dans les variables d'environnement : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`.
    - Générer des clés : `npx web-push generate-vapid-keys`.
    - La clé publique est exposée via `GET /api/notifications/vapid-public-key` (sans authentification) pour que le frontend puisse s'abonner.
    - Les abonnements push sont persistés en table `push_subscriptions` avec `organization_id` (isolation multi-tenant respectée).
    - Le service worker est dans `client/public/sw.js`.
    - En CI, des clés VAPID de test sont injectées dans `.github/workflows/ci.yml` — elles ne sont pas des clés de production.
    - Si `VAPID_PUBLIC_KEY` est absent, le endpoint retourne `{ publicKey: null }` sans erreur 500.

---

## Logs d'audit — Middleware auditLog

41. Le middleware `src/middleware/auditLog.js` enregistre automatiquement toute action de mutation (POST, PATCH, DELETE) dans la table `audit_logs`.
    - Colonnes loggées : `organization_id`, `user_id`, `action` (ex. `CREATE_PATIENT`), `entity_type`, `entity_id`, `metadata` (JSON), `ip_address`, `created_at`.
    - Le middleware est appliqué **après** `authenticate` et `tenant` — il a accès à `req.user` et `req.organizationId`.
    - Il ne logue jamais le corps de requête brut en clair — données sensibles exclues du `metadata`.
    - La route `GET /api/audit-logs` est réservée au rôle `admin` et supporte la pagination (`?page`, `?limit`) et les filtres (`?action`, `?user_id`).
    - Les tests `auditLogs.test.js` vérifient l'isolation multi-tenant : un admin d'org B ne voit jamais les logs d'org A.

---

## WhatsApp — Mode Simulation

42. L'intégration WhatsApp Business API (Meta) fonctionne en **deux modes** :
    - **Mode simulation** (développement) : les messages sont loggués en table `whatsapp_logs` avec `status = 'simulated'` — aucun appel API externe.
    - **Mode réel** (production) : activé si `WHATSAPP_MODE=production` + `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` sont définis.
    - Le webhook de vérification Meta utilise `WHATSAPP_VERIFY_TOKEN` (documenté dans `server/.env.example`).
    - La page `WhatsAppLogsPage.jsx` affiche l'historique des messages (simulation et réels) — accessible aux rôles `admin` et `secretary`.
    - Ne jamais envoyer de vraies notifications WhatsApp depuis l'environnement de test.

---

## RGPD / Conformité

43. La route `GET /api/gdpr/export/:patientId` génère un export JSON complet des données du patient (consultations, prescriptions, RDV, factures).
    - Accessible aux rôles `admin` et `doctor` de la même organisation que le patient.
    - Le fichier exporté ne contient jamais de données d'autres patients.
44. La route `POST /api/gdpr/anonymize/:patientId` anonymise irréversiblement les données personnelles du patient.
    - Requiert le code de confirmation `CONFIRMER_ANONYMISATION` dans le body — protection contre les appels accidentels.
    - Seul le rôle `admin` peut lancer l'anonymisation.
    - Les données anonymisées : `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `address` → remplacés par des marqueurs neutres.
    - Les consultations, prescriptions et factures sont conservées pour l'archivage médical (obligations légales).

---

## Partage de dossiers inter-cliniques

45. Le partage de dossiers entre cliniques repose sur un système de **codes de consentement** à 6 caractères alphanumériques.
    - La clinique source génère un code via `POST /api/record-shares/consent-code` — valide 48 heures.
    - La clinique demandeuse soumet le code via `POST /api/record-shares` pour créer une demande.
    - La clinique source approuve ou refuse via `PATCH /api/record-shares/:id` (`status: 'approved' | 'denied'`).
    - Seul le statut `approved` autorise l'accès aux dossiers via `GET /api/record-shares/:id/records`.
    - Toutes les demandes sont isolées par `organization_id` — une clinique ne voit jamais les demandes d'une autre.

---

## Dépendances clés (versions verrouillées)

### Backend (`server/package.json`)
- `express` ^4 · `knex` ^3 · `pg` — stack principale
- `bcrypt` ^5 · `jsonwebtoken` ^9 — auth
- `joi` ^17 — validation
- `express-rate-limit` ^8.5.2 — rate limiting login
- `web-push` ^3.6.7 — notifications push VAPID
- `@anthropic-ai/sdk` ^0.97.1 — assistant Awa
- `africastalking` ^0.8.0 · `node-cron` ^4.2.1 — SMS/cron
- `cookie-parser` · `cors` · `dotenv` · `uuid`
- **Dev** : `jest` ^29.7.0 · `supertest` ^7.0.0 · `nodemon` ^3.1.4

### Frontend (`client/package.json`)
- `react` ^18.3.1 · `react-dom` · `react-router-dom` ^6.24.0
- `@tanstack/react-query` ^5.40.0 — cache + states
- `react-hook-form` ^7.52.1 — formulaires
- `qrcode.react` ^4.2.0 — QR codes ordonnances
- **Dev** : `vite` ^5.3.3 · `tailwindcss` ^3.4.6

---

## Credentials de démo (seeds)

> Mot de passe universel : **`Password123!`** (bcrypt round 12)

| Org | Rôle | Email |
|---|---|---|
| Clinique du Plateau | admin | `admin@clinique-plateau.ci` |
| Clinique du Plateau | doctor | `dr.kone@clinique-plateau.ci` |
| Clinique du Plateau | doctor | `dr.traore@clinique-plateau.ci` |
| Clinique du Plateau | secretary | `secretaire@clinique-plateau.ci` |
| Clinique du Plateau | patient | `karim.meite@email.ci` |
| Cabinet Médical Cocody | admin | `admin@cabinet-cocody.ci` |
| Cabinet Médical Cocody | doctor | `dr.bamba@cabinet-cocody.ci` |
