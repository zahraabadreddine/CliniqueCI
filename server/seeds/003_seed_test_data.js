/**
 * Seed 003 — Données test complètes (tous les rôles, toutes les fonctionnalités)
 *
 * Ajoute après les seeds 001 + 002 :
 *  ① Org2 — 4 nouveaux patients (Cabinet Médical Cocody)
 *  ② Org2 — RDV passés + aujourd'hui + futurs (Dr Bamba)
 *  ③ Org2 — Consultations, prescriptions, factures
 *  ④ Org2 — Stock articles + mouvements
 *  ⑤ Org2 — SMS reminders
 *  ⑥ Org2 — Formulaires de consentement + signatures
 *  ⑦ Org2 — Notifications (admin, médecin)
 *  ⑧ WhatsApp logs (simulation) — org1 + org2
 *  ⑨ Audit logs — org1 + org2 (historique admin, médecins, secrétaire)
 */

exports.seed = async function (knex) {
  // ─── Récupérer toutes les entités existantes ─────────────────────────────────
  const org1 = await knex('organizations').where('name', 'Clinique du Plateau').first();
  const org2 = await knex('organizations').where('name', 'Cabinet Médical Cocody').first();

  const admin1    = await knex('users').where({ organization_id: org1.id, role: 'admin' }).first();
  const doctor1   = await knex('users').where({ organization_id: org1.id, role: 'doctor', last_name: 'Koné' }).first();
  const doctor2   = await knex('users').where({ organization_id: org1.id, role: 'doctor', last_name: 'Traoré' }).first();
  const secretary = await knex('users').where({ organization_id: org1.id, role: 'secretary' }).first();
  const admin2    = await knex('users').where({ organization_id: org2.id, role: 'admin' }).first();
  const drBamba   = await knex('users').where({ organization_id: org2.id, role: 'doctor' }).first();

  // Patients org1 (créés dans seed 001)
  const org1Patients = await knex('patients').where('organization_id', org1.id).orderBy('created_at', 'asc');
  const [p1, p2, p3, p4, p5] = org1Patients;

  // Patients org2 existants (Ahou Diallo créée dans seed 001)
  const pAhouDiallo = await knex('patients').where('organization_id', org2.id).first();

  // ─── Helpers dates ────────────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const past = (daysAgo, h = 9, m = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, Number(m), 0, 0);
    return d.toISOString();
  };
  const future = (daysAhead, h = 9, m = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(h, Number(m), 0, 0);
    return d.toISOString();
  };
  const T = (h, m = 0) => {
    const d = new Date(today);
    d.setHours(h, Number(m), 0, 0);
    return d.toISOString();
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // ① PATIENTS — Org2 (Cabinet Médical Cocody)
  // ══════════════════════════════════════════════════════════════════════════════
  const org2NewPatients = await knex('patients').insert([
    // Kouamé Yeboué — hypertension + obésité
    {
      organization_id: org2.id,
      first_name: 'Kouamé',
      last_name: 'Yeboué',
      date_of_birth: '1978-05-14',
      phone: '+22507223344',
      email: 'k.yeboue@email.ci',
      blood_type: 'B+',
      allergies: null,
      chronic_diseases: 'Hypertension artérielle, Obésité grade 1',
      created_at: past(45),
      updated_at: past(45),
    },
    // Mariétou Sow — diabète type 2 (suivi mensuel)
    {
      organization_id: org2.id,
      first_name: 'Mariétou',
      last_name: 'Sow',
      date_of_birth: '1960-11-28',
      phone: '+22505445566',
      email: null,
      blood_type: 'A+',
      allergies: 'Sulfamides',
      chronic_diseases: 'Diabète type 2',
      created_at: past(60),
      updated_at: past(60),
    },
    // Lamine Ouédraogo — arthrose genou (nouveau patient)
    {
      organization_id: org2.id,
      first_name: 'Lamine',
      last_name: 'Ouédraogo',
      date_of_birth: '1970-03-07',
      phone: '+22507889900',
      email: 'lamine.ouedraogo@email.ci',
      blood_type: 'O+',
      allergies: null,
      chronic_diseases: 'Arthrose genou bilatérale',
      created_at: past(10),
      updated_at: past(10),
    },
    // Fatimata Koné — grossesse 28 SA (suivi prénatal)
    {
      organization_id: org2.id,
      first_name: 'Fatimata',
      last_name: 'Koné',
      date_of_birth: '1994-09-12',
      phone: '+22505998877',
      email: 'fatimata.kone@email.ci',
      blood_type: 'A-',
      allergies: null,
      chronic_diseases: null,
      created_at: past(28),
      updated_at: past(28),
    },
  ]).returning(['id', 'first_name', 'last_name', 'phone']);

  const [pYeboue, pSow, pOuedraogo, pFatimata] = org2NewPatients;

  // ══════════════════════════════════════════════════════════════════════════════
  // ② RENDEZ-VOUS — Org2 (Cabinet Médical Cocody)
  // ══════════════════════════════════════════════════════════════════════════════
  const org2PastAppts = await knex('appointments').insert([
    // -21j — Ahou Diallo (consultation initiale)
    {
      organization_id: org2.id, patient_id: pAhouDiallo.id, doctor_id: drBamba.id,
      scheduled_at: past(21, 9), status: 'completed',
      reason: 'Consultation de médecine générale — bilan de santé annuel',
      created_at: past(22, 16), updated_at: past(21, 10),
    },
    // -14j — Kouamé Yeboué (HTA + obésité)
    {
      organization_id: org2.id, patient_id: pYeboue.id, doctor_id: drBamba.id,
      scheduled_at: past(14, 10), status: 'completed',
      reason: 'Hypertension — suivi mensuel + contrôle poids',
      created_at: past(15, 11), updated_at: past(14, 11),
    },
    // -7j — Mariétou Sow (diabète mensuel)
    {
      organization_id: org2.id, patient_id: pSow.id, doctor_id: drBamba.id,
      scheduled_at: past(7, 9), status: 'completed',
      reason: 'Diabète type 2 — bilan mensuel glycémique',
      created_at: past(8, 14), updated_at: past(7, 10),
    },
    // -3j — Lamine Ouédraogo (arthrose, première consultation)
    {
      organization_id: org2.id, patient_id: pOuedraogo.id, doctor_id: drBamba.id,
      scheduled_at: past(3, 11), status: 'completed',
      reason: 'Douleurs articulaires genou — première consultation',
      created_at: past(4, 9), updated_at: past(3, 12),
    },
  ]).returning(['id']);
  const [oa1, oa2, oa3, oa4] = org2PastAppts;

  const org2TodayAppts = await knex('appointments').insert([
    // 08:30 — Ahou Diallo → terminé
    {
      organization_id: org2.id, patient_id: pAhouDiallo.id, doctor_id: drBamba.id,
      scheduled_at: T(8, 30), status: 'completed',
      reason: 'Suivi tension artérielle post-traitement',
      created_at: past(2, 17), updated_at: T(9, 15),
    },
    // 09:30 — Mariétou Sow → in-room (consultation en cours)
    {
      organization_id: org2.id, patient_id: pSow.id, doctor_id: drBamba.id,
      scheduled_at: T(9, 30), status: 'in-room',
      reason: 'Diabète — suivi mensuel',
      created_at: past(2, 17), updated_at: T(9, 35),
    },
    // 10:30 — Fatimata Koné → confirmé
    {
      organization_id: org2.id, patient_id: pFatimata.id, doctor_id: drBamba.id,
      scheduled_at: T(10, 30), status: 'confirmed',
      reason: 'Grossesse 28 SA — consultation prénatale mensuelle',
      created_at: past(1, 10), updated_at: past(1, 10),
    },
    // 14:30 — Lamine Ouédraogo → confirmé
    {
      organization_id: org2.id, patient_id: pOuedraogo.id, doctor_id: drBamba.id,
      scheduled_at: T(14, 30), status: 'confirmed',
      reason: 'Suivi douleurs articulaires — résultats radio genou',
      created_at: past(1, 14), updated_at: past(1, 14),
    },
  ]).returning(['id']);
  const [ot1, ot2, ot3, ot4] = org2TodayAppts;

  // RDV futurs org2 — récupérer les IDs (requis pour SMS reminders: appointment_id NOT NULL)
  const org2FutureAppts = await knex('appointments').insert([
    // +5j — Kouamé Yeboué
    {
      organization_id: org2.id, patient_id: pYeboue.id, doctor_id: drBamba.id,
      scheduled_at: future(5, 9, 30), status: 'confirmed',
      reason: 'HTA — prochain contrôle tensionnel',
      created_at: past(3, 16), updated_at: past(3, 16),
    },
    // +14j — Mariétou Sow
    {
      organization_id: org2.id, patient_id: pSow.id, doctor_id: drBamba.id,
      scheduled_at: future(14, 9), status: 'pending',
      reason: 'Diabète — prochain contrôle mensuel',
      created_at: past(1, 11), updated_at: past(1, 11),
    },
    // +28j — Fatimata Koné (32 SA)
    {
      organization_id: org2.id, patient_id: pFatimata.id, doctor_id: drBamba.id,
      scheduled_at: future(28, 10), status: 'confirmed',
      reason: 'Grossesse 32 SA — consultation prénatale',
      created_at: past(0, 11), updated_at: past(0, 11),
    },
  ]).returning(['id']);
  const [of1, of2, of3] = org2FutureAppts;

  // ══════════════════════════════════════════════════════════════════════════════
  // ③ CONSULTATIONS + PRESCRIPTIONS + FACTURES — Org2
  // ══════════════════════════════════════════════════════════════════════════════
  const org2Consultations = await knex('consultations').insert([
    // c1 — Ahou Diallo bilan santé (-21j)
    {
      organization_id: org2.id,
      appointment_id: oa1.id,
      patient_id: pAhouDiallo.id,
      doctor_id: drBamba.id,
      chief_complaint: 'Bilan de santé annuel. Fatigue chronique depuis 3 mois. Pas d\'antécédents majeurs.',
      examination: 'TA : 118/76 mmHg · FC : 82 bpm · Poids : 64 kg · Taille : 165 cm · IMC : 23.5\nAuscultation : normale. Abdomen souple. Glycémie capillaire : 0.92 g/L — normale.',
      diagnosis: 'Fatigue fonctionnelle. Bilan sanguin normal. Pas de pathologie identifiée.',
      notes: 'NFS + ferritinémie prescrites pour recherche anémie latente. Vitamines D prescrites. Revu dans 3 mois.',
      created_at: past(21, 9, 30), updated_at: past(21, 9, 30),
    },
    // c2 — Kouamé Yeboué HTA (-14j)
    {
      organization_id: org2.id,
      appointment_id: oa2.id,
      patient_id: pYeboue.id,
      doctor_id: drBamba.id,
      chief_complaint: 'Suivi HTA mensuel. Sensation de lourdeur dans la nuque. Prise de poids ce mois.',
      examination: 'TA : 162/98 mmHg (élevée) · FC : 88 bpm · Poids : 98 kg (+2 kg) · IMC : 31.4\nAuscultation cardiaque : B1-B2 réguliers, sans souffle. ECG : rythme sinusal normal.',
      diagnosis: 'HTA essentielle grade 2 non contrôlée. Obésité grade 1 aggravante.',
      notes: 'Intensification traitement : ajout Losartan 50mg. Régime hypocalorique strict. Reprise activité physique. Contrôle dans 3 semaines.',
      created_at: past(14, 10, 30), updated_at: past(14, 10, 30),
    },
    // c3 — Mariétou Sow diabète (-7j)
    {
      organization_id: org2.id,
      appointment_id: oa3.id,
      patient_id: pSow.id,
      doctor_id: drBamba.id,
      chief_complaint: 'Bilan diabète mensuel. Glycémie légèrement élevée en fin de semaine. Bonne observance traitement.',
      examination: 'TA : 136/88 mmHg · FC : 74 bpm · Poids : 78 kg (stable)\nGlycémie capillaire à jeun : 1.52 g/L. Examen pieds : sensibilité conservée, pas de lésion.',
      diagnosis: 'Diabète type 2 modérément contrôlé. HbA1c à doser ce mois.',
      notes: 'HbA1c prescrite. Continuer Metformine 850mg × 2. Rappel régime hypoglucidique. Revu dans 4 semaines avec résultats.',
      created_at: past(7, 9, 30), updated_at: past(7, 9, 30),
    },
    // c4 — Ahou Diallo suivi (aujourd'hui 08:30)
    {
      organization_id: org2.id,
      appointment_id: ot1.id,
      patient_id: pAhouDiallo.id,
      doctor_id: drBamba.id,
      chief_complaint: 'Suivi post-bilan. Résultats NFS reçus. Fatigue améliorée après supplémentation.',
      examination: 'TA : 116/74 mmHg · FC : 78 bpm · Poids : 63 kg (-1 kg)\nRésultats NFS : Hb 12.8 g/dL (légèrement basse), ferritine 18 µg/L (carence).',
      diagnosis: 'Anémie ferriprive légère. Bonne réponse à la supplémentation vitaminique.',
      notes: 'Fer médicamenteux prescrit 3 mois. Régime riche en fer. Contrôle NFS dans 3 mois.',
      created_at: T(9, 15), updated_at: T(9, 15),
    },
  ]).returning(['id']);
  const [oc1, oc2, oc3, oc4] = org2Consultations;

  // Prescriptions org2
  await knex('prescriptions').insert([
    // rx1 — Ahou Diallo (anémie, c1, -21j)
    {
      organization_id: org2.id,
      consultation_id: oc1.id,
      patient_id: pAhouDiallo.id,
      doctor_id: drBamba.id,
      medications: JSON.stringify([
        { name: 'Vitamine D3 100 000 UI', dosage: '1 ampoule par mois', duration: '3 mois', instructions: 'Prendre le weekend avec un grand verre d\'eau' },
        { name: 'Fer + Acide folique', dosage: '1 comprimé par jour', duration: '2 mois', instructions: 'Le matin à jeun — éviter thé/café dans l\'heure qui suit' },
      ]),
      notes: 'NFS + ferritinémie de contrôle dans 6 semaines.',
      created_at: past(21, 9, 45), updated_at: past(21, 9, 45),
    },
    // rx2 — Kouamé Yeboué (HTA, c2, -14j)
    {
      organization_id: org2.id,
      consultation_id: oc2.id,
      patient_id: pYeboue.id,
      doctor_id: drBamba.id,
      medications: JSON.stringify([
        { name: 'Amlodipine 10mg', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Le matin, à jeun ou avec repas léger' },
        { name: 'Losartan 50mg', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Le soir avec un verre d\'eau' },
      ]),
      notes: 'Régime hypocalorique + sel < 4g/j. Automesure tensionnelle quotidienne.',
      created_at: past(14, 11), updated_at: past(14, 11),
    },
    // rx3 — Mariétou Sow (diabète, c3, -7j)
    {
      organization_id: org2.id,
      consultation_id: oc3.id,
      patient_id: pSow.id,
      doctor_id: drBamba.id,
      medications: JSON.stringify([
        { name: 'Metformine 850mg', dosage: '1 comprimé matin et soir', duration: '30 jours', instructions: 'Pendant les repas — stopper si troubles digestifs sévères' },
      ]),
      notes: 'HbA1c prescrite. Objectif glycémie < 1.30 g/L. Automesure × 2/j.',
      created_at: past(7, 10), updated_at: past(7, 10),
    },
    // rx4 — Ahou Diallo anémie (c4, aujourd'hui)
    {
      organization_id: org2.id,
      consultation_id: oc4.id,
      patient_id: pAhouDiallo.id,
      doctor_id: drBamba.id,
      medications: JSON.stringify([
        { name: 'Fer 200mg + Acide ascorbique', dosage: '1 comprimé par jour', duration: '3 mois', instructions: 'Le matin à jeun — NE PAS prendre avec du thé ou du café' },
      ]),
      notes: 'Contrôle NFS + ferritine dans 3 mois. Alimentation enrichie en fer.',
      created_at: T(9, 30), updated_at: T(9, 30),
    },
  ]);

  // Factures org2
  await knex('invoices').insert([
    // -21j — Ahou Diallo → PAYÉE (wave)
    {
      organization_id: org2.id, patient_id: pAhouDiallo.id,
      consultation_id: oc1.id, appointment_id: oa1.id,
      amount: 10000, currency: 'XOF', status: 'paid',
      payment_method: 'wave', paid_at: past(21, 10),
      created_at: past(21, 9, 30), updated_at: past(21, 10),
    },
    // -14j — Kouamé Yeboué → PAYÉE (cash)
    {
      organization_id: org2.id, patient_id: pYeboue.id,
      consultation_id: oc2.id, appointment_id: oa2.id,
      amount: 12000, currency: 'XOF', status: 'paid',
      payment_method: 'cash', paid_at: past(14, 11),
      created_at: past(14, 10, 30), updated_at: past(14, 11),
    },
    // -7j — Mariétou Sow → PAYÉE (orange_money)
    {
      organization_id: org2.id, patient_id: pSow.id,
      consultation_id: oc3.id, appointment_id: oa3.id,
      amount: 8000, currency: 'XOF', status: 'paid',
      payment_method: 'orange_money', paid_at: past(7, 10),
      created_at: past(7, 9, 30), updated_at: past(7, 10),
    },
    // -3j — Lamine Ouédraogo → EN ATTENTE
    {
      organization_id: org2.id, patient_id: pOuedraogo.id,
      consultation_id: null, appointment_id: oa4.id,
      amount: 15000, currency: 'XOF', status: 'pending',
      payment_method: null, paid_at: null,
      created_at: past(3, 12), updated_at: past(3, 12),
    },
    // Aujourd'hui — Ahou Diallo → PAYÉE (mtn_money)
    {
      organization_id: org2.id, patient_id: pAhouDiallo.id,
      consultation_id: oc4.id, appointment_id: ot1.id,
      amount: 10000, currency: 'XOF', status: 'paid',
      payment_method: 'mtn_money', paid_at: T(9, 20),
      created_at: T(9, 15), updated_at: T(9, 20),
    },
  ]);

  // ══════════════════════════════════════════════════════════════════════════════
  // ④ STOCK — Org2 (Cabinet Médical Cocody)
  // ══════════════════════════════════════════════════════════════════════════════
  const org2StockItems = await knex('stock_items').insert([
    {
      organization_id: org2.id, name: 'Metformine 850mg', category: 'medicament',
      unit: 'comprimé', quantity: 12, min_quantity: 30,  // ⚠️ STOCK BAS
      unit_price: 55, supplier: 'Pharma Cocody',
      created_at: past(30), updated_at: past(5),
    },
    {
      organization_id: org2.id, name: 'Amlodipine 10mg', category: 'medicament',
      unit: 'comprimé', quantity: 80, min_quantity: 25,
      unit_price: 80, supplier: 'Pharma Cocody',
      created_at: past(30), updated_at: past(10),
    },
    {
      organization_id: org2.id, name: 'Losartan 50mg', category: 'medicament',
      unit: 'comprimé', quantity: 60, min_quantity: 20,
      unit_price: 70, supplier: 'MedSupply Abidjan',
      created_at: past(30), updated_at: past(8),
    },
    {
      organization_id: org2.id, name: 'Vitamine D3 100 000 UI', category: 'medicament',
      unit: 'ampoule', quantity: 25, min_quantity: 10,
      unit_price: 2500, supplier: 'MedSupply Abidjan',
      created_at: past(20), updated_at: past(20),
    },
    {
      organization_id: org2.id, name: 'Gants latex (boîte 100)', category: 'consommable',
      unit: 'boîte', quantity: 3, min_quantity: 8,  // ⚠️ STOCK BAS
      unit_price: 4500, supplier: 'MedEquip CI',
      created_at: past(30), updated_at: past(5),
    },
    {
      organization_id: org2.id, name: 'Seringues 5mL', category: 'materiel',
      unit: 'pièce', quantity: 90, min_quantity: 30,
      unit_price: 150, supplier: 'MedEquip CI',
      created_at: past(30), updated_at: past(15),
    },
  ]).returning(['id', 'name']);

  const [s2Metformine, s2Amlodipine, s2Losartan, s2VitD, s2Gants, s2Seringues] = org2StockItems;

  await knex('stock_movements').insert([
    // Approvisionnements initiaux (-30j)
    { organization_id: org2.id, stock_item_id: s2Metformine.id,  actor_id: admin2.id,  type: 'in',         quantity: 150, reason: 'Commande initiale Metformine',                        created_at: past(30, 10), updated_at: past(30, 10) },
    { organization_id: org2.id, stock_item_id: s2Amlodipine.id,  actor_id: admin2.id,  type: 'in',         quantity: 100, reason: 'Commande initiale Amlodipine',                        created_at: past(30, 10), updated_at: past(30, 10) },
    { organization_id: org2.id, stock_item_id: s2Gants.id,        actor_id: admin2.id,  type: 'in',         quantity: 15,  reason: 'Commande consommables',                              created_at: past(30, 10), updated_at: past(30, 10) },
    // Sorties (dispensation consultations)
    { organization_id: org2.id, stock_item_id: s2Metformine.id,  actor_id: drBamba.id, type: 'out',        quantity: 90,  reason: 'Dispensation ordonnances diabète — 3 semaines',       created_at: past(14, 11), updated_at: past(14, 11) },
    { organization_id: org2.id, stock_item_id: s2Amlodipine.id,  actor_id: drBamba.id, type: 'out',        quantity: 20,  reason: 'Dispensation HTA — sem. 1-2',                         created_at: past(14, 11), updated_at: past(14, 11) },
    { organization_id: org2.id, stock_item_id: s2Gants.id,        actor_id: drBamba.id, type: 'out',        quantity: 8,   reason: 'Utilisation consultations 3 semaines',               created_at: past(10, 9),  updated_at: past(10, 9)  },
    { organization_id: org2.id, stock_item_id: s2Metformine.id,  actor_id: drBamba.id, type: 'out',        quantity: 48,  reason: 'Dispensation ordonnances — 2 semaines',               created_at: past(7, 11),  updated_at: past(7, 11)  },
    { organization_id: org2.id, stock_item_id: s2Seringues.id,   actor_id: drBamba.id, type: 'out',        quantity: 10,  reason: 'Prélèvements sanguins semaine en cours',             created_at: past(3, 10),  updated_at: past(3, 10)  },
    // Réapprovisionnement partiel Amlodipine
    { organization_id: org2.id, stock_item_id: s2Amlodipine.id,  actor_id: admin2.id,  type: 'in',         quantity: 50,  reason: 'Réapprovisionnement Amlodipine — commande express',  created_at: past(5, 9),   updated_at: past(5, 9)   },
    { organization_id: org2.id, stock_item_id: s2Amlodipine.id,  actor_id: drBamba.id, type: 'out',        quantity: 50,  reason: 'Dispensation ordonnances HTA — mois en cours',        created_at: past(5, 11),  updated_at: past(5, 11)  },
    // Ajustement inventaire
    { organization_id: org2.id, stock_item_id: s2Gants.id,        actor_id: admin2.id,  type: 'adjustment', quantity: -4,  reason: 'Correction inventaire physique — emballages abîmés', created_at: past(2, 10),  updated_at: past(2, 10)  },
  ]);

  // ══════════════════════════════════════════════════════════════════════════════
  // ⑤ SMS REMINDERS — Org2
  //    IMPORTANT : appointment_id est notNullable (migration 018)
  //    => tous les rappels doivent avoir un appointment_id valide
  // ══════════════════════════════════════════════════════════════════════════════
  await knex('sms_reminders').insert([
    // Rappel 48h envoyé — Ahou Diallo RDV aujourd'hui (08:30)
    {
      organization_id: org2.id, appointment_id: ot1.id,
      phone: '+22509080706', status: 'sent', type: 'reminder_48h',
      message: 'Bonjour Ahou Diallo, rappel de votre RDV demain à 08h30 au Cabinet Médical Cocody.',
      scheduled_at: past(2, 8, 30), sent_at: past(2, 8, 32),
      created_at: past(2, 8, 28), updated_at: past(2, 8, 32),
    },
    // Rappel 2h envoyé — Ahou Diallo RDV aujourd'hui
    {
      organization_id: org2.id, appointment_id: ot1.id,
      phone: '+22509080706', status: 'sent', type: 'reminder_2h',
      message: 'Bonjour Ahou Diallo, votre RDV est dans 2h au Cabinet Médical Cocody (08h30).',
      scheduled_at: T(6, 30), sent_at: T(6, 31),
      created_at: T(6, 29), updated_at: T(6, 31),
    },
    // Rappel 48h envoyé — Fatimata Koné RDV 10:30 aujourd'hui
    {
      organization_id: org2.id, appointment_id: ot3.id,
      phone: '+22505998877', status: 'sent', type: 'reminder_48h',
      message: 'Bonjour Fatimata Koné, rappel de votre consultation prénatale demain à 10h30 au Cabinet Médical Cocody.',
      scheduled_at: past(2, 10, 30), sent_at: past(2, 10, 32),
      created_at: past(2, 10, 28), updated_at: past(2, 10, 32),
    },
    // Rappel pending — RDV futur Kouamé Yeboué (+5j) → of1.id (NOT NULL garanti)
    {
      organization_id: org2.id, appointment_id: of1.id,
      phone: '+22507223344', status: 'pending', type: 'reminder_48h',
      message: 'Bonjour Kouamé Yeboué, rappel de votre RDV dans 2 jours à 09h30 au Cabinet Médical Cocody.',
      scheduled_at: future(3, 9, 30), sent_at: null,
      created_at: T(14), updated_at: T(14),
    },
    // Rappel pending — RDV futur Mariétou Sow (+14j) → of2.id
    {
      organization_id: org2.id, appointment_id: of2.id,
      phone: '+22505445566', status: 'pending', type: 'reminder_48h',
      message: 'Bonjour Mariétou Sow, rappel de votre bilan diabète dans 2 jours au Cabinet Médical Cocody.',
      scheduled_at: future(12, 9), sent_at: null,
      created_at: T(14, 5), updated_at: T(14, 5),
    },
    // Échec SMS — Lamine Ouédraogo (numéro injoignable lors RDV -3j)
    {
      organization_id: org2.id, appointment_id: oa4.id,
      phone: '+22507889900', status: 'failed', type: 'reminder_48h',
      message: 'Bonjour Lamine Ouédraogo, rappel de votre RDV demain à 11h00 au Cabinet Médical Cocody.',
      scheduled_at: past(4, 11), sent_at: null,
      created_at: past(4, 10, 55), updated_at: past(4, 11, 2),
    },
  ]);

  // ══════════════════════════════════════════════════════════════════════════════
  // ⑥ FORMULAIRES DE CONSENTEMENT — Org2
  // ══════════════════════════════════════════════════════════════════════════════
  const fakeSig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const org2Forms = await knex('consent_forms').insert([
    {
      organization_id: org2.id, title: 'Consentement éclairé général', category: 'general', is_active: true,
      content: 'Je consens librement aux soins médicaux proposés par le Dr Aïcha Bamba au Cabinet Médical Cocody, après avoir été informé(e) des bénéfices, risques et alternatives. Je peux retirer ce consentement à tout moment.',
    },
    {
      organization_id: org2.id, title: 'Traitement des données de santé', category: 'data', is_active: true,
      content: 'Le Cabinet Médical Cocody collecte vos données de santé pour : dossier médical, facturation, rappels RDV par SMS/WhatsApp. Conservation 10 ans. Accès/rectification/suppression sur demande : admin@cabinet-cocody.ci',
    },
    {
      organization_id: org2.id, title: 'Suivi grossesse et obstétrique', category: 'operation', is_active: true,
      content: 'Je consens au suivi prénatal au Cabinet Médical Cocody, incluant examens cliniques, prescriptions et orientations vers spécialistes. Calendrier : 8 consultations prénatales recommandées.',
    },
  ]).returning(['id', 'title']);

  const [org2FormGeneral, org2FormData, org2FormMaternite] = org2Forms;

  await knex('consent_signatures').insert([
    // Ahou Diallo — général + données signés (-21j)
    { organization_id: org2.id, consent_form_id: org2FormGeneral.id,   patient_id: pAhouDiallo.id, collected_by: drBamba.id, signed: true,  signature_data: fakeSig, signed_at: past(21, 9, 10), created_at: past(21, 9), updated_at: past(21, 9, 10) },
    { organization_id: org2.id, consent_form_id: org2FormData.id,      patient_id: pAhouDiallo.id, collected_by: drBamba.id, signed: true,  signature_data: fakeSig, signed_at: past(21, 9, 12), created_at: past(21, 9), updated_at: past(21, 9, 12) },
    // Kouamé Yeboué — général signé, données EN ATTENTE
    { organization_id: org2.id, consent_form_id: org2FormGeneral.id,   patient_id: pYeboue.id,     collected_by: drBamba.id, signed: true,  signature_data: fakeSig, signed_at: past(45, 10, 5), created_at: past(45, 10), updated_at: past(45, 10, 5) },
    { organization_id: org2.id, consent_form_id: org2FormData.id,      patient_id: pYeboue.id,     collected_by: drBamba.id, signed: false, signature_data: null,    signed_at: null,            created_at: past(14, 10), updated_at: past(14, 10)    },
    // Mariétou Sow — général signé (ancienne patiente)
    { organization_id: org2.id, consent_form_id: org2FormGeneral.id,   patient_id: pSow.id,        collected_by: drBamba.id, signed: true,  signature_data: fakeSig, signed_at: past(60, 9, 8),  created_at: past(60, 9),  updated_at: past(60, 9, 8)  },
    // Fatimata Koné — général + maternité signés (-28j)
    { organization_id: org2.id, consent_form_id: org2FormGeneral.id,   patient_id: pFatimata.id,   collected_by: drBamba.id, signed: true,  signature_data: fakeSig, signed_at: past(28, 9, 5),  created_at: past(28, 9),  updated_at: past(28, 9, 5)  },
    { organization_id: org2.id, consent_form_id: org2FormMaternite.id, patient_id: pFatimata.id,   collected_by: drBamba.id, signed: true,  signature_data: fakeSig, signed_at: past(28, 9, 15), created_at: past(28, 9),  updated_at: past(28, 9, 15) },
    // Lamine Ouédraogo — EN ATTENTE (nouveau patient)
    { organization_id: org2.id, consent_form_id: org2FormGeneral.id,   patient_id: pOuedraogo.id,  collected_by: drBamba.id, signed: false, signature_data: null,    signed_at: null,            created_at: past(3, 11),  updated_at: past(3, 11)     },
  ]);

  // ══════════════════════════════════════════════════════════════════════════════
  // ⑦ NOTIFICATIONS — Org2 + cross-org
  // ══════════════════════════════════════════════════════════════════════════════
  await knex('notifications').insert([
    // Dr Bamba — RDV du jour et alertes
    { organization_id: org2.id, user_id: drBamba.id, type: 'new_appointment',       title: 'Nouveau RDV',                 body: 'Ahou Diallo — 08:30, Suivi post-bilan',                         link: '/appointments',  is_read: true,  created_at: past(2, 17),    updated_at: past(2, 17)    },
    { organization_id: org2.id, user_id: drBamba.id, type: 'new_appointment',       title: 'Nouveau RDV',                 body: 'Fatimata Koné — 10:30, Consultation prénatale 28 SA',           link: '/appointments',  is_read: false, created_at: past(1, 10),    updated_at: past(1, 10)    },
    { organization_id: org2.id, user_id: drBamba.id, type: 'patient_arrived',       title: 'Patient en attente',          body: 'Ahou Diallo est arrivée — RDV 08:30',                           link: '/doctor-home',   is_read: true,  created_at: T(8, 25),       updated_at: T(8, 25)       },
    { organization_id: org2.id, user_id: drBamba.id, type: 'appointment_completed', title: 'Consultation terminée',       body: 'Ahou Diallo — anémie ferriprive légère, prescription émise',    link: '/consultations', is_read: false, created_at: T(9, 15),       updated_at: T(9, 15)       },
    { organization_id: org2.id, user_id: drBamba.id, type: 'new_appointment',       title: 'RDV confirmé',                body: 'Mariétou Sow — 09:30 aujourd\'hui, Diabète suivi mensuel',       link: '/appointments',  is_read: true,  created_at: past(2, 17, 5), updated_at: past(2, 17, 5) },
    // Admin Org2 — gestion et alertes
    { organization_id: org2.id, user_id: admin2.id,  type: 'invoice_paid',          title: 'Paiement reçu',               body: 'Ahou Diallo — 10 000 XOF via MTN Money',                        link: '/invoices',      is_read: false, created_at: T(9, 22),       updated_at: T(9, 22)       },
    { organization_id: org2.id, user_id: admin2.id,  type: 'system',                title: 'Stock bas — alerte',          body: '2 articles critiques : Metformine 850mg (12 restants), Gants (3)',link: '/stock',         is_read: false, created_at: T(8),           updated_at: T(8)           },
    { organization_id: org2.id, user_id: admin2.id,  type: 'system',                title: 'Facture en attente',          body: 'Lamine Ouédraogo — 15 000 XOF en attente de règlement',         link: '/invoices',      is_read: false, created_at: past(3, 12, 5), updated_at: past(3, 12, 5) },
    { organization_id: org2.id, user_id: admin2.id,  type: 'system',                title: 'Consentement manquant',       body: 'Lamine Ouédraogo — formulaire consentement général non signé',   link: '/consent',       is_read: false, created_at: past(3, 11, 5), updated_at: past(3, 11, 5) },
    { organization_id: org2.id, user_id: admin2.id,  type: 'system',                title: 'Bienvenue sur CliniqueCI',    body: 'Cabinet Médical Cocody est prêt. Bonne journée !',               link: '/dashboard',     is_read: true,  created_at: past(60, 8),    updated_at: past(60, 8)    },
    // Cross-org — partage de dossier (org2 demande vers org1)
    { organization_id: org1.id, user_id: admin1.id,  type: 'system',                title: 'Demande de partage dossier', body: 'Cabinet Cocody demande accès dossier Mariam Touré',              link: '/record-shares', is_read: false, created_at: T(10, 5),       updated_at: T(10, 5)       },
  ]);

  // ══════════════════════════════════════════════════════════════════════════════
  // ⑧ WHATSAPP LOGS (simulation) — Org1 + Org2
  // ══════════════════════════════════════════════════════════════════════════════

  // RDV du jour org1
  const org1TodayAppts = await knex('appointments')
    .where('organization_id', org1.id)
    .whereRaw("DATE(scheduled_at) = ?", [todayStr])
    .orderBy('scheduled_at', 'asc');
  const [ota1, ota2, ota3, ota4] = org1TodayAppts;

  const whatsappLogs = [];

  // ── Org1 — Clinique du Plateau ────────────────────────────────────────────────
  if (ota1) {
    // Confirmation + rappels J-1 et 2h
    whatsappLogs.push({ organization_id: org1.id, appointment_id: ota1.id, patient_id: p2 && p2.id, to_phone: '+22505060708', template: 'rdv_confirmation', status: 'simulated', wa_message_id: null, error_message: null, created_at: past(1, 17),   updated_at: past(1, 17)   });
    whatsappLogs.push({ organization_id: org1.id, appointment_id: ota1.id, patient_id: p2 && p2.id, to_phone: '+22505060708', template: 'rdv_rappel_j1',    status: 'simulated', wa_message_id: null, error_message: null, created_at: past(1, 8),    updated_at: past(1, 8)    });
    whatsappLogs.push({ organization_id: org1.id, appointment_id: ota1.id, patient_id: p2 && p2.id, to_phone: '+22505060708', template: 'rdv_rappel_h2',    status: 'simulated', wa_message_id: null, error_message: null, created_at: T(6, 30),      updated_at: T(6, 30)      });
  }
  if (ota2) {
    whatsappLogs.push({ organization_id: org1.id, appointment_id: ota2.id, patient_id: p3 && p3.id, to_phone: '+22505554433', template: 'rdv_confirmation', status: 'simulated', wa_message_id: null, error_message: null, created_at: past(1, 17, 5), updated_at: past(1, 17, 5) });
    whatsappLogs.push({ organization_id: org1.id, appointment_id: ota2.id, patient_id: p3 && p3.id, to_phone: '+22505554433', template: 'rdv_rappel_j1',    status: 'simulated', wa_message_id: null, error_message: null, created_at: past(1, 8, 5),  updated_at: past(1, 8, 5)  });
  }
  if (ota4) {
    whatsappLogs.push({ organization_id: org1.id, appointment_id: ota4.id, patient_id: p1 && p1.id, to_phone: '+22507080910', template: 'rdv_confirmation', status: 'simulated', wa_message_id: null, error_message: null, created_at: past(1, 17, 15), updated_at: past(1, 17, 15) });
  }
  // Annulation historique il y a 10j
  if (p4 && org1TodayAppts.length > 0) {
    whatsappLogs.push({ organization_id: org1.id, appointment_id: org1TodayAppts[0].id, patient_id: p4.id, to_phone: '+22507701122', template: 'rdv_annule', status: 'simulated', wa_message_id: null, error_message: null, created_at: past(10, 14), updated_at: past(10, 14) });
  }
  // Échec envoi (numéro non compatible WhatsApp)
  if (p5 && (ota3 || ota1)) {
    whatsappLogs.push({ organization_id: org1.id, appointment_id: (ota3 || ota1).id, patient_id: p5.id, to_phone: '+22505112233', template: 'rdv_rappel_j1', status: 'failed', wa_message_id: null, error_message: 'Numéro non enregistré sur WhatsApp Business', created_at: past(3, 8), updated_at: past(3, 8) });
  }

  // ── Org2 — Cabinet Médical Cocody ────────────────────────────────────────────
  // Confirmation + rappel J-1 et 2h — Ahou Diallo (aujourd'hui)
  whatsappLogs.push({ organization_id: org2.id, appointment_id: ot1.id, patient_id: pAhouDiallo.id, to_phone: '+22509080706', template: 'rdv_confirmation', status: 'simulated', wa_message_id: null, error_message: null, created_at: past(2, 17),  updated_at: past(2, 17)  });
  whatsappLogs.push({ organization_id: org2.id, appointment_id: ot1.id, patient_id: pAhouDiallo.id, to_phone: '+22509080706', template: 'rdv_rappel_j1',    status: 'simulated', wa_message_id: null, error_message: null, created_at: past(1, 8),   updated_at: past(1, 8)   });
  whatsappLogs.push({ organization_id: org2.id, appointment_id: ot1.id, patient_id: pAhouDiallo.id, to_phone: '+22509080706', template: 'rdv_rappel_h2',    status: 'simulated', wa_message_id: null, error_message: null, created_at: T(6, 30),     updated_at: T(6, 30)     });

  // Confirmation Fatimata Koné (prénatale aujourd'hui)
  whatsappLogs.push({ organization_id: org2.id, appointment_id: ot3.id, patient_id: pFatimata.id, to_phone: '+22505998877', template: 'rdv_confirmation', status: 'simulated', wa_message_id: null, error_message: null, created_at: past(1, 10), updated_at: past(1, 10) });

  // Rappel 2h Mariétou Sow (in-room actuellement)
  whatsappLogs.push({ organization_id: org2.id, appointment_id: ot2.id, patient_id: pSow.id, to_phone: '+22505445566', template: 'rdv_rappel_h2', status: 'simulated', wa_message_id: null, error_message: null, created_at: T(7, 30), updated_at: T(7, 30) });

  // Confirmation RDV futur Kouamé Yeboué (+5j)
  whatsappLogs.push({ organization_id: org2.id, appointment_id: of1.id, patient_id: pYeboue.id, to_phone: '+22507223344', template: 'rdv_confirmation', status: 'simulated', wa_message_id: null, error_message: null, created_at: past(3, 16), updated_at: past(3, 16) });

  await knex('whatsapp_logs').insert(whatsappLogs);

  // ══════════════════════════════════════════════════════════════════════════════
  // ⑨ AUDIT LOGS — Org1 + Org2 (historique réaliste des 30 derniers jours)
  // ══════════════════════════════════════════════════════════════════════════════
  const auditLogs = [];

  // ── Org1 — Admin (Koutoua Bamba) ─────────────────────────────────────────────
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'USER_CREATED',         target_type: 'user',         target_id: doctor1.id,   ip_address: '196.168.1.12', details: JSON.stringify({ role: 'doctor', email: 'dr.kone@clinique-plateau.ci' }),       created_at: past(30, 8, 30) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'USER_CREATED',         target_type: 'user',         target_id: doctor2.id,   ip_address: '196.168.1.12', details: JSON.stringify({ role: 'doctor', email: 'dr.traore@clinique-plateau.ci' }),     created_at: past(30, 8, 35) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'USER_CREATED',         target_type: 'user',         target_id: secretary.id, ip_address: '196.168.1.12', details: JSON.stringify({ role: 'secretary', email: 'secretaire@clinique-plateau.ci' }), created_at: past(30, 8, 40) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'STOCK_MOVEMENT_IN',    target_type: 'stock_item',   target_id: null,         ip_address: '196.168.1.12', details: JSON.stringify({ items: ['Metformine 500mg +200', 'Paracétamol 1000mg +300'], reason: 'Commande mensuelle' }), created_at: past(30, 9) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'INVOICE_VALIDATED',    target_type: 'invoice',      target_id: null,         ip_address: '196.168.1.10', details: JSON.stringify({ patient: 'Koffi Yao', amount: 25000, currency: 'XOF', method: 'mtn_money' }), created_at: past(2, 14) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'STOCK_ADJUSTMENT',     target_type: 'stock_item',   target_id: null,         ip_address: '196.168.1.10', details: JSON.stringify({ item: 'Paracétamol 1000mg', delta: -30, reason: 'Correction inventaire physique' }), created_at: past(3, 11) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'GDPR_EXPORT',          target_type: 'patient',      target_id: p2 && p2.id,  ip_address: '196.168.1.10', details: JSON.stringify({ patient: 'Fatou Koné', requestedBy: 'admin@clinique-plateau.ci' }), created_at: past(5, 10) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'RECORD_SHARE_APPROVED',target_type: 'record_share', target_id: null,         ip_address: '196.168.1.10', details: JSON.stringify({ requestingOrg: 'Cabinet Médical Cocody', patient: 'Koffi Yao', status: 'approved' }), created_at: past(7, 14) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'RECORD_SHARE_DENIED',  target_type: 'record_share', target_id: null,         ip_address: '196.168.1.10', details: JSON.stringify({ requestingOrg: 'Cabinet Médical Cocody', patient: 'Ibrahima Bah', reason: 'Patient n\'a pas consenti' }), created_at: past(12, 11) });
  auditLogs.push({ organization_id: org1.id, actor_id: admin1.id, action: 'USER_UPDATED',         target_type: 'user',         target_id: doctor1.id,   ip_address: '196.168.1.10', details: JSON.stringify({ field: 'specialty', old: null, new: 'Médecine générale' }), created_at: past(20, 9) });

  // ── Org1 — Médecins ───────────────────────────────────────────────────────────
  auditLogs.push({ organization_id: org1.id, actor_id: doctor1.id, action: 'PATIENT_CREATED',      target_type: 'patient',      target_id: p3 && p3.id, ip_address: '196.168.1.15', details: JSON.stringify({ name: 'Ibrahima Bah', chronic: 'Diabète type 2' }), created_at: past(30, 9, 5) });
  auditLogs.push({ organization_id: org1.id, actor_id: doctor1.id, action: 'CONSULTATION_CREATED', target_type: 'consultation', target_id: null,         ip_address: '196.168.1.15', details: JSON.stringify({ patient: 'Mariam Touré', diagnosis: 'HTA grade 2' }), created_at: past(14, 9, 30) });
  auditLogs.push({ organization_id: org1.id, actor_id: doctor1.id, action: 'PRESCRIPTION_CREATED', target_type: 'prescription', target_id: null,         ip_address: '196.168.1.15', details: JSON.stringify({ patient: 'Ibrahima Bah', medications: ['Metformine 1000mg', 'Glibenclamide 5mg'] }), created_at: past(7, 9, 30) });
  auditLogs.push({ organization_id: org1.id, actor_id: doctor1.id, action: 'CONSULTATION_CREATED', target_type: 'consultation', target_id: null,         ip_address: '196.168.1.15', details: JSON.stringify({ patient: 'Fatou Koné', diagnosis: 'HTA en amélioration' }), created_at: T(9, 5) });
  auditLogs.push({ organization_id: org1.id, actor_id: doctor2.id, action: 'CONSULTATION_CREATED', target_type: 'consultation', target_id: null,         ip_address: '196.168.1.16', details: JSON.stringify({ patient: 'Koffi Yao', diagnosis: 'HTA grade 2 en amélioration' }), created_at: past(3, 10, 30) });
  auditLogs.push({ organization_id: org1.id, actor_id: doctor2.id, action: 'PRESCRIPTION_CREATED', target_type: 'prescription', target_id: null,         ip_address: '196.168.1.16', details: JSON.stringify({ patient: 'Koffi Yao', medications: ['Losartan 100mg', 'Amlodipine 10mg', 'Metformine 500mg'] }), created_at: past(3, 10, 45) });

  // ── Org1 — Secrétaire ─────────────────────────────────────────────────────────
  auditLogs.push({ organization_id: org1.id, actor_id: secretary.id, action: 'APPOINTMENT_CREATED',  target_type: 'appointment', target_id: null,         ip_address: '196.168.1.20', details: JSON.stringify({ patient: 'Fatou Koné', doctor: 'Dr Koné', time: '08:30' }), created_at: past(1, 17) });
  auditLogs.push({ organization_id: org1.id, actor_id: secretary.id, action: 'APPOINTMENT_CREATED',  target_type: 'appointment', target_id: null,         ip_address: '196.168.1.20', details: JSON.stringify({ patient: 'Ibrahima Bah', doctor: 'Dr Koné', time: '09:00' }), created_at: past(1, 17, 5) });
  auditLogs.push({ organization_id: org1.id, actor_id: secretary.id, action: 'PATIENT_CREATED',      target_type: 'patient',     target_id: p1 && p1.id, ip_address: '196.168.1.20', details: JSON.stringify({ name: 'Karim Meïté', email: 'karim.meite@email.ci' }), created_at: past(30, 9, 2) });
  auditLogs.push({ organization_id: org1.id, actor_id: secretary.id, action: 'INVOICE_COLLECTED',    target_type: 'invoice',     target_id: null,         ip_address: '196.168.1.20', details: JSON.stringify({ patient: 'Koffi Yao', amount: 25000, method: 'mtn_money' }), created_at: past(3, 11) });
  auditLogs.push({ organization_id: org1.id, actor_id: secretary.id, action: 'STOCK_MOVEMENT_OUT',   target_type: 'stock_item',  target_id: null,         ip_address: '196.168.1.20', details: JSON.stringify({ item: 'Gants latex', quantity: 8, reason: 'Utilisation consultations' }), created_at: past(14, 8) });
  auditLogs.push({ organization_id: org1.id, actor_id: secretary.id, action: 'APPOINTMENT_CANCELLED',target_type: 'appointment', target_id: null,         ip_address: '196.168.1.20', details: JSON.stringify({ patient: 'Mariam Touré', reason: 'Patient absent' }), created_at: past(10, 11) });

  // ── Org2 — Admin (Moussa Diallo) ─────────────────────────────────────────────
  auditLogs.push({ organization_id: org2.id, actor_id: admin2.id, action: 'USER_CREATED',          target_type: 'user',         target_id: drBamba.id,   ip_address: '196.168.2.5',  details: JSON.stringify({ role: 'doctor', email: 'dr.bamba@cabinet-cocody.ci', specialty: 'Médecine interne' }), created_at: past(60, 9) });
  auditLogs.push({ organization_id: org2.id, actor_id: admin2.id, action: 'STOCK_MOVEMENT_IN',     target_type: 'stock_item',   target_id: null,         ip_address: '196.168.2.5',  details: JSON.stringify({ items: ['Metformine 850mg +150', 'Amlodipine 10mg +100', 'Gants +15'] }), created_at: past(30, 10) });
  auditLogs.push({ organization_id: org2.id, actor_id: admin2.id, action: 'INVOICE_VALIDATED',     target_type: 'invoice',      target_id: null,         ip_address: '196.168.2.5',  details: JSON.stringify({ patient: 'Ahou Diallo', amount: 10000, method: 'wave' }), created_at: past(21, 10, 5) });
  auditLogs.push({ organization_id: org2.id, actor_id: admin2.id, action: 'INVOICE_VALIDATED',     target_type: 'invoice',      target_id: null,         ip_address: '196.168.2.5',  details: JSON.stringify({ patient: 'Ahou Diallo', amount: 10000, method: 'mtn_money', note: 'Suivi du jour' }), created_at: T(9, 22) });
  auditLogs.push({ organization_id: org2.id, actor_id: admin2.id, action: 'STOCK_MOVEMENT_IN',     target_type: 'stock_item',   target_id: null,         ip_address: '196.168.2.5',  details: JSON.stringify({ item: 'Amlodipine 10mg +50', reason: 'Réapprovisionnement express' }), created_at: past(5, 9) });
  auditLogs.push({ organization_id: org2.id, actor_id: admin2.id, action: 'RECORD_SHARE_REQUESTED',target_type: 'record_share', target_id: null,         ip_address: '196.168.2.5',  details: JSON.stringify({ targetOrg: 'Clinique du Plateau', reason: 'Urgence dossier HTA' }), created_at: past(7, 11) });
  auditLogs.push({ organization_id: org2.id, actor_id: admin2.id, action: 'RECORD_SHARE_REQUESTED',target_type: 'record_share', target_id: null,         ip_address: '196.168.2.5',  details: JSON.stringify({ targetOrg: 'Clinique du Plateau', patient: 'Mariam Touré', reason: 'HTA déséquilibrée' }), created_at: T(10) });
  auditLogs.push({ organization_id: org2.id, actor_id: admin2.id, action: 'STOCK_ADJUSTMENT',      target_type: 'stock_item',   target_id: null,         ip_address: '196.168.2.5',  details: JSON.stringify({ item: 'Gants latex', delta: -4, reason: 'Emballages abîmés' }), created_at: past(2, 10) });

  // ── Org2 — Médecin (Dr Bamba) ─────────────────────────────────────────────────
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'PATIENT_CREATED',      target_type: 'patient',      target_id: pAhouDiallo.id, ip_address: '196.168.2.10', details: JSON.stringify({ name: 'Ahou Diallo' }), created_at: past(45, 9) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'PATIENT_CREATED',      target_type: 'patient',      target_id: pYeboue.id,     ip_address: '196.168.2.10', details: JSON.stringify({ name: 'Kouamé Yeboué', chronic: 'HTA + Obésité' }), created_at: past(45, 9, 5) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'PATIENT_CREATED',      target_type: 'patient',      target_id: pSow.id,        ip_address: '196.168.2.10', details: JSON.stringify({ name: 'Mariétou Sow', chronic: 'Diabète type 2' }), created_at: past(60, 9) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'PATIENT_CREATED',      target_type: 'patient',      target_id: pFatimata.id,   ip_address: '196.168.2.10', details: JSON.stringify({ name: 'Fatimata Koné', suivi: 'Grossesse 28 SA' }), created_at: past(28, 9) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'PATIENT_CREATED',      target_type: 'patient',      target_id: pOuedraogo.id,  ip_address: '196.168.2.10', details: JSON.stringify({ name: 'Lamine Ouédraogo', chronic: 'Arthrose genou' }), created_at: past(10, 9) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'CONSULTATION_CREATED', target_type: 'consultation', target_id: null,           ip_address: '196.168.2.10', details: JSON.stringify({ patient: 'Kouamé Yeboué', diagnosis: 'HTA grade 2 non contrôlée' }), created_at: past(14, 10, 30) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'PRESCRIPTION_CREATED', target_type: 'prescription', target_id: null,           ip_address: '196.168.2.10', details: JSON.stringify({ patient: 'Kouamé Yeboué', medications: ['Amlodipine 10mg', 'Losartan 50mg'] }), created_at: past(14, 11) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'CONSULTATION_CREATED', target_type: 'consultation', target_id: null,           ip_address: '196.168.2.10', details: JSON.stringify({ patient: 'Mariétou Sow', diagnosis: 'Diabète type 2 modéré' }), created_at: past(7, 9, 30) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'CONSULTATION_CREATED', target_type: 'consultation', target_id: null,           ip_address: '196.168.2.10', details: JSON.stringify({ patient: 'Ahou Diallo', diagnosis: 'Anémie ferriprive légère' }), created_at: T(9, 15) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'PRESCRIPTION_CREATED', target_type: 'prescription', target_id: null,           ip_address: '196.168.2.10', details: JSON.stringify({ patient: 'Ahou Diallo', medications: ['Fer 200mg + Acide ascorbique'] }), created_at: T(9, 30) });
  auditLogs.push({ organization_id: org2.id, actor_id: drBamba.id, action: 'APPOINTMENT_CREATED',  target_type: 'appointment',  target_id: null,           ip_address: '196.168.2.10', details: JSON.stringify({ patient: 'Fatimata Koné', reason: 'Grossesse 28 SA — prénatale' }), created_at: past(1, 10) });

  await knex('audit_logs').insert(auditLogs);

  // ── Résumé ────────────────────────────────────────────────────────────────────
  console.log('✅ Seed 003 terminé — données test complètes :');
  console.log(`   • 4 patients org2 : Yeboué, Sow, Ouédraogo, Koné (+ Ahou Diallo existante)`);
  console.log(`   • 11 RDV org2 (4 passés + 4 aujourd'hui + 3 futurs)`);
  console.log(`   • 4 consultations + 4 prescriptions + 5 factures org2`);
  console.log(`   • 6 articles stock + 11 mouvements org2 (2 en alerte stock bas)`);
  console.log(`   • 6 SMS reminders org2 (2 envoyés, 2 pending, 1 échoué, 1 rappel 2h — TOUS avec appointment_id valide)`);
  console.log(`   • 3 formulaires consentement + 8 signatures org2`);
  console.log(`   • 11 notifications org2 + 1 cross-org (partage dossier)`);
  console.log(`   • ${whatsappLogs.length} logs WhatsApp (simulation) org1 + org2`);
  console.log(`   • ${auditLogs.length} entrées audit log org1 + org2 (admin, médecins, secrétaire)`);
};
