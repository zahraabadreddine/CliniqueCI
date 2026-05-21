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
