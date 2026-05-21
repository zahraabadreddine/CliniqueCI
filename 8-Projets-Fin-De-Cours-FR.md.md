8 projets de fin de cours

Engineering with Claude Code — choisissez votre projet capstone

**Cours** **:** Engineering with Claude Code

**Auteur** **:** George E. Salloum · george.s@frontal.ltd

**Pour** **:** étudiants universitaires libanais à Abidjan, cohorte juin
2026

**À** **utiliser** **:** après les 30 heures de cours, en travail
autonome (ou en binôme)

Comment utiliser ce document

À la fin des 10 sessions, vous avez tous les outils pour construire une
application SaaS full-stack de bout en bout : CLAUDE.md, PRD, schéma
multi-tenant, migrations, TDD,

composants frontend trois états, Docker, nginx, PM2, déploiement VPS,
CI/CD, observabilité. **Ce** **document** **vous** **propose** **8**
**idées** **de** **projets** pour mettre tout cela en pratique sur une
vraie application qui résout un vrai problème.

**Choisissez** **UN** **projet** parmi les 8. Pas deux, pas trois.
Construisez-le proprement de bout en bout — c'est plus formateur que de
commencer trois projets et n'en finir aucun. Vous devez pouvoir
présenter votre projet en démo avec : un repo GitHub propre, des tests
qui passent, une instance déployée sur un VPS, une URL publique qui
marche.

**Tous** **les** **projets** **partagent** **les** **mêmes**
**contraintes** :

> \- Architecture **multi-tenant** : chaque organisation cliente possède
> son espace isolé. Un utilisateur d'une org ne voit jamais les données
> d'une autre.
>
> \- Stack : Node.js + Express + Knex + PostgreSQL + React (ou
> équivalent dans une autre stack si vous maîtrisez).
>
> \- Déploiement : Docker + nginx + PM2 sur un VPS, sous votre nom de
> domaine. - Authentification réelle : JWT avec cookies httpOnly
> (Session 6).
>
> \- Tests : suite Jest + Supertest verte sur les chemins critiques. -
> CI/CD : GitHub Actions qui lance les tests à chaque push.

**Chaque** **brief** **ci-dessous** **tient** **sur** **une** **page**
et contient : pitch, contexte, personas, entités principales, cas
d'usage core, endpoints API principaux, composants UI principaux,
hors-scope. C'est le strict nécessaire pour démarrer — votre PRD complet
sera plus long et c'est à vous de le rédiger en Session 2 du projet.

Projet 1 — MarchéLink

**Pitch.** Plateforme B2B qui relie les grossistes du marché d'Adjamé
aux petits commerçants de quartier d'Abidjan, pour commander, payer
(Mobile Money) et organiser la livraison sans déplacement physique
répété.

**Contexte** **Abidjan.** Le marché d'Adjamé est le poumon commercial
d'Abidjan : des milliers de grossistes y vendent à des dizaines de
milliers de boutiquiers de quartier (Yopougon, Abobo, Koumassi).
Aujourd'hui, chaque commerçant doit s'y rendre physiquement plusieurs
fois par semaine — perte de temps, transport, risques. MarchéLink
digitalise cette relation B2B : le commerçant commande depuis son
téléphone, paie via Wave ou Orange Money, et reçoit la livraison.

**Personas.**

> \- *Aya,* *grossiste* *de* *tissu* *pagne* *à* *Adjamé*
> *(organisation* *cliente)* — gère son catalogue, voit les commandes
> entrantes, marque les livraisons effectuées.
>
> \- *Kouadio,* *propriétaire* *d'une* *boutique* *à* *Yopougon*
> *(utilisateur* *acheteur,* *multi-tenant* *:* *un* *compte* *par*
> *fournisseur)* — parcourt les catalogues, passe commande, paie, suit
> la livraison.
>
> \- *Mariam,* *livreur* *partenaire* *(utilisateur* *opérationnel)* —
> reçoit les courses, marque les livraisons effectuées.

**Entités** **principales.** Organization (le grossiste), User (rôles :
admin grossiste, vendeur, livreur, acheteur), Product (catalogue du
grossiste), Order (commande passée par un acheteur), OrderItem, Payment
(Mobile Money mocké).

