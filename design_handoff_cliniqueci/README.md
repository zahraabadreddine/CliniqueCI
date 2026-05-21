# Handoff — CliniqueCI

## Overview

**CliniqueCI** est un SaaS de gestion clinique multi-tenant destiné aux cliniques privées d'Abidjan (Côte d'Ivoire). L'application digitalise toute la chaîne de soins : prise de rendez-vous, dossier patient, consultation, ordonnance, facturation et paiement Mobile Money. Elle inclut un **agent IA conversationnel ("Awa")** intégré dans chaque rôle.

Trois rôles utilisateur :
- **Médecin** (desktop) — agenda, dossiers, consultation en direct, ordonnances, facturation, statistiques
- **Secrétaire** (desktop) — accueil/file d'attente, prise de RDV, planning hebdomadaire, encaissement Mobile Money
- **Patient** (mobile) — réservation de RDV, ordonnances, dossier santé, assistant IA

---

## ⚠️ À propos des fichiers de design

Les fichiers de ce bundle sont **des références de design réalisées en HTML/React+Babel** — il s'agit d'un prototype démontrant l'aspect visuel attendu, le flux d'interaction et la structure des données. **Ce n'est PAS du code de production à copier tel quel.**

Votre mission est de **recréer ces designs dans l'environnement cible** (React + Vite, Next.js, React Native, etc.) en suivant les conventions, librairies et design system déjà en place dans le projet. Si aucun environnement n'existe encore, choisissez la stack la plus adaptée — recommandation : **Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui** côté frontend, **PostgreSQL + Prisma + tRPC/REST** côté backend, **Clerk/Auth.js** pour l'authentification multi-tenant.

---

## Fidelity

**High-fidelity (hifi)**. Les couleurs, typographies, espacements et interactions sont définitifs. Les valeurs hex, tailles de police et rayons de bordure doivent être respectés au pixel près lors de la recréation, en s'appuyant sur les composants du design system de destination.

---

## Stack et architecture cibles (recommandation)

### Frontend
- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix UI sous le capot)
- **TanStack Query** pour les requêtes / cache
- **Zustand** pour l'état UI léger (rôle actuel, ouverture panneau IA)
- **date-fns** + locale `fr` pour les dates
- **lucide-react** pour les icônes (le prototype recrée ces icônes inline)

### Backend
- **PostgreSQL** (multi-tenant — voir section dédiée)
- **Prisma** ORM
- **tRPC** ou **API routes REST** Next.js
- **Auth.js (NextAuth)** ou **Clerk** avec multi-tenancy (organization = clinique)

### Infrastructure
- VPS (Hetzner, Scaleway) ou Vercel pour le front
- Stockage objet S3-compatible pour les PDFs d'ordonnance
- **CinetPay** ou **PayDunya** pour l'agrégation Wave / Orange Money / Moov Money / MTN (Côte d'Ivoire)
- **TextBee** ou **Twilio** pour l'envoi de SMS de confirmation/rappel

### Agent IA
- **Anthropic Claude API** (`claude-sonnet-4-5` ou `claude-haiku-4-5` pour les réponses rapides)
- Streaming côté serveur avec Server-Sent Events
- Le prototype utilise `window.claude.complete` — à remplacer par un appel API authentifié côté serveur Next.js (jamais exposer la clé API côté client)

---

## Multi-tenancy (critique pour le marché ivoirien)

Chaque clinique doit avoir **un espace de données totalement isolé**. Approche recommandée : **Row-Level Security (RLS) PostgreSQL** avec une colonne `clinic_id` sur toutes les tables métier (`patients`, `appointments`, `consultations`, `prescriptions`, `invoices`). Le `clinic_id` est dérivé du JWT/session lors de chaque requête. Aucune jointure cross-tenant n'est possible.

Modèle de pricing à supporter dans le `clinic.plan` :
- `starter` — gratuit, 1 médecin, 50 patients/mois
- `pro` — 25 000 FCFA/mois, 5 médecins, ordonnances PDF, support WhatsApp
- `clinique` — 75 000 FCFA/mois, illimité, multi-sites, intégration CNAM (v2)

---

## Modèle de données (référence)

