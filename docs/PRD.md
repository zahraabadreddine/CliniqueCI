# PRD — CliniqueCI

**Version :** 1.0  
**Date :** 2026-05-19  
**Auteur :** Zahraa HUE  

---

## 1. Pitch

CliniqueCI est un logiciel SaaS multi-tenant de gestion de cliniques privées pour Abidjan : prise de RDV en ligne, dossiers médicaux numériques, ordonnances, facturation. Chaque clinique est un tenant isolé avec ses propres équipes et patients.

---

## 2. Problème

Les cliniques privées d'Abidjan gèrent encore leurs patients sur papier : registres de RDV manuels, dossiers physiques, ordonnances manuscrites. Risques : perte de données, erreurs médicales, rendez-vous manqués, pas de visibilité sur l'activité.

---

## 3. Utilisateurs cibles (Personas)

| Persona | Rôle système | Besoins principaux |
|---|---|---|
| Dr. Aminata, médecin propriétaire | `admin` | Gérer l'équipe, voir l'agenda global, consulter ses patients |
| Rana, secrétaire médicale | `secretary` | Prendre les RDV, gérer le planning, accueillir les patients |
| Dr. Koné, médecin employé | `doctor` | Voir son agenda du jour, saisir les consultations, émettre des ordonnances |
| Karim, patient | `patient` | Prendre RDV en ligne, consulter ses ordonnances passées |

---

## 4. Entités principales

```
Organization    → la clinique (tenant)
User            → membre de l'équipe ou patient (rôle : admin, doctor, secretary, patient)
Patient         → dossier patient lié à un User
Appointment     → RDV entre un Patient et un Doctor, à une date/heure
Consultation    → compte-rendu médical d'un Appointment
Prescription    → ordonnance liée à une Consultation
```

---

## 5. Cas d'usage core

1. **Ouverture dossier** — la secrétaire crée un dossier patient lors de la première visite.
2. **Prise de RDV en ligne** — le patient choisit un médecin et un créneau disponible.
3. **Agenda médecin** — le médecin voit ses RDV du jour et démarre une consultation.
4. **Compte-rendu** — le médecin saisit motif, examen clinique, diagnostic.
5. **Ordonnance** — le médecin génère une ordonnance liée à la consultation.
6. **Historique patient** — le patient consulte ses RDV passés et ses ordonnances.

---

## 6. Endpoints API

| Méthode | Endpoint | Description | Rôles |
|---|---|---|---|
| POST | `/api/auth/register` | Créer une org + admin | public |
| POST | `/api/auth/login` | Login → JWT cookie | public |
| POST | `/api/auth/logout` | Révoquer refresh token | auth |
| POST | `/api/auth/refresh` | Renouveler access token | auth |
| GET | `/api/users` | Lister l'équipe | admin |
| POST | `/api/users` | Inviter un membre | admin |
| POST | `/api/patients` | Créer dossier patient | secretary, admin |
| GET | `/api/patients` | Lister les patients | doctor, secretary, admin |
| GET | `/api/patients/:id` | Voir un dossier patient | doctor, secretary, admin |
| GET | `/api/patients/:id/history` | Historique complet | doctor, patient (own) |
| GET | `/api/appointments` | Liste RDV (filtre: date, doctor_id) | doctor, secretary, admin |
| POST | `/api/appointments` | Créer un RDV | patient, secretary, admin |
| PATCH | `/api/appointments/:id/status` | Confirmer/annuler | secretary, admin |
| POST | `/api/consultations` | Créer compte-rendu | doctor |
| GET | `/api/consultations/:id` | Voir compte-rendu | doctor, patient (own) |
| POST | `/api/prescriptions` | Créer ordonnance | doctor |
| GET | `/api/prescriptions/:id` | Voir ordonnance | doctor, patient (own) |

---

## 7. Composants UI principaux

| Composant | Vue | Description |
|---|---|---|
| `AppointmentBooker` | Patient | Calendrier de créneaux disponibles + formulaire RDV |
| `DoctorAgenda` | Médecin | Agenda du jour avec liste des RDV et bouton "Démarrer consultation" |
| `PatientFile` | Secrétaire/Admin | Fiche patient complète avec RDV passés |
| `ConsultationForm` | Médecin | Formulaire motif + examen + diagnostic |
| `PrescriptionEditor` | Médecin | Éditeur d'ordonnance avec médicaments + posologie |
| `PatientHistory` | Patient | Historique personnel : RDV, consultations, ordonnances |
| `TeamManager` | Admin | Gestion des membres de l'équipe (invitations, rôles) |

---

## 8. Hors-scope v1

- Téléconsultation vidéo
- Intégration assurance maladie / CNAM
- Gestion lab / imagerie médicale
- Signature électronique des ordonnances
- Historique vaccinal complet
- Prescriptions contrôlées
- Facturation / paiement en ligne
- Multi-langue

---

## 9. Critères d'acceptation

- [ ] Un patient peut prendre un RDV sans voir les données d'une autre clinique
- [ ] Un médecin voit uniquement les patients de sa clinique
- [ ] La suite de tests passe à 100% en CI
- [ ] Couverture ≥ 70% sur les fichiers métier
- [ ] L'app est accessible et fonctionnelle sur mobile (320px min)
- [ ] HTTPS actif sur le VPS de déploiement