**Cas** **d'usage** **core.**

> 1\. Le grossiste publie son catalogue produits avec stock et prix. 2.
> Un acheteur parcourt les catalogues de plusieurs grossistes.
>
> 3\. Un acheteur passe commande chez un grossiste (cross-tenant : il
> voit les produits, mais sa commande appartient au tenant grossiste).
>
> 4\. Le grossiste valide la commande et déclenche le paiement Mobile
> Money (mocké). 5. Le livreur marque la livraison comme effectuée,
> déclenchant la confirmation côté
>
> acheteur.
>
> 6\. Le grossiste consulte son tableau de bord : commandes du jour,
> chiffre d'affaires, stocks bas.

**Endpoints** **API** **principaux.** POST /api/products, GET
/api/products?org_id=..., POST /api/orders, GET /api/orders/:id, PATCH
/api/orders/:id/status, POST /api/payments/init, POST
/api/payments/webhook (mock).

**Composants** **UI** **principaux.** ProductCatalog (vue acheteur),
ProductManager (vue grossiste), OrderCart, OrderTracker,
DeliveryDashboard (vue livreur), MerchantDashboard.

**Hors-scope** **v1.** Vraie intégration Mobile Money, géolocalisation
temps réel des livreurs, chat acheteur-vendeur, notation des grossistes,
multi-langue.

Projet 2 — TontineFlow

**Pitch.** Application de gestion digitale de tontines pour groupes
d'épargne informelle : un organisateur crée la tontine, invite ses
membres, l'app gère les cotisations, les tirages au sort et les
versements aux gagnants.

**Contexte** **Abidjan.** La tontine est une institution sociale et
financière fondamentale en Afrique de l'Ouest : un groupe de personnes
(collègues de bureau, voisins, amis) cotisent une somme fixe à
intervalles réguliers, et chaque période un membre reçoit le pot.
Aujourd'hui c'est géré sur cahier ou groupe WhatsApp, avec disputes
fréquentes sur qui a payé quoi. TontineFlow digitalise tout ça :
transparence, traçabilité, rappels automatiques.

**Personas.**

> \- *Joud,* *organisateur* *de* *la* *tontine* *de* *son* *agence*
> *bancaire* *(admin* *du* *tenant)* — crée la tontine, fixe les règles,
> invite les membres, déclenche les tirages.
>
> \- *Yao,* *membre* *cotisant* — voit les cotisations à payer, paie via
> Mobile Money, voit qui a gagné quand.
>
> \- *Lina,* *trésorière* *adjointe* — vérifie les paiements, relance
> les retardataires.