Voir `app/data.js` pour les structures exactes utilisées dans le prototype. Schéma Prisma indicatif :

```prisma
model Clinic {
  id        String   @id
  name      String
  address   String
  phone     String
  plan      Plan     // starter | pro | clinique

  staff         Staff[]
  patients      Patient[]
  appointments  Appointment[]
  // ...
}

model Staff {
  id          String   @id
  clinicId    String
  firstName   String
  lastName    String
  role        Role     // medecin | secretaire | admin
  specialty   String?
  initials    String
  color       String   // pour l'UI
  clinic      Clinic   @relation(fields: [clinicId], references: [id])
}

model Patient {
  id           String   @id
  clinicId     String
  firstName    String
  lastName     String
  birth        DateTime
  gender       Gender   // M | F
  phone        String
  bloodType    String?
  allergies    String[] // array Postgres
  chronic      String[]
  insurance    Json?    // { provider, number }
  address      String?
  lastVisit    DateTime?
  clinic       Clinic   @relation(fields: [clinicId], references: [id])
}

model Appointment {
  id          String       @id
  clinicId    String
  patientId   String
  medecinId   String       // staff.id
  date        DateTime     @db.Date
  time        String       // HH:MM
  duration    Int          // minutes
  reason      String
  status      ApptStatus   // confirmed | waiting | in_room | done | cancelled
  channel     Channel      // app | phone | walk_in
  notes       String?
}

model Consultation {
  id          String   @id
  patientId   String
  medecinId   String
  date        DateTime
  reason      String
  vitals      Json     // { tension, pouls, temp, poids }
  symptoms    String?
  diagnosis   String
  notes       String?
}

model Prescription {
  id          String   @id
  patientId   String
  medecinId   String
  date        DateTime
  status      RxStatus // active | archived
  items       RxItem[]
}

model RxItem {
  id              String       @id
  prescriptionId  String
  med             String       // ex. "Paracétamol 1000mg"
  pos             String       // posologie + durée
}

model Invoice {
  id          String       @id
  patientId   String
  date        DateTime
  items       Json         // [{ label, amount }]
  total       Int          // FCFA (entiers, pas de décimales)
  status      InvoiceStatus // paid | pending | unpaid
  method      PaymentMethod? // wave | orange | moov | mtn | cash
  txRef       String?      // référence transaction MoMo
}
```

---

## Design Tokens

### Palette de couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| `--green` | `#0d7a5f` | Couleur primaire, marque, CTA |
| `--green-light` | `#12a07c` | Accents, gradients |
| `--green-pale` | `#e6f5f1` | Backgrounds badges, sidebar active |
| `--green-paler` | `#f1faf7` | Backgrounds très légers, hover |
| `--cream` | `#faf8f3` | Background app principal |
| `--cream-2` | `#f3efe5` | Backgrounds secondaires, badges muted |
| `--ink` | `#0f1a16` | Texte principal, boutons sombres |
| `--ink-soft` | `#2a3a33` | Texte secondaire |
| `--muted` | `#6b7f78` | Texte tertiaire, labels |
| `--muted-light` | `#9eaba6` | Icônes désactivées |
| `--gold` | `#c8a84b` | Statut "en attente", premium |
| `--gold-soft` | `#f6ecc8` | Background gold |
| `--red` | `#d64c3f` | Statut "annulé", danger, allergies |
| `--red-soft` | `#fbe4e1` | Background red |
| `--blue` | `#2f6bd6` | Statut "en consultation" |
| `--blue-soft` | `#e4ecfb` | Background blue |
| `--border` | `rgba(13, 26, 22, 0.08)` | Bordures par défaut |
| `--border-strong` | `rgba(13, 26, 22, 0.14)` | Bordures inputs, séparateurs forts |

### Typographie

- **Serif (titres)** : `Playfair Display`, weights 600 / 700 / 900
- **Sans (UI)** : `DM Sans`, weights 300 / 400 / 500 / 600 / 700
- **Mono (codes, horaires)** : `JetBrains Mono`, weights 400 / 500

