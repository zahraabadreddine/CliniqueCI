const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  // ─── Nettoyage dans l'ordre des dépendances FK ───────────────────────────────
  await knex('record_share_requests').del();
  await knex('consent_signatures').del();
  await knex('consent_forms').del();
  await knex('stock_movements').del();
  await knex('stock_items').del();
  await knex('queue_tokens').del();
  await knex('sms_reminders').del();
  await knex('audit_logs').del();
  await knex('push_subscriptions').del();
  await knex('whatsapp_logs').del();
  await knex('refresh_tokens').del();
  await knex('prescriptions').del();
  await knex('invoices').del();
  await knex('consultations').del();
  await knex('notifications').del();
  await knex('appointments').del();
  await knex('patients').del();
  await knex('users').del();
  await knex('organizations').del();

  const hash = await bcrypt.hash('Password123!', 12);

  // ─── Organisations ────────────────────────────────────────────────────────────
  const [org1, org2] = await knex('organizations').insert([
    { name: 'Clinique du Plateau',    address: 'Avenue Terrasson de Fougères, Plateau, Abidjan', phone: '+225 27 20 31 00 00' },
    { name: 'Cabinet Médical Cocody', address: 'Rue des Jardins, Cocody, Abidjan',               phone: '+225 27 22 44 00 00' },
  ]).returning(['id', 'name']);

  // ─── Utilisateurs ─────────────────────────────────────────────────────────────
  const [admin1, doctor1, doctor2, secretary1] = await knex('users').insert([
    { organization_id: org1.id, email: 'admin@clinique-plateau.ci',      password_hash: hash, first_name: 'Koutoua',  last_name: 'Bamba',  role: 'admin',     specialty: null },
    { organization_id: org1.id, email: 'dr.kone@clinique-plateau.ci',    password_hash: hash, first_name: 'Aminata',  last_name: 'Koné',   role: 'doctor',    specialty: 'Médecine générale' },
    { organization_id: org1.id, email: 'dr.traore@clinique-plateau.ci',  password_hash: hash, first_name: 'Ibrahim',  last_name: 'Traoré', role: 'doctor',    specialty: 'Cardiologie' },
    { organization_id: org1.id, email: 'secretaire@clinique-plateau.ci', password_hash: hash, first_name: 'Rana',     last_name: 'Touré',  role: 'secretary', specialty: null },
  ]).returning(['id', 'email', 'role']);

  const [patientUser1] = await knex('users').insert([
    { organization_id: org1.id, email: 'karim.meite@email.ci', password_hash: hash, first_name: 'Karim', last_name: 'Meïté', role: 'patient' },
  ]).returning(['id', 'email', 'role']);

  await knex('users').insert([
    { organization_id: org2.id, email: 'admin@cabinet-cocody.ci',   password_hash: hash, first_name: 'Moussa', last_name: 'Diallo', role: 'admin'  },
    { organization_id: org2.id, email: 'dr.bamba@cabinet-cocody.ci', password_hash: hash, first_name: 'Aïcha',  last_name: 'Bamba',  role: 'doctor', specialty: 'Médecine interne' },
  ]);

  // ─── Patients — Clinique du Plateau (5 patients) ──────────────────────────────
  const patients = await knex('patients').insert([
    // p1 — Patient avec compte utilisateur
    {
      organization_id: org1.id,
      user_id: patientUser1.id,
      first_name: 'Karim',
      last_name: 'Meïté',
      date_of_birth: '1995-04-10',
      phone: '+225 07 08 09 10 11',
      email: 'karim.meite@email.ci',
      blood_type: 'O+',
      allergies: null,
      chronic_diseases: null,
    },
    // p2 — HTA
    {
      organization_id: org1.id,
      first_name: 'Fatou',
      last_name: 'Koné',
      date_of_birth: '1982-07-22',
      phone: '+225 05 06 07 08 09',
      email: 'fatou.kone@email.ci',
      blood_type: 'A+',
      allergies: 'Pénicilline',
      chronic_diseases: 'Hypertension artérielle',
    },
    // p3 — Diabète type 2
    {
      organization_id: org1.id,
      first_name: 'Ibrahima',
      last_name: 'Bah',
      date_of_birth: '1964-12-03',
      phone: '+225 05 55 44 33 22',
      email: null,
      blood_type: 'A-',
      allergies: 'Aspirine, Ibuprofène',
      chronic_diseases: 'Diabète type 2',
    },
    // p4 — HTA déséquilibrée
    {
      organization_id: org1.id,
      first_name: 'Mariam',
      last_name: 'Touré',
      date_of_birth: '1990-09-18',
      phone: '+225 07 70 11 22 33',
      email: 'mariam.t@email.ci',
      blood_type: 'AB+',
      allergies: null,
      chronic_diseases: 'Hypertension artérielle',
    },
    // p5 — HTA sévère + Diabète
    {
      organization_id: org1.id,
      first_name: 'Koffi',
      last_name: 'Yao',
      date_of_birth: '1955-08-30',
      phone: '+225 05 11 22 33 44',
      email: null,
      blood_type: 'O-',
      allergies: 'Sulfamides',
      chronic_diseases: 'Hypertension artérielle grade 2, Diabète type 2',
    },
  ]).returning(['id']);

  const [p1, p2, p3, p4, p5] = patients;

  // Patient org2
  await knex('patients').insert([
    { organization_id: org2.id, first_name: 'Ahou', last_name: 'Diallo', date_of_birth: '1988-03-15', phone: '+225 09 08 07 06 05', blood_type: 'B+' },
  ]);

  // ─── Helpers date ─────────────────────────────────────────────────────────────
  const today = new Date();
  const T = (h, m = '00') => {
    const d = new Date(today);
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toISOString();
  };
  const past = (daysAgo, h = 9, m = '00') => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, Number(m), 0, 0);
    return d.toISOString();
  };
  const future = (daysAhead, h = 9, m = '00') => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(h, Number(m), 0, 0);
    return d.toISOString();
  };

  // ─── Rendez-vous passés ───────────────────────────────────────────────────────
  const pastAppts = await knex('appointments').insert([
    // -14j — Mariam Touré / Dr Koné (HTA suivi)
    {
      organization_id: org1.id, patient_id: p4.id, doctor_id: doctor1.id,
      scheduled_at: past(14, 9), status: 'completed',
      reason: 'Suivi tension artérielle — contrôle mensuel',
    },
    // -7j — Ibrahima Bah / Dr Koné (diabète)
    {
      organization_id: org1.id, patient_id: p3.id, doctor_id: doctor1.id,
      scheduled_at: past(7, 9), status: 'completed',
      reason: 'Diabète type 2 — ajustement traitement',
    },
    // -3j — Koffi Yao / Dr Traoré (HTA cardiologie)
    {
      organization_id: org1.id, patient_id: p5.id, doctor_id: doctor2.id,
      scheduled_at: past(3, 10), status: 'completed',
      reason: 'Hypertension — bilan trimestriel cardiologique',
    },
  ]).returning(['id']);
  const [pa1, pa2, pa3] = pastAppts;

  // ─── Rendez-vous d'aujourd'hui ────────────────────────────────────────────────
  const todayAppts = await knex('appointments').insert([
    // 08:30 — Fatou Koné / Dr Koné → terminé (consultation faite, facture à encaisser)
    {
      organization_id: org1.id, patient_id: p2.id, doctor_id: doctor1.id,
      scheduled_at: T(8, 30), status: 'completed',
      reason: 'Suivi HTA — contrôle pression artérielle',
    },
    // 09:00 — Ibrahima Bah / Dr Koné → terminé (bilan diabète mensuel)
    {
      organization_id: org1.id, patient_id: p3.id, doctor_id: doctor1.id,
      scheduled_at: T(9, 0), status: 'completed',
      reason: 'Diabète type 2 — bilan mensuel',
    },
    // 09:30 — Mariam Touré / Dr Traoré → en salle de consultation
    {
      organization_id: org1.id, patient_id: p4.id, doctor_id: doctor2.id,
      scheduled_at: T(9, 30), status: 'in-room',
      reason: 'HTA — renouvellement ordonnance',
    },
    // 10:30 — Karim Meïté / Dr Koné → en salle d'attente
    {
      organization_id: org1.id, patient_id: p1.id, doctor_id: doctor1.id,
      scheduled_at: T(10, 30), status: 'waiting',
      reason: 'Consultation générale — fatigue et maux de tête',
    },
    // 14:00 — Koffi Yao / Dr Traoré → confirmé (après-midi)
    {
      organization_id: org1.id, patient_id: p5.id, doctor_id: doctor2.id,
      scheduled_at: T(14, 0), status: 'confirmed',
      reason: 'Suivi cardiologique post-bilan',
    },
  ]).returning(['id']);
  const [ta1, ta2, ta3, ta4, ta5] = todayAppts;

  // ─── Rendez-vous futurs ───────────────────────────────────────────────────────
  await knex('appointments').insert([
    // Demain — Karim Meïté / Dr Koné
    {
      organization_id: org1.id, patient_id: p1.id, doctor_id: doctor1.id,
      scheduled_at: future(1, 9), status: 'confirmed',
      reason: 'Résultats NFS + bilan ferritine',
    },
    // +7j — Ibrahima Bah / Dr Koné
    {
      organization_id: org1.id, patient_id: p3.id, doctor_id: doctor1.id,
      scheduled_at: future(7, 9), status: 'pending',
      reason: 'Diabète — prochain contrôle glycémique',
    },
  ]);

  // ─── Consultations ────────────────────────────────────────────────────────────
  const consultations = await knex('consultations').insert([
    // c1 — Mariam Touré il y a 14j (HTA déséquilibrée)
    {
      organization_id: org1.id,
      appointment_id: pa1.id,
      patient_id: p4.id,
      doctor_id: doctor1.id,
      chief_complaint: 'Tension artérielle élevée depuis quelques jours. Céphalées matinales.',
      examination: 'TA : 158/98 mmHg (bras droit) · TA : 155/96 mmHg (bras gauche) · FC : 86 bpm · Poids : 72 kg\nAuscultation cardiaque : B1-B2 normaux, pas de souffle\nPas d\'œdème des membres inférieurs',
      diagnosis: 'HTA essentielle déséquilibrée grade 2.',
      notes: 'Augmentation Amlodipine de 5mg à 10mg. Rappel régime hyposodé strict (< 5g sel/j). Contrôle dans 2 semaines. Surveillance tensionnelle quotidienne demandée.',
    },
    // c2 — Ibrahima Bah il y a 7j (diabète, ajustement)
    {
      organization_id: org1.id,
      appointment_id: pa2.id,
      patient_id: p3.id,
      doctor_id: doctor1.id,
      chief_complaint: 'Glycémie à jeun élevée cette semaine (1.68 g/L). Fatigue et soif augmentées.',
      examination: 'TA : 132/84 mmHg · FC : 78 bpm · Poids : 86 kg (+1 kg)\nGlycémie capillaire : 1.72 g/L à jeun\nExamen des pieds : sensibilité conservée, pas de lésion\nFond d\'œil : prévu prochain semestre',
      diagnosis: 'Diabète type 2 déséquilibré — HbA1c probablement > 7.5%.',
      notes: 'Augmentation Metformine à 1000mg matin et soir. Ajout Glibenclamide 5mg le matin. Régime hypoglucidique renforcé. Auto-surveillance glycémique quotidienne. HbA1c dans 3 mois.',
    },
    // c3 — Koffi Yao il y a 3j (cardio + HTA sévère)
    {
      organization_id: org1.id,
      appointment_id: pa3.id,
      patient_id: p5.id,
      doctor_id: doctor2.id,
      chief_complaint: 'Bilan trimestriel. Patient asymptomatique. Traitement bien toléré.',
      examination: 'TA : 142/90 mmHg (amélioré vs dernier RDV) · FC : 74 bpm · Poids : 88 kg\nAuscultation cardiaque : bruits réguliers, pas de galop\nÉCG : rythme sinusal, pas de trouble de repolarisation\nÉdèmes cheville légers (grade 1)',
      diagnosis: 'HTA essentielle grade 2 en amélioration. Diabète type 2 sous contrôle satisfaisant.',
      notes: 'Continuer Losartan 100mg + Amlodipine 10mg. Contrôle glycémique : glycémie 1.28 g/L — satisfaisant. Renouvellement ordonnance 3 mois. Bilan lipidique dans 1 mois.',
    },
    // c4 — Fatou Koné aujourd'hui 08:30 (HTA suivi)
    {
      organization_id: org1.id,
      appointment_id: ta1.id,
      patient_id: p2.id,
      doctor_id: doctor1.id,
      chief_complaint: 'Suivi HTA mensuel. Se sent mieux depuis augmentation traitement.',
      examination: 'TA : 135/84 mmHg · FC : 76 bpm · Poids : 71 kg\nAuscultation cardio-pulmonaire : normale\nPas d\'œdème. Bonne tolérance traitement.',
      diagnosis: 'HTA essentielle — équilibre en nette amélioration.',
      notes: 'Continuer Amlodipine 10mg. TA objectif < 130/80 atteint en progression. Prochain contrôle dans 1 mois. Félicitations pour l\'observance.',
    },
    // c5 — Ibrahima Bah aujourd'hui 09:00 (diabète mensuel)
    {
      organization_id: org1.id,
      appointment_id: ta2.id,
      patient_id: p3.id,
      doctor_id: doctor1.id,
      chief_complaint: 'Bilan mensuel diabète. Glycémie mieux contrôlée depuis ajustement il y a 7 jours.',
      examination: 'TA : 128/82 mmHg · FC : 76 bpm · Poids : 85 kg (-1 kg)\nGlycémie capillaire : 1.38 g/L à jeun (nette amélioration)\nPieds : état satisfaisant, pouls pédieux présents',
      diagnosis: 'Diabète type 2 en voie d\'équilibrage. Bonne réponse au nouveau traitement.',
      notes: 'HbA1c demandée — résultats dans 1 semaine. Continuer Metformine 1000mg x2 + Glibenclamide 5mg. Encourager activité physique 30 min/j. Revu dans 1 mois.',
    },
  ]).returning(['id']);
  const [c1, c2, c3, c4, c5] = consultations;

  // ─── Prescriptions ────────────────────────────────────────────────────────────
  await knex('prescriptions').insert([
    // rx1 — Mariam Touré (HTA, c1, -14j)
    {
      organization_id: org1.id,
      consultation_id: c1.id,
      patient_id: p4.id,
      doctor_id: doctor1.id,
      medications: JSON.stringify([
        {
          name: 'Amlodipine 10mg',
          dosage: '1 comprimé par jour',
          duration: '30 jours',
          instructions: 'Le matin, de préférence à la même heure',
        },
        {
          name: 'Ramipril 5mg',
          dosage: '1 comprimé par jour',
          duration: '30 jours',
          instructions: 'Le matin, avec un grand verre d\'eau',
        },
      ]),
      notes: 'Régime hyposodé strict (< 5g sel/j). Automesure tensionnelle matin et soir. Contrôle tensionnel dans 14 jours.',
    },
    // rx2 — Ibrahima Bah (diabète, c2, -7j)
    {
      organization_id: org1.id,
      consultation_id: c2.id,
      patient_id: p3.id,
      doctor_id: doctor1.id,
      medications: JSON.stringify([
        {
          name: 'Metformine 1000mg',
          dosage: '1 comprimé matin et soir',
          duration: '30 jours',
          instructions: 'Pendant les repas — réduit les effets digestifs',
        },
        {
          name: 'Glibenclamide 5mg',
          dosage: '1 comprimé le matin',
          duration: '30 jours',
          instructions: 'Avant le petit-déjeuner. Attention hypoglycémie.',
        },
      ]),
      notes: 'Auto-surveillance glycémique quotidienne. Objectif glycémie à jeun < 1.26 g/L. Régime hypoglucidique. Éviter alcool.',
    },
    // rx3 — Koffi Yao (HTA sévère + diabète, c3, -3j)
    {
      organization_id: org1.id,
      consultation_id: c3.id,
      patient_id: p5.id,
      doctor_id: doctor2.id,
      medications: JSON.stringify([
        {
          name: 'Losartan 100mg',
          dosage: '1 comprimé par jour',
          duration: '90 jours',
          instructions: 'Le matin, avec ou sans nourriture',
        },
        {
          name: 'Amlodipine 10mg',
          dosage: '1 comprimé par jour',
          duration: '90 jours',
          instructions: 'Le matin — peut causer œdèmes chevilles (signaler si aggravation)',
        },
        {
          name: 'Metformine 500mg',
          dosage: '1 comprimé matin et soir',
          duration: '90 jours',
          instructions: 'Pendant les repas',
        },
      ]),
      notes: 'Ordonnance 3 mois. Bilan lipidique + créatinine + ionogramme dans 1 mois. Régime hyposodé et hypoglucidique. Activité physique adaptée à l\'âge.',
    },
    // rx4 — Ibrahima Bah (suivi aujourd'hui, c5)
    {
      organization_id: org1.id,
      consultation_id: c5.id,
      patient_id: p3.id,
      doctor_id: doctor1.id,
      medications: JSON.stringify([
        {
          name: 'Metformine 1000mg',
          dosage: '1 comprimé matin et soir',
          duration: '30 jours',
          instructions: 'Pendant les repas',
        },
        {
          name: 'Glibenclamide 5mg',
          dosage: '1 comprimé le matin',
          duration: '30 jours',
          instructions: 'Avant le petit-déjeuner',
        },
      ]),
      notes: 'HbA1c prescrite — résultats attendus dans 1 semaine. Continuer auto-surveillance. Prochain RDV dans 1 mois.',
    },
  ]);

  // ─── Factures ─────────────────────────────────────────────────────────────────
  const now = new Date();

  await knex('invoices').insert([
    // -14j — Mariam Touré → PAYÉE (Orange Money)
    {
      organization_id: org1.id,
      patient_id: p4.id,
      consultation_id: c1.id,
      appointment_id: pa1.id,
      amount: 10000,
      currency: 'FCFA',
      status: 'paid',
      payment_method: 'orange_money',
      paid_at: past(14, 10),
      created_at: past(14, 9),
      updated_at: past(14, 10),
    },
    // -7j — Ibrahima Bah → PAYÉE (cash)
    {
      organization_id: org1.id,
      patient_id: p3.id,
      consultation_id: c2.id,
      appointment_id: pa2.id,
      amount: 15000,
      currency: 'FCFA',
      status: 'paid',
      payment_method: 'cash',
      paid_at: past(7, 10),
      created_at: past(7, 9),
      updated_at: past(7, 10),
    },
    // -3j — Koffi Yao → COLLECTÉE (secrétaire a encaissé, admin doit valider)
    // ← Scénario démo du workflow de validation
    {
      organization_id: org1.id,
      patient_id: p5.id,
      consultation_id: c3.id,
      appointment_id: pa3.id,
      amount: 25000,
      currency: 'FCFA',
      status: 'collected',
      payment_method: 'mtn_money',
      collected_by_id: secretary1.id,
      collected_at: past(3, 11),
      paid_at: null,
      created_at: past(3, 10),
      updated_at: past(3, 11),
    },
    // Aujourd'hui 08:30 — Fatou Koné → PAYÉE (Wave)
    {
      organization_id: org1.id,
      patient_id: p2.id,
      consultation_id: c4.id,
      appointment_id: ta1.id,
      amount: 12000,
      currency: 'FCFA',
      status: 'paid',
      payment_method: 'wave',
      paid_at: now,
      created_at: now,
      updated_at: now,
    },
    // Aujourd'hui 09:00 — Ibrahima Bah → EN ATTENTE de règlement
    {
      organization_id: org1.id,
      patient_id: p3.id,
      consultation_id: c5.id,
      appointment_id: ta2.id,
      amount: 15000,
      currency: 'FCFA',
      status: 'pending',
      payment_method: null,
      paid_at: null,
      created_at: now,
      updated_at: now,
    },
  ]);

  // ─── Notifications in-app ─────────────────────────────────────────────────────
  await knex('notifications').insert([

    // ── Aujourd'hui : RDV créés hier soir ──────────────────────────────────────

    // Nouveaux RDV notifiés aux médecins
    { organization_id: org1.id, user_id: doctor1.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',          body: 'Fatou Koné — 08:30, Suivi HTA',                                      link: '/appointments',   is_read: true,  created_at: past(1, 17, 0),  updated_at: past(1, 17, 0)  },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',          body: 'Fatou Koné chez Dr Koné — 08:30',                                    link: '/appointments',   is_read: true,  created_at: past(1, 17, 0),  updated_at: past(1, 17, 0)  },
    { organization_id: org1.id, user_id: doctor1.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',          body: 'Ibrahima Bah — 09:00, Diabète bilan mensuel',                         link: '/appointments',   is_read: true,  created_at: past(1, 17, 5),  updated_at: past(1, 17, 5)  },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',          body: 'Ibrahima Bah chez Dr Koné — 09:00',                                  link: '/appointments',   is_read: true,  created_at: past(1, 17, 5),  updated_at: past(1, 17, 5)  },
    { organization_id: org1.id, user_id: doctor2.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',          body: 'Mariam Touré — 09:30, HTA renouvellement ordonnance',                 link: '/appointments',   is_read: false, created_at: past(1, 17, 10), updated_at: past(1, 17, 10) },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',          body: 'Mariam Touré chez Dr Traoré — 09:30',                                link: '/appointments',   is_read: true,  created_at: past(1, 17, 10), updated_at: past(1, 17, 10) },

    // ── Aujourd'hui matin : arrivées & consultations ────────────────────────────

    // Fatou Koné arrivée → Dr Koné (lu — déjà consultée)
    { organization_id: org1.id, user_id: doctor1.id,    type: 'patient_arrived',       title: 'Patient en salle d\'attente',  body: 'Fatou Koné est arrivée — RDV 08:30',                                  link: '/doctor-home',    is_read: true,  created_at: T(8, 20),       updated_at: T(8, 20)        },
    // Consultation Fatou terminée → secrétaire pour facturation (lu — déjà payée)
    { organization_id: org1.id, user_id: secretary1.id, type: 'appointment_completed', title: 'Consultation terminée',        body: 'Fatou Koné — consultation terminée, 12 000 FCFA reçus',               link: '/invoices',       is_read: true,  created_at: T(9, 5),        updated_at: T(9, 5)         },
    // Paiement Fatou → admin notifié (lu)
    { organization_id: org1.id, user_id: admin1.id,     type: 'invoice_paid',          title: 'Paiement reçu',                body: 'Fatou Koné — 12 000 FCFA via Wave',                                   link: '/invoices',       is_read: true,  created_at: T(9, 8),        updated_at: T(9, 8)         },

    // Ibrahima Bah arrivé → Dr Koné (lu — déjà consulté)
    { organization_id: org1.id, user_id: doctor1.id,    type: 'patient_arrived',       title: 'Patient en salle d\'attente',  body: 'Ibrahima Bah est arrivé — RDV 09:00',                                 link: '/doctor-home',    is_read: true,  created_at: T(8, 55),       updated_at: T(8, 55)        },
    // Consultation Ibrahima terminée → secrétaire (NON LU — facture en attente)
    { organization_id: org1.id, user_id: secretary1.id, type: 'appointment_completed', title: 'Consultation terminée',        body: 'Ibrahima Bah — consultation terminée, paiement en attente',           link: '/invoices',       is_read: false, created_at: T(9, 55),       updated_at: T(9, 55)        },

    // Mariam Touré arrivée → Dr Traoré (NON LU — en consultation actuellement)
    { organization_id: org1.id, user_id: doctor2.id,    type: 'patient_arrived',       title: 'Patient en salle d\'attente',  body: 'Mariam Touré est arrivée — RDV 09:30',                                link: '/doctor-home',    is_read: false, created_at: T(9, 25),       updated_at: T(9, 25)        },

    // Karim Meïté arrivé → Dr Koné (NON LU — en attente)
    { organization_id: org1.id, user_id: doctor1.id,    type: 'patient_arrived',       title: 'Patient en salle d\'attente',  body: 'Karim Meïté est arrivé — RDV 10:30',                                  link: '/doctor-home',    is_read: false, created_at: T(10, 25),      updated_at: T(10, 25)       },

    // ── Facture collectée en attente de validation (admin) ──────────────────────
    { organization_id: org1.id, user_id: admin1.id,     type: 'invoice_collected',     title: 'Facture à valider',            body: 'Koffi Yao — 25 000 FCFA collectés par secrétaire (MTN Money)',        link: '/invoices',       is_read: false, created_at: past(3, 11, 5), updated_at: past(3, 11, 5)  },

    // ── Rappel facturation en attente → secrétaire ──────────────────────────────
    { organization_id: org1.id, user_id: secretary1.id, type: 'system',                title: 'Factures en attente',          body: '1 facture en attente de règlement (Ibrahima Bah)',                     link: '/invoices',       is_read: false, created_at: T(10, 0),       updated_at: T(10, 0)        },

    // ── Bienvenue admin ─────────────────────────────────────────────────────────
    { organization_id: org1.id, user_id: admin1.id,     type: 'system',                title: 'Bienvenue sur CliniqueCI',     body: 'Votre espace Clinique du Plateau est prêt. Bonne journée !',           link: '/dashboard',      is_read: true,  created_at: past(30, 8, 0), updated_at: past(30, 8, 0)  },

    // ── Patient Karim : rappel RDV demain ───────────────────────────────────────
    {
      organization_id: org1.id,
      user_id: patientUser1.id,
      type: 'new_appointment',
      title: 'Rappel rendez-vous',
      body: 'Rappel : vous avez un rendez-vous demain à 09:00 chez Dr Koné (Clinique du Plateau)',
      link: '/my-appointments',
      is_read: false,
      created_at: T(8, 0),
      updated_at: T(8, 0),
    },
  ]);

  console.log('✅ Seed 001 terminé — données démo légères :');
  console.log('   • 2 organisations (Clinique du Plateau + Cabinet Médical Cocody)');
  console.log('   • 7 utilisateurs (admin, 2 médecins, secrétaire, patient — org1 · admin, médecin — org2)');
  console.log('   • 5 patients (Clinique du Plateau) + 1 (Cabinet Cocody)');
  console.log('   • 10 rendez-vous (3 passés + 5 aujourd\'hui + 2 futurs)');
  console.log('   • 5 consultations avec notes médicales complètes');
  console.log('   • 4 prescriptions (Mariam HTA · Ibrahima diabète x2 · Koffi HTA+diabète)');
  console.log('   • 5 factures : 3 payées, 1 collectée (à valider), 1 en attente');
  console.log('   • 18 notifications in-app (workflow complet : arrivée → consultation → facturation)');
  console.log('');
  console.log('🔑 Identifiants démo :');
  console.log('   admin      → admin@clinique-plateau.ci      / Password123!');
  console.log('   médecin 1  → dr.kone@clinique-plateau.ci    / Password123!');
  console.log('   médecin 2  → dr.traore@clinique-plateau.ci  / Password123!');
  console.log('   secrétaire → secretaire@clinique-plateau.ci / Password123!');
  console.log('   patient    → karim.meite@email.ci           / Password123!');
  console.log('   admin org2 → admin@cabinet-cocody.ci        / Password123!');
};