**Entités** **principales.** Organization (la tontine elle-même), User
(rôles : organisateur, trésorier, membre), Cycle (un tour de tontine,
par exemple « Tontine 2026 cycle 1 »), Round (une période — typiquement
un mois), Contribution (cotisation d'un membre pour un round), Payout
(versement au gagnant d'un round).

**Cas** **d'usage** **core.**

> 1\. L'organisateur crée une tontine : nombre de membres, montant,
> fréquence (hebdo/mensuel), durée.
>
> 2\. L'organisateur invite les membres par email ou WhatsApp link.
>
> 3\. Chaque round, l'app rappelle les membres de cotiser et marque les
> paiements reçus. 4. À la fin du round, tirage au sort (ou ordre
> prédéfini) du gagnant ; le pot lui est versé.
>
> 5\. Chaque membre voit son historique : combien il a payé, quand il a
> gagné, combien il lui reste à payer.
>
> 6\. L'organisateur a un dashboard global de la tontine : santé
> financière, retardataires.

**Endpoints** **API** **principaux.** POST /api/cycles, POST
/api/cycles/:id/members, POST /api/contributions, GET
/api/cycles/:id/state, POST /api/cycles/:id/draw, POST /api/payouts.

**Composants** **UI** **principaux.** CycleSetup, MembersList,
ContributionTracker, RoundDashboard, PayoutHistory, MemberStatement
(relevé personnel).

**Hors-scope** **v1.** Calcul d'intérêts, prêts entre membres, tontines
à mises variables, vraie intégration Wave/Orange Money, vote des membres
pour exclure un retardataire.

Projet 3 — CliniqueCI

**Pitch.** Logiciel de gestion de patients pour cliniques privées
d'Abidjan : prise de RDV en ligne, dossiers médicaux numériques,
ordonnances, facturation. Chaque clinique = un tenant isolé.

**Contexte** **Abidjan.** Abidjan compte des centaines de cliniques
privées et cabinets médicaux qui fonctionnent encore largement avec des
dossiers papier et des registres de RDV manuels. La digitalisation se
développe mais reste fragmentée. CliniqueCI offre une solution simple,

multi-clinique : chaque clinique a son espace, son équipe, ses patients.
Conçu pour la réalité africaine : fonctionne sur téléphone, économe en
bande passante.

**Personas.**

> \- *Dr.* *Aminata,* *médecin* *propriétaire* *de* *la* *Clinique* *du*
> *Plateau* *(admin* *du* *tenant)* — gère son équipe, voit l'agenda
> global, consulte ses patients.
>
> \- *Rana,* *secrétaire* *médicale* — prend les RDV, gère le planning,
> accueille les patients.
>
> \- *Karim,* *patient* *(utilisateur* *final* *léger)* — prend RDV en
> ligne, consulte ses ordonnances passées.

**Entités** **principales.** Organization (la clinique), User (rôles :
admin, médecin, secrétaire, patient), Patient (dossier patient lié à un
User patient), Appointment (RDV), Consultation (compte-rendu d'un RDV),
Prescription (ordonnance liée à une consultation).

**Cas** **d'usage** **core.**

> 1\. La secrétaire ouvre un dossier patient lors de la première visite.
>
> 2\. Le patient prend un RDV en ligne sur les créneaux disponibles d'un
> médecin. 3. Le médecin voit son agenda du jour et démarre la
> consultation.
>
> 4\. Le médecin saisit le compte-rendu de consultation (motif, examen,
> diagnostic). 5. Le médecin émet une ordonnance liée à la consultation.
>
> 6\. Le patient consulte ses RDV passés et son ordonnance depuis chez
> lui.

**Endpoints** **API** **principaux.** POST /api/patients, GET
/api/appointments?date=...&doctor_id=..., POST /api/appointments, POST
/api/consultations, POST /api/prescriptions, GET
/api/patients/:id/history.

**Composants** **UI** **principaux.** AppointmentBooker (vue patient),
DoctorAgenda, PatientFile, ConsultationForm, PrescriptionEditor,
PatientHistory.

**Hors-scope** **v1.** Téléconsultation vidéo, intégration assurance
maladie, lab/imagerie, signature électronique des ordonnances,
historique vaccinal complet, prescriptions contrôlées.

Projet 4 — EcoleConnect

**Pitch.** Plateforme de communication école-parents pour établissements
primaires et secondaires privés d'Abidjan : notes, devoirs, paiements de
scolarité, événements, messages. Chaque école = un tenant.

**Contexte** **Abidjan.** Les écoles privées d'Abidjan (Sainte-Marie,
Notre-Dame, Cours Sévigné, des dizaines d'autres) communiquent avec les
parents par carnets de correspondance papier, groupes WhatsApp
informels, et SMS. Les paiements de scolarité passent souvent par chèque
ou cash. EcoleConnect centralise tout dans une app : transparence pour
les parents, gain de temps pour l'administration.

**Personas.**

> \- *Mme* *Kouassi,* *directrice* *du* *Cours* *Bilingue* *(admin* *du*
> *tenant* *école)* — gère les enseignants, classes, communications
> globales.
>
> \- *M.* *Diallo,* *professeur* *de* *mathématiques* — saisit les
> notes, donne les devoirs, communique avec les parents de sa classe.
>
> \- *Mme* *Haddad,* *parent* *d'élève* — consulte les notes de ses
> enfants, voit les devoirs, paie la scolarité, lit les messages.

**Entités** **principales.** Organization (l'école), User (rôles : admin
école, enseignant, parent, élève — sans connexion personnelle pour les
jeunes élèves), Class (ex. CM2-A), Student (élève rattaché à une classe
et à un parent), Grade (note), Assignment (devoir), Invoice (facture de
scolarité), Message (communication).

**Cas** **d'usage** **core.**

> 1\. La direction crée la classe et y affecte les élèves et
> l'enseignant. 2. L'enseignant saisit les notes d'un contrôle pour
> toute sa classe.
>
> 3\. Le parent voit les notes de ses enfants, classées par matière et
> par trimestre. 4. L'enseignant publie un devoir avec date d'échéance ;
> les parents reçoivent une
>
> notification.
>
> 5\. La direction émet les factures trimestrielles de scolarité ; le
> parent paie (Mobile Money mocké).
>
> 6\. La direction envoie un message global ou ciblé (par classe, par
> niveau).

**Endpoints** **API** **principaux.** POST /api/classes, POST
/api/students, POST /api/grades (batch pour une classe), GET
/api/students/:id/grades, POST /api/assignments, POST /api/invoices,
POST /api/payments, POST /api/messages.

**Composants** **UI** **principaux.** GradeBook (vue enseignant),
ParentDashboard, StudentReport (relevé d'élève), AssignmentTracker,
InvoiceList, MessageInbox.

**Hors-scope** **v1.** Bulletins officiels imprimables, gestion d'emploi
du temps complet, cantine, transport scolaire, intégration plateformes
nationales (LMD, examens), classes multi-niveaux.

Projet 5 — TaxiBookCI

**Pitch.** Plateforme de réservation de courses pour compagnies de taxi
communales et VTC locales d'Abidjan. Chaque compagnie = un tenant, avec
sa flotte, ses chauffeurs, ses clients.

**Contexte** **Abidjan.** Le transport à Abidjan combine taxis-compteur
(orange à Cocody, vert à Yopougon...), woro-woro (taxis collectifs sur
lignes fixes), et VTC informels. Les compagnies organisées veulent
digitaliser : afficher leurs chauffeurs disponibles, recevoir des
commandes par téléphone et app, suivre les courses, encaisser. Pas une
copie de Yango ou Uber — un outil pour les **compagnies** **locales**
qui gardent leur indépendance.

**Personas.**

> \- *M.* *Touré,* *gérant* *de* *Taxi* *Plateau* *Express* *(admin*
> *du* *tenant)* — gère sa flotte, ses chauffeurs, voit le chiffre
> d'affaires.
>
> \- *Yao,* *chauffeur* *de* *la* *compagnie* — se met en disponibilité,
> reçoit les courses, marque l'arrivée.
>
> \- *Aya,* *cliente* *régulière* — réserve une course, suit son
> chauffeur, paie.

**Entités** **principales.** Organization (la compagnie de taxi), User
(rôles : gérant, dispatcheur, chauffeur, client), Vehicle (véhicule de
la flotte), Driver (chauffeur lié à un User et un Vehicle), Ride
(course), Payment.

**Cas** **d'usage** **core.**

> 1\. Le gérant inscrit ses véhicules et chauffeurs.
>
> 2\. Le chauffeur démarre sa journée et se met « disponible » (sans GPS
> temps réel — il déclare juste sa zone).
>
> 3\. Un client réserve une course en spécifiant départ, arrivée, heure.
>
> 4\. Le dispatcheur (ou un algo simple) assigne la course à un
> chauffeur disponible dans la zone.
>
> 5\. Le chauffeur accepte, effectue la course, marque l'arrivée.
>
> 6\. Paiement (Mobile Money mocké ou cash déclaré), notation
> post-course.

**Endpoints** **API** **principaux.** POST /api/vehicles, POST
/api/drivers, POST /api/drivers/:id/availability, POST /api/rides, PATCH
/api/rides/:id/assign, PATCH /api/rides/:id/status, POST /api/ratings.

**Composants** **UI** **principaux.** FleetManager, DriverDashboard,
RideRequestForm (vue client), DispatcherConsole, RideTracker,
RideHistory.

**Hors-scope** **v1.** Géolocalisation GPS temps réel, calcul
automatique de tarifs par distance, course partagée, intégration cartes,
paiement par carte bancaire, surge pricing.

Projet 6 — LoyerSimple

**Pitch.** Outil de gestion locative pour bailleurs privés et petites
agences immobilières d'Abidjan : suivi des locataires, des paiements de
loyer, des quittances, des demandes de maintenance. Chaque bailleur ou
agence = un tenant.

**Contexte** **Abidjan.** L'immobilier locatif privé à Abidjan (Cocody,
Marcory, Treichville, II Plateaux) est dominé par des bailleurs
individuels avec 3 à 30 logements, et des petites agences avec 50 à 200
lots. La gestion se fait sur Excel ou cahier, les retards de loyer sont
fréquents, les quittances sont émises à la main. LoyerSimple digitalise
cette gestion : transparence, rappels automatiques, historique propre.

**Personas.**

> \- *M.* *Salloum,* *bailleur* *privé* *qui* *possède* *8*
> *appartements* *en* *Riviera* *(admin* *du* *tenant)* — gère son parc,
> suit les paiements, génère les quittances.
>
> \- *Mme* *Konan,* *gérante* *de* *l'Agence* *Cocody* *Immo* *(admin*
> *du* *tenant* *agence)* — gère 80 lots pour 25 propriétaires.
>
> \- *Karim,* *locataire* — voit son loyer dû, paie, reçoit sa
> quittance, signale un problème de plomberie.

**Entités** **principales.** Organization (le bailleur ou l'agence),
User (rôles : admin bailleur, gestionnaire, propriétaire si agence,
locataire), Property (logement), Lease (contrat de bail, lie un Property
à un User locataire), RentPayment (paiement mensuel), Receipt
(quittance), MaintenanceRequest (demande de maintenance).

**Cas** **d'usage** **core.**

> 1\. Le bailleur ajoute un logement avec ses caractéristiques (adresse,
> surface, loyer). 2. Le bailleur signe un bail : il sélectionne le
> logement et associe un locataire.
>
> 3\. Chaque mois, l'app génère l'échéance de loyer et notifie le
> locataire.
>
> 4\. Le locataire paie (Mobile Money mocké) et reçoit automatiquement
> sa quittance PDF. 5. Le bailleur voit son tableau de bord :
> occupation, impayés, prévisionnel.
>
> 6\. Le locataire signale une fuite d'eau ; le bailleur reçoit la
> demande de maintenance et la traite.

**Endpoints** **API** **principaux.** POST /api/properties, POST
/api/leases, GET /api/leases/:id/payments, POST /api/payments, POST
/api/receipts/generate, POST /api/maintenance-requests, GET
/api/dashboard/overview.

**Composants** **UI** **principaux.** PropertyManager, LeaseEditor,
RentCalendar, ReceiptGenerator, TenantPortal, MaintenanceBoard,
LandlordDashboard.

**Hors-scope** **v1.** Génération automatique des contrats de bail,
signature électronique, intégration cadastre, comptabilité fiscale
automatique, gestion d'eau/électricité incluse, locations meublées
courte durée.

Projet 7 — AgriTrack

**Pitch.** Système de suivi de coopératives agricoles ivoiriennes
(cacao, anacarde, café) : enregistrement des producteurs, suivi des
livraisons, paiements traçables, historique de production. Chaque
coopérative = un tenant.

**Contexte** **Abidjan** **/** **Côte** **d'Ivoire.** La Côte d'Ivoire
est le premier producteur mondial de cacao. La filière s'organise autour
de coopératives qui achètent aux producteurs, stockent, et revendent aux
exportateurs. La traçabilité est devenue critique (réglementation
européenne 2025 sur la déforestation). Les coopératives ont besoin d'un
système simple, fonctionnant en zone à connexion limitée, pour
enregistrer chaque livraison et payer leurs producteurs. AgriTrack
répond à ce besoin : interface basée sur Abidjan (siège des
coopératives) avec capture terrain robuste.

**Personas.**

> \- *M.* *Bamba,* *directeur* *de* *la* *Coopérative* *ECAM-CI*
> *(admin* *du* *tenant)* — basé à Abidjan, supervise les opérations,
> voit les flux et les paiements.
>
> \- *Mariam,* *agent* *de* *terrain* *à* *San-Pédro* — enregistre les
> producteurs, pèse les livraisons, déclenche les paiements.
>
> \- *Yao,* *producteur* *de* *cacao* *à* *Soubré* *(utilisateur*
> *léger* *ou* *non* *connecté* *—* *agent* *saisit* *pour* *lui)* —
> reçoit ses paiements, voit son historique.

**Entités** **principales.** Organization (la coopérative), User (rôles
: admin coop, agent terrain, comptable, producteur), Producer (fiche
producteur — peut exister sans User connecté), Plantation (parcelle d'un
producteur, avec coordonnées GPS pour traçabilité), Delivery (livraison
de récolte avec poids et qualité), Payment (paiement au producteur).

**Cas** **d'usage** **core.**

> 1\. L'agent terrain enregistre un nouveau producteur avec ses
> parcelles (coordonnées GPS, surface, certifications).
>
> 2\. Lors d'une livraison, l'agent pèse le sac et enregistre la
> livraison (poids, qualité, prix au kg du jour).
>
> 3\. Le système calcule le montant dû et le marque « à payer ».
>
> 4\. Le comptable de la coopérative déclenche le paiement (Mobile Money
> mocké) ; le producteur est notifié.
>
> 5\. Le producteur consulte son historique de livraisons et de
> paiements (sur app simple ou via SMS).
>
> 6\. Le directeur a un tableau de bord : tonnage du jour, montant payé,
> top producteurs, alertes.

**Endpoints** **API** **principaux.** POST /api/producers, POST
/api/plantations, POST /api/deliveries, GET
/api/producers/:id/deliveries, POST /api/payments, GET
/api/dashboard/season-summary.

**Composants** **UI** **principaux.** ProducerRegistration (vue terrain,
optimisée mobile), DeliveryEntry, PaymentQueue, ProducerStatement,
CooperativeDashboard, TraceabilityMap (vue carto simple des parcelles).

**Hors-scope** **v1.** Mode 100% offline avec sync différée, intégration
vraie blockchain de traçabilité, certification bio automatisée, prêts
aux producteurs, prévisions de récolte ML.

Projet 8 — EventBookCI

**Pitch.** Plateforme de réservation de salles et services événementiels
pour mariages, séminaires d'entreprise et anniversaires à Abidjan.
Chaque prestataire (salle, traiteur, DJ) = un tenant.

**Contexte** **Abidjan.** L'événementiel est une grande industrie
informelle à Abidjan : mariages dotaux et religieux (souvent 500+
invités), conférences en hôtels du Plateau, baptêmes, anniversaires. Les
prestataires (salles de réception, traiteurs, DJ, photographes,
décorateurs) prennent les réservations par téléphone et WhatsApp, sans
système de calendrier partagé — d'où des doubles bookings fréquents.
EventBookCI digitalise la prise de réservation pour ces prestataires et
permet aux clients de comparer et réserver en ligne.

**Personas.**

> \- *Mme* *Adjoa,* *propriétaire* *de* *la* *salle* *Riviera*
> *Reception* *(admin* *du* *tenant* *prestataire)* — publie ses
> créneaux, accepte ou refuse les réservations.
>
> \- *Joud,* *organisateur* *d'un* *séminaire* *d'entreprise* — cherche
> une salle pour 80 personnes, compare, réserve.
>
> \- *Aya,* *future* *mariée* — réserve une salle, un traiteur et un DJ
> pour le même jour, depuis la même app.

**Entités** **principales.** Organization (le prestataire), User (rôles
: admin prestataire, employé prestataire, client), Venue (salle, ou
prestation pour traiteur/DJ — entité polymorphe), Availability (créneau
disponible), Booking (réservation), BookingService (services
additionnels d'une réservation : déco, sécurité), Payment (acompte +
solde).

**Cas** **d'usage** **core.**

> 1\. Le prestataire publie sa salle/prestation : photos, capacité,
> tarif, services inclus. 2. Le prestataire publie ses disponibilités
> (un calendrier des créneaux libres).
>
> 3\. Un client cherche une salle pour une date et une capacité ; il
> voit les options disponibles. 4. Le client réserve un créneau ; la
> demande est en statut « pending » côté prestataire.
>
> 5\. Le prestataire accepte ou refuse ; si accepté, le client paie un
> acompte (Mobile Money mocké).
>
> 6\. Le client peut ajouter d'autres services (traiteur, DJ) à sa
> réservation depuis d'autres prestataires.

**Endpoints** **API** **principaux.** POST /api/venues, POST
/api/availability, GET /api/venues/search?date=...&capacity=..., POST
/api/bookings, PATCH /api/bookings/:id/respond, POST
/api/bookings/:id/services, POST /api/payments.

**Composants** **UI** **principaux.** VenuePublisher,
AvailabilityCalendar, VenueSearch, BookingFlow, ProviderDashboard,
ClientBookingHistory.

**Hors-scope** **v1.** Marketplace public anonyme (les inscriptions
prestataires sont validées manuellement en v1), photos haute qualité
avec IA, recommandations personnalisées, gestion de listes d'invités,
livestreaming d'événements.

Comment choisir votre projet Quelques pistes pour choisir parmi les 8 :

> \- **Choisissez** **un** **domaine** **qui** **vous** **parle.** Vous
> serez sur ce projet pendant plusieurs semaines après le cours. Si
> l'agriculture vous laisse froid, ne prenez pas AgriTrack même s'il est
> techniquement intéressant. Si vous avez un parent qui gère une école,
> EcoleConnect aura du sens immédiat pour vous.
>
> \- **Considérez** **la** **complexité** **du** **modèle** **de**
> **données.** TontineFlow et LoyerSimple ont des modèles relativement
> simples (5-6 entités, relations claires). MarchéLink et EventBookCI
> sont plus complexes (cross-tenant, services additionnels, états
> multiples). Si c'est votre premier projet full-stack autonome, partez
> sur le simple.
>
> \- **Pensez** **à** **qui** **pourrait** **l'utiliser**
> **réellement.** Le but du capstone n'est pas que le projet finisse en
> démo et soit oublié. Si vous connaissez un commerçant à Adjamé, une
> école privée, un bailleur, un médecin, une coopérative — montrez-leur
> votre prototype. C'est le test ultime : est-ce qu'un utilisateur réel
> comprend l'app et veut s'en servir ?
>
> \- **N'inventez** **pas** **un** **9e** **projet.** Ces 8 projets ont
> été choisis parce qu'ils sont **réalisables** dans la portée d'un
> capstone post-cours, **multi-tenant** **naturellement**, et **ancrés**
> dans un vrai problème abidjanais. Inventer un 9e (« je veux faire un
> réseau social pour... ») est tentant mais souvent piégeux — la portée
> explose et le projet ne finit jamais.

Livrables attendus pour le capstone

Quel que soit le projet choisi, à la fin de votre capstone vous
présenterez :

> 1\. **Un** **repo** **GitHub** **public** avec un README clair (titre,
> pitch, captures d'écran, instructions d'installation locale, lien vers
> la démo en ligne).
>
> 2\. **Un** **CLAUDE.md** **complet** (~30 règles minimum) qui a guidé
> tout le projet.
>
> 3\. **Un** **docs/PRD.md** **et** **un** **docs/PLAN.md** validés par
> les passes Critic et Architect. 4. **Une** **suite** **de** **tests**
> **verte** sur les chemins critiques (création, lecture, isolation
>
> cross-tenant). Couverture ≥ 70% sur les fichiers métier.
>
> 5\. **Une** **instance** **déployée** sur un VPS (DigitalOcean,
> Hetzner, Scaleway), accessible via un nom de domaine (un sous-domaine
> monprojet.votredomaine.com suffit).
>
> 6\. **HTTPS** **configuré** via Let's Encrypt + nginx.
>
> 7\. **Une** **pipeline** **CI/CD** (GitHub Actions) qui lance les
> tests à chaque push sur main.
>
> 8\. **Une** **démo** **live** **de** **10** **minutes** : vous montrez
> l'app de bout en bout, expliquez les choix techniques, montrez le
> déploiement.

C'est le standard professionnel. Ce n'est pas optionnel — c'est ce qui
vous distinguera d'un développeur qui « a fait des projets de cours »
d'un développeur qui sait livrer.

**Version** **du** **document** **:** 1.0 · 28 avril 2026 **Auteur**
**:** George E. Salloum · Frontal · george.s@frontal.ltd **Pour** **la**
**cohorte** **:** Engineering with Claude Code, juin 2026, étudiants
libanais à Abidjan