Échelle :
- H1 page : `2rem` Playfair 700, line-height 1.1
- H1 hero : `2.25rem`–`2.5rem` Playfair 700
- KPI value : `2rem` Playfair 700
- Body : `14px` DM Sans 400, line-height 1.5
- Small : `12px` / `13.5px` DM Sans 400
- Micro / labels : `11px` DM Sans 500, letter-spacing `.06–.12em`, uppercase

### Spacing & radius

- Échelle basée sur `0.25rem` (4px) : `.25rem`, `.5rem`, `.65rem`, `.75rem`, `.85rem`, `1rem`, `1.25rem`, `1.5rem`, `2rem`, `3rem`
- Border radius : `6px` (small), `8px` (default), `10px` (medium), `12px` (cards), `16px` (modals), `24px`+ (pills/avatars)

### Shadows

- `--shadow-sm` : `0 1px 2px rgba(13, 26, 22, 0.04)`
- `--shadow-md` : `0 4px 14px rgba(13, 26, 22, 0.06)`
- `--shadow-lg` : `0 18px 40px rgba(13, 26, 22, 0.10)`

---

## Screens / Views

### 0. Écran de connexion (`/login`)

**Purpose** — sélectionner un profil pour entrer dans l'app. En production, ce sera un vrai login (email + mot de passe ou téléphone + OTP).

**Layout** — split 50/50.
- **Gauche** : panneau sombre (`--ink`) avec logo CliniqueCI, citation (Playfair 1.6rem), tagline cohorte. Background subtil avec grille verte 50px et halo radial.
- **Droite** : `padding: 3rem`, max-width 560px. Titre Playfair 2.25rem "Bienvenue.", description, **liste de cartes de rôle** (3 cartes verticales avec avatar emoji, nom, sous-titre, flèche d'arrivée au hover). Card multi-tenant info en bas (icône bouclier).

**Cartes de rôle** :
- Bg `#fff`, border 1px `--border`, radius 12px, padding `1.1rem 1.25rem`
- Avatar 48×48 radius 12px, fond `--green-pale` / `--gold-soft` / `--blue-soft`
- Hover : `transform: translateY(-2px)`, border `--green`, shadow-md, flèche se décale de 4px

### 1. App Shell (commun médecin/secrétaire)

**Layout** — CSS Grid :
```
grid-template-columns: 240px 1fr;
grid-template-rows: 56px 1fr;
grid-template-areas: "topbar topbar" "sidebar main";
```

**TopBar** (`56px`, fond `#fff`, border-bottom `--border`)
- Gauche : logo `CliniqueCI` (Playfair, brand-mark 28×28 vert avec "C"), puis chip clinique (`--green-paler`, dot vert pulsant) "Clinique Riviera · Pro"
- Droite : icône cloche avec badge rouge, **chip "Awa AI"** (gradient vert), chip utilisateur (avatar + prénom + chevron)

**Sidebar** (240px, fond `#fff`)
- Sections avec labels uppercase `10px` letter-spacing `.12em`
- Nav items 13.5px, padding `.55rem .65rem`, radius 8px
- Hover : bg `--cream`. Active : bg `--green-paler`, couleur `--green`, font-weight 600
- Count pill optionnel à droite

**Main area** : `padding: 1.5rem 2rem 3rem`, scrollable. Décalé à droite quand le panneau IA est ouvert.

### 2. Dashboard Médecin

**Components**
- `PageHeader` — H1 "Bonjour, Dr. Koné" + subtitle date longue ("dimanche 19 mai 2026"), boutons à droite ("Voir l'agenda" secondaire + "Démarrer une consultation" primaire)
- **4 KPI cards** (`grid-template-columns: repeat(4, 1fr)`) — Patients aujourd'hui / En salle d'attente / Terminés / Recettes du jour. Chaque KPI : label `11px` uppercase, value Playfair `2rem` 700, delta `11px` vert ou rouge, halo radial en haut-droit.
- **Grid main-side** (1fr 320px) :
  - **Carte "Prochains patients"** : data-list avec avatar, heure mono, nom, motif, badge statut, bouton "Démarrer →"
  - **Carte sidekick "Brief du jour par Awa"** : fond `--green-paler`, icône sparkles, résumé contextuel, bouton "Approfondir avec Awa"
  - **Carte "Raccourcis"** : 4 boutons secondaires verticaux

### 3. Agenda Médecin

**Layout** — Grid main-side. À gauche, **time-slot grid** (créneaux 30 min de 08:00 à 18:00) :
```css
.time-slot {
  display: grid;
  grid-template-columns: 80px 1fr;
  border-top: 1px solid var(--border);
  min-height: 64px;
}
```

**Appointment card** — radius 6px, padding `.55rem .75rem`, border-left 3px coloré selon statut :
- `confirmed` → `--green`
- `waiting` → `--gold`
- `in-room` → `--blue` (fond `--blue-soft`)
- `done` → gris, opacity 0.65
- `cancelled` → rouge, opacity 0.55

À droite : navigation jour précédent/suivant, légende couleurs, aperçu de la journée, suggestion Awa.

### 4. Liste patients

**Layout** — Toolbar (search + filter chips) puis **table** :

Colonnes : Patient (avatar + nom + ID), Âge·Sexe, Téléphone (mono), Allergies (badges rouges), Dernière visite, Action.

Hover row : `background: var(--cream)`.

### 5. Drawer dossier patient

**Width** : 540px (max-width 95vw), animé depuis la droite.
- En-tête : avatar lg 56×56, nom Playfair 1.5rem, badges (groupe sanguin vert, allergies rouges, chroniques gold)
- **Bloc Awa** (`AIAssistBox`) avec synthèse du dossier
- 2 cards info (Téléphone, Assurance)
- Cards historique : Consultations, Ordonnances, RDV

### 6. Consultation en cours

**PageHeader** : "Consultation en cours" + sous-titre "Karim Meïté · 31 ans · motif : Fièvre + maux de tête". Boutons "Mettre en pause" + "Clôturer" (primaire vert).

**Grid main-side** :
- **Colonne principale** :
  1. Card synthèse patient (avatar lg, badges, dernière visite, traitements actifs)
  2. Card "Constantes" — `grid-4` avec 4 inputs (Tension, Pouls, Température, Poids)
  3. Card "Anamnèse · Symptômes" — textarea
  4. **Card "Hypothèses & plan"** avec bouton **"Demander un plan à Awa"** qui appelle l'API Claude. La réponse s'affiche dans un `AIAssistBox` avec note de prudence
  5. Card "Ordonnance" — lignes répétables (médicament + posologie), bouton "+ Ligne" et suppression

- **Colonne droite** :
  - Card alerte allergies (`card-subtle`)
  - Card visites précédentes
  - Card timer de consultation (Playfair 2rem mm:ss, boutons Pause/Reset)

**Clôture** : crée une `Consultation`, optionnellement une `Prescription`, et toujours une `Invoice` pending. Met à jour le statut du RDV à `done` et `patient.lastVisit`.

### 7. Ordonnances (vue médecin)

Table avec date, patient, médicaments, statut. Clic → **modal "Ordonnance"** stylisée comme un document imprimable :
- En-tête CliniqueCI (logo vert) + adresse, n° ordonnance, date longue
- Bloc patient (nom, âge, groupe sanguin) + bannière allergies rouge
- Liste numérotée des médicaments avec posologie
- Signature en bas-droit ("Dr. Aminata Koné · Ordre #CI-MG-4421")

Modal footer : "Imprimer", "PDF", "Envoyer SMS" (primaire).

### 8. Facturation (vue médecin)

4 KPIs (Encaissé mois, À encaisser, %MoMo, %Espèces) + table factures (date, patient, détail, montant mono, mode badge, statut).

### 9. Statistiques

Vue propriétaire. 4 KPIs (Consultations/mois, Recettes/mois, Nouveaux patients, Taux occupation).

Puis grid main-side :
- **Bar chart "Consultations cette semaine"** — 7 barres CSS (`grid-template-columns: repeat(7, 1fr)`), hauteur proportionnelle, valeur au-dessus, jour en bas. À recréer avec **Recharts** ou **Visx** en prod.
- **Top motifs** — 4 lignes label + pourcentage + barre de progression colorée
- **Insight Awa** automatisé

### 10. Accueil Secrétaire

PageHeader + 4 KPIs (Total / Arrivés / Attendus / Annulés).

Grid main-side :
- **Card "File d'attente · arrivés"** — liste des patients en `waiting` / `in-room` avec avatar, médecin assigné, statut, bouton "Dossier"
- **Card "Prochains arrivants"** (`card-subtle`) — bouton "Arrivé" (primaire) + icône "✕" rouge pour annuler
- **Card Awa** — suggestion de rédiger SMS de rappel

### 11. Prise de RDV (Secrétaire) — 3 étapes

**Stepper horizontal** en haut : Patient → Médecin & créneau → Confirmation. Pastilles vertes pour étapes complétées, ink pour étape active.

- **Étape 1** : search patient + data-list, bouton "Nouveau dossier patient"
- **Étape 2** : récap patient sélectionné + select médecin + date + **grille de créneaux** (`grid-template-columns: repeat(8, 1fr)`, créneaux pris en `line-through`, sélectionné en vert) + input motif + suggestion Awa
- **Étape 3** : récap complet, checkboxes (SMS immédiat, rappel WhatsApp 24h), bouton "Réserver & Confirmer" lg
- **Étape 4 (succès)** : icône check verte 64px, message, boutons "Nouveau RDV" / "Retour à l'accueil"

### 12. Planning hebdomadaire

Select médecin (ou "Tous"), navigation semaine. **Table** : colonnes = 6 jours (Lun-Sam), lignes = créneaux horaires, cellules = mini appointment cards.

### 13. Encaissement Mobile Money

Table factures pending. Bouton "Encaisser" → **modal de paiement** :
- En-tête : avatar patient + montant Playfair 1.5rem à droite
- **4 options de paiement** (`.momo-option`) :
  - **Wave** — logo carré 44×44 `#1ec0ec`, "0% commission · transfert instantané"
  - **Orange Money** — logo `#ff7900`, "Code marchand #5524"
  - **MoovMoney** — logo `#00529b`
  - **Espèces** — logo ink avec icône billet
- Au choix MoMo : aperçu numéro patient en `mono`
- Bouton "Valider" → spinner 1.4s simulant l'appel API agrégateur → toast succès, statut facture → `paid`

**En production** : intégrer **CinetPay** ou **PayDunya** (deux agrégateurs locaux qui gèrent Wave/Orange/Moov/MTN avec une seule API). Webhook pour confirmer le paiement asynchrone.

### 14. Vue Patient (mobile)

**Frame téléphone** — 390×800px, radius 42px, padding 10px ink. Écran intérieur radius 34px fond `--cream`. Notch centré, status bar 44px.

**Tab bar** bas (72px) — 4 tabs : Accueil, RDV, Ordonnances, Profil. Icône 20px + label 10px. Active = vert.

**Accueil patient** :
- Salutation Playfair 1.8rem
- **Card "Prochain rendez-vous"** fond ink, texte blanc, date Playfair, heure mono, 2 boutons (Itinéraire, Appeler)
- **Grid 2×2 de raccourcis** (cards 85px) — Prendre RDV / Parler à Awa / Mes ordonnances / Mon dossier. Chaque card : icône colorée 32px haut-gauche + titre fw-600 + sous-titre
- **Card "Awa peut vous aider"** avec CTA

**Réservation patient** — flow 5 étapes (Spécialité → Médecin → Créneau → Motif → Succès). Layout vertical scrollable, bouton retour en haut-gauche.

**Mes ordonnances** : liste de cards. Clic → modal ordonnance avec boutons "PDF" + "QR Pharmacie".

**Profil** : avatar lg centré, cards "Informations santé" (groupe, allergies en rouge, antécédents, assurance) + "Contact", bouton déconnexion.

### 15. Panneau Agent IA "Awa"

**Position** : panneau fixe droite, top 56px (sous topbar), width 380px, transform translateX hors écran → 0 quand ouvert (transition 300ms cubic-bezier).

**En-tête** :
- Avatar circulaire 36px gradient `linear-gradient(135deg, var(--green) 0%, var(--green-light) 100%)`, lettre "A" blanche, ring `0 0 0 3px rgba(13,122,95,0.12)`
- Titre "Awa" + "· assistant IA" muted
- Sous-titre "en ligne · contexte {role}" avec dot vert pulsant
- Boutons refresh (nouvelle conversation) + close

**Messages** :
- AI : `align-self: flex-start`, bg `--green-paler`, ink, radius 12px (4px bottom-left)
- User : `align-self: flex-end`, bg `--ink`, white, radius 12px (4px bottom-right)
- System : `align-self: center`, micro, bg `--cream-2`
- Loading : 3 dots verts qui bouncent (delay .15s/.3s)

**Suggestions** (visibles uniquement au démarrage, 4 max) : boutons full-width fond `--cream`, hover vert.

**Input** : pill input + bouton rond 36px vert avec icône send.

### Comportement IA

Le prompt système varie selon le rôle. Voir `app/ai-agent.jsx` → `buildSystemPrompt()`.

Le **contexte** envoyé à Claude inclut :
- Patient actuel (allergies, traitements en cours, antécédents) si en consultation
- Statistiques de la journée si vue agenda/dashboard
- Aujourd'hui : nombre de RDV, en attente, etc.

**Règles strictes** :
- Toujours en français
- 3 à 6 phrases max
- Ne jamais inventer de données médicales
- Pour le rôle patient : si signe d'urgence (douleur thoracique, AVC...), orienter vers le **185 (SAMU Côte d'Ivoire)** ou les urgences
- Pour le médecin : terminer les suggestions cliniques par une note de prudence

**Implémentation backend** :
```ts
// /api/awa/chat
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  const { role, context, messages } = await req.json();
  const session = await auth();
  // Charger les données du contexte côté serveur (jamais faire confiance au client)
  const ctxData = await loadContextForUser(session, context);
  const systemPrompt = buildSystemPrompt(role, ctxData);

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 800,
    system: systemPrompt,
    messages,
  });
  return new Response(stream.toReadableStream(), {
    headers: { "Content-Type": "text/event-stream" }
  });
}
```

---

## Interactions & Behavior

### Animations & transitions

- Modals : `fadeIn .15s ease` (backdrop), `modalIn .2s ease` (panneau) — translateY 8px + scale .98
- Drawer : `drawerIn .25s ease` — translateX 100% → 0
- Panneau IA : `transition: transform .3s cubic-bezier(.4, 0, .2, 1)`
- Toasts : `toastIn .25s ease`, auto-dismiss 3.2s
- AI loading dots : `bounce 1.2s infinite`, delays staggered
- AI online dot : `pulse 1.5s infinite`
- KPI hover : aucune anim, mais cards hover ailleurs `translateY(-2px) + shadow-md`

### États des composants

- **Buttons** : `:active { transform: translateY(1px) }`, `:disabled { background: --muted-light, cursor: not-allowed }`
- **Inputs focus** : border `--green` + box-shadow `0 0 0 3px rgba(13, 122, 95, 0.12)`
- **Nav items active** : background `--green-paler`, color `--green`, font-weight 600
- **Appointment cards** : hover `translateX(2px) + shadow-md`
- **Role cards (login)** : hover `translateY(-2px) + border --green + shadow-md`, flèche translateX 4px

### Validations métier

- Pas de double réservation : un créneau pris est désactivé (`disabled + line-through`)
- Clôture de consultation impossible sans diagnostic
- Patient ne peut pas réserver sans motif
- RDV passés non modifiables

### Notifications & Toasts

3 types : succès (vert), erreur (rouge), info (ink). Position `bottom-right`, max-width 240px, auto-dismiss 3.2s.

---

## State Management

Le prototype utilise un store global custom (`window.CCI`) avec subscribe/notify + persistance localStorage. En production :

- **Server state** (clinique, patients, RDV, ordonnances...) → **TanStack Query** avec invalidation par mutation
- **UI state** (rôle actif, ouverture panneau IA, contexte IA, navigation) → **Zustand**
- **Toast** : librairie `sonner` ou similaire

### Flux clés

1. **Création RDV** (secrétaire ou patient) → API POST → invalidate `["appointments", date]` → toast succès → SMS asynchrone via webhook
2. **Check-in patient** → PATCH appointment.status = `waiting` → notification temps réel au médecin (WebSocket ou Pusher)
3. **Démarrage consultation** → PATCH status = `in_room` → mute autres consultations en attente
4. **Clôture consultation** → transaction : créer `Consultation` + éventuelle `Prescription` + `Invoice` pending + update appointment + update `patient.lastVisit` → SMS ordonnance au patient
5. **Encaissement** → POST `/api/payments/initiate` (CinetPay) → polling/webhook → update `invoice.status` + `invoice.method` + `invoice.txRef` → toast + reçu

---

## Assets

- **Fonts** — Playfair Display, DM Sans, JetBrains Mono (Google Fonts)
- **Icons** — recréées inline dans le prototype (voir `app/icons.jsx`). En production : **lucide-react** (même style stroke).
- **Logos Mobile Money** — à remplacer par les vrais logos officiels (Wave, Orange Money, MoovMoney, MTN MoMo)
- **Pas d'images bitmap** — tout est vectoriel/CSS

---

## Pages externes à concevoir (hors prototype)

Le prototype couvre l'app authentifiée. À ajouter en production :
1. Landing page marketing (existe en partie dans `reference/CliniqueCI_pitch.html`)
2. Login / Signup réels (téléphone + OTP recommandé pour le marché ivoirien)
3. Onboarding nouvelle clinique (création tenant + premier médecin + import patients CSV)
4. Page de paiement abonnement SaaS (auto-renouvellement Wave/Orange)
5. Backoffice super-admin (gestion tenants, support)

---

## Files

```
design_handoff_cliniqueci/
├── README.md                           ← ce fichier
├── Clinique CI - Prototype.html        ← entry point HTML, charge tous les modules
├── app/
│   ├── data.js                         ← store mock + structures de données (utilité : schéma data)
│   ├── icons.jsx                       ← icônes SVG inline (référence pour lucide-react)
│   ├── shared.jsx                      ← Modal, Drawer, Avatar, KPI, Sidebar, TopBar, Toast
│   ├── ai-agent.jsx                    ← panneau Awa + prompts système par rôle (CRITIQUE)
│   ├── login.jsx                       ← écran de connexion / sélection rôle
│   ├── medecin.jsx                     ← toute l'app médecin (dashboard, agenda, consultation...)
│   ├── secretaire.jsx                  ← toute l'app secrétaire (accueil, RDV, planning, paiement)
│   ├── patient.jsx                     ← app patient mobile (cadre téléphone)
│   └── app.jsx                         ← orchestration top-level
└── reference/
    ├── CliniqueCI_ProjetFinal.pptx     ← présentation projet (problème, personnae, parcours)
    └── CliniqueCI_pitch.html           ← pitch deck HTML
```

### Comment ouvrir le prototype

Le prototype est en React + Babel (compilation in-browser, donc pas de build). Pour le servir localement :
```bash
npx serve design_handoff_cliniqueci/
# puis ouvrir http://localhost:3000/Clinique%20CI%20-%20Prototype.html
```

Ou simplement double-cliquer le fichier HTML — mais certains navigateurs bloquent le chargement de scripts JSX depuis `file://`. Préférer le serveur local.

---

## Notes finales

- Le code du prototype est **didactique**, pas optimisé pour la production. Pas de TypeScript, pas de tests, gestion d'erreurs minimale.
- L'agent Awa utilise `window.claude.complete` propre à l'environnement de prototypage. **À remplacer impérativement par un endpoint backend** qui appelle l'API Anthropic — la clé API ne doit jamais être exposée côté client.
- Pour la performance sur mobile en Côte d'Ivoire (réseau parfois limité) : prioriser le **mobile-first**, **lazy-loading**, **service worker** pour usage offline du dossier patient, **compression Brotli**, **bundle splitting** par rôle.
- Penser à l'**accessibilité** : `aria-label` sur les boutons icon-only, contrastes WCAG AA (à vérifier sur les badges gold).
- **i18n** : prévoir une couche `next-intl` même si le MVP est en français uniquement — utile pour expansion (Sénégal, Cameroun) en 2027.
