const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  // ─── Nettoyer dans l'ordre des dépendances FK ────────────────────────────────
  await knex('record_share_requests').del();
  await knex('consent_signatures').del();
  await knex('consent_forms').del();
  await knex('stock_movements').del();
  await knex('stock_items').del();
  await knex('queue_tokens').del();
  await knex('sms_reminders').del();
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
    { name: 'Clinique du Plateau', address: 'Avenue Terrasson de Fougères, Plateau, Abidjan', phone: '+225 27 20 31 00 00' },
    { name: 'Cabinet Médical Cocody', address: 'Rue des Jardins, Cocody, Abidjan', phone: '+225 27 22 44 00 00' },
  ]).returning(['id', 'name']);

  // ─── Utilisateurs ─────────────────────────────────────────────────────────────
  const [admin1, doctor1, doctor2, secretary1] = await knex('users').insert([
    { organization_id: org1.id, email: 'admin@clinique-plateau.ci',      password_hash: hash, first_name: 'Koutoua',   last_name: 'Bamba',    role: 'admin',      specialty: null },
    { organization_id: org1.id, email: 'dr.kone@clinique-plateau.ci',    password_hash: hash, first_name: 'Aminata',   last_name: 'Koné',     role: 'doctor',     specialty: 'Médecine générale' },
    { organization_id: org1.id, email: 'dr.traore@clinique-plateau.ci',  password_hash: hash, first_name: 'Ibrahim',   last_name: 'Traoré',   role: 'doctor',     specialty: 'Cardiologie' },
    { organization_id: org1.id, email: 'secretaire@clinique-plateau.ci', password_hash: hash, first_name: 'Rana',      last_name: 'Touré',    role: 'secretary',  specialty: null },
  ]).returning(['id', 'email', 'role']);

  // Patient utilisateur (compte patient lié)
  const [patientUser1] = await knex('users').insert([
    { organization_id: org1.id, email: 'karim.meite@email.ci', password_hash: hash, first_name: 'Karim', last_name: 'Meïté', role: 'patient' },
  ]).returning(['id', 'email', 'role']);

  // Org 2
  await knex('users').insert([
    { organization_id: org2.id, email: 'admin@cabinet-cocody.ci',  password_hash: hash, first_name: 'Moussa', last_name: 'Diallo', role: 'admin' },
    { organization_id: org2.id, email: 'dr.bamba@cabinet-cocody.ci', password_hash: hash, first_name: 'Aïcha', last_name: 'Bamba', role: 'doctor' },
  ]);

  // ─── Patients — Clinique du Plateau (15 patients) ─────────────────────────────
  const patients = await knex('patients').insert([
    // 1 — Patient avec compte utilisateur
    { organization_id: org1.id, user_id: patientUser1.id, first_name: 'Karim',    last_name: 'Meïté',     date_of_birth: '1995-04-10', phone: '+225 07 08 09 10 11', email: 'karim.meite@email.ci',   blood_type: 'O+',  allergies: null },
    // 2
    { organization_id: org1.id, first_name: 'Fatou',    last_name: 'Koné',      date_of_birth: '1985-07-22', phone: '+225 05 06 07 08 09', email: 'fatou.kone@email.ci',     blood_type: 'A+',  allergies: 'Pénicilline' },
    // 3
    { organization_id: org1.id, first_name: 'Ousmane',  last_name: 'Diallo',    date_of_birth: '1978-02-14', phone: '+225 01 02 03 04 05', email: null,                      blood_type: 'B+',  allergies: null },
    // 4
    { organization_id: org1.id, first_name: 'Mariam',   last_name: 'Touré',     date_of_birth: '1990-09-18', phone: '+225 07 70 11 22 33', email: 'mariam.t@email.ci',       blood_type: 'AB+', allergies: null },
    // 5
    { organization_id: org1.id, first_name: 'Ibrahima', last_name: 'Bah',       date_of_birth: '1965-12-03', phone: '+225 05 55 44 33 22', email: null,                      blood_type: 'A-',  allergies: 'Aspirine, Ibuprofène' },
    // 6
    { organization_id: org1.id, first_name: 'Adjoa',    last_name: 'Asante',    date_of_birth: '1998-06-25', phone: '+225 07 12 34 56 78', email: 'adjoa.a@email.ci',        blood_type: 'O+',  allergies: null },
    // 7
    { organization_id: org1.id, first_name: 'Seydou',   last_name: 'Coulibaly', date_of_birth: '1982-03-07', phone: '+225 05 98 76 54 32', email: null,                      blood_type: 'B-',  allergies: null },
    // 8
    { organization_id: org1.id, first_name: 'Rokia',    last_name: 'Sanogo',    date_of_birth: '1993-11-14', phone: '+225 07 23 45 67 89', email: 'rokia.s@email.ci',        blood_type: 'A+',  allergies: null },
    // 9
    { organization_id: org1.id, first_name: 'Koffi',    last_name: 'Yao',       date_of_birth: '1955-08-30', phone: '+225 05 11 22 33 44', email: null,                      blood_type: 'O-',  allergies: 'Sulfamides' },
    // 10
    { organization_id: org1.id, first_name: 'Amina',    last_name: 'Diabaté',   date_of_birth: '2001-04-19', phone: '+225 07 99 88 77 66', email: 'amina.d@email.ci',        blood_type: 'AB-', allergies: null },
    // 11
    { organization_id: org1.id, first_name: 'Moussa',   last_name: 'Konaté',    date_of_birth: '1970-01-25', phone: '+225 05 33 44 55 66', email: null,                      blood_type: 'A+',  allergies: null },
    // 12
    { organization_id: org1.id, first_name: 'Aïssatou', last_name: 'Barry',     date_of_birth: '1988-07-08', phone: '+225 07 44 55 66 77', email: 'aissatou.b@email.ci',     blood_type: 'O+',  allergies: 'Codéine' },
    // 13
    { organization_id: org1.id, first_name: 'Daouda',   last_name: 'Traoré',    date_of_birth: '1975-05-20', phone: '+225 05 66 77 88 99', email: null,                      blood_type: 'B+',  allergies: null },
    // 14
    { organization_id: org1.id, first_name: 'Nadia',    last_name: 'Ouattara',  date_of_birth: '1996-02-28', phone: '+225 07 55 44 33 22', email: 'nadia.o@email.ci',        blood_type: 'A+',  allergies: null },
    // 15
    { organization_id: org1.id, first_name: 'Salif',    last_name: 'Coulibaly', date_of_birth: '1960-10-12', phone: '+225 05 77 88 99 00', email: null,                      blood_type: 'O+',  allergies: null },
  ]).returning(['id']);

  const [p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14,p15] = patients;

  // Patient org2
  await knex('patients').insert([
    { organization_id: org2.id, first_name: 'Joud', last_name: 'Salloum', date_of_birth: '1992-11-10', phone: '+225 09 08 07 06 05', blood_type: 'B+' },
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

  // ─── Rendez-vous passés (semaines précédentes) ────────────────────────────────
  const pastAppts = await knex('appointments').insert([
    // Il y a 30 jours
    { organization_id: org1.id, patient_id: p5.id,  doctor_id: doctor1.id, scheduled_at: past(30, 9),  status: 'completed', reason: 'Diabète type 2 — suivi mensuel' },
    { organization_id: org1.id, patient_id: p2.id,  doctor_id: doctor1.id, scheduled_at: past(30, 10), status: 'completed', reason: 'Consultation gynécologique' },
    { organization_id: org1.id, patient_id: p9.id,  doctor_id: doctor2.id, scheduled_at: past(30, 11), status: 'completed', reason: 'Hypertension — bilan trimestriel' },
    // Il y a 21 jours
    { organization_id: org1.id, patient_id: p3.id,  doctor_id: doctor2.id, scheduled_at: past(21, 9),  status: 'completed', reason: 'Douleurs lombaires chroniques' },
    { organization_id: org1.id, patient_id: p11.id, doctor_id: doctor1.id, scheduled_at: past(21, 10), status: 'completed', reason: 'Contrôle tension artérielle' },
    { organization_id: org1.id, patient_id: p7.id,  doctor_id: doctor2.id, scheduled_at: past(21, 14), status: 'cancelled', reason: 'Bilan sanguin' },
    // Il y a 14 jours
    { organization_id: org1.id, patient_id: p1.id,  doctor_id: doctor1.id, scheduled_at: past(14, 9),  status: 'completed', reason: 'Consultation générale' },
    { organization_id: org1.id, patient_id: p4.id,  doctor_id: doctor1.id, scheduled_at: past(14, 10), status: 'completed', reason: 'Suivi tension artérielle' },
    { organization_id: org1.id, patient_id: p12.id, doctor_id: doctor2.id, scheduled_at: past(14, 11), status: 'completed', reason: 'Douleurs abdominales — bilan' },
    { organization_id: org1.id, patient_id: p6.id,  doctor_id: doctor2.id, scheduled_at: past(14, 14), status: 'completed', reason: 'Fièvre persistante' },
    // Il y a 7 jours
    { organization_id: org1.id, patient_id: p5.id,  doctor_id: doctor1.id, scheduled_at: past(7, 9),   status: 'completed', reason: 'Diabète — ajustement traitement' },
    { organization_id: org1.id, patient_id: p13.id, doctor_id: doctor2.id, scheduled_at: past(7, 10),  status: 'completed', reason: 'Renouvellement ordonnance HTA' },
    { organization_id: org1.id, patient_id: p8.id,  doctor_id: doctor1.id, scheduled_at: past(7, 11),  status: 'completed', reason: 'Suivi grossesse — 6ème mois' },
    { organization_id: org1.id, patient_id: p10.id, doctor_id: doctor2.id, scheduled_at: past(7, 14),  status: 'completed', reason: 'Consultation générale' },
    // Il y a 3 jours
    { organization_id: org1.id, patient_id: p14.id, doctor_id: doctor1.id, scheduled_at: past(3, 9),   status: 'completed', reason: 'Bilan de santé annuel' },
    { organization_id: org1.id, patient_id: p9.id,  doctor_id: doctor2.id, scheduled_at: past(3, 10),  status: 'completed', reason: 'Hypertension — contrôle' },
    { organization_id: org1.id, patient_id: p3.id,  doctor_id: doctor1.id, scheduled_at: past(3, 14),  status: 'cancelled', reason: 'Douleurs thoraciques' },
  ]).returning(['id']);

  const [
    pa1,pa2,pa3,        // -30j
    pa4,pa5,pa6,        // -21j
    pa7,pa8,pa9,pa10,   // -14j
    pa11,pa12,pa13,pa14,// -7j
    pa15,pa16,pa17,     // -3j
  ] = pastAppts;

  // ─── Rendez-vous d'aujourd'hui ────────────────────────────────────────────────
  const todayAppts = await knex('appointments').insert([
    { organization_id: org1.id, patient_id: p2.id,  doctor_id: doctor1.id, scheduled_at: T(8,30),  status: 'completed', reason: 'Suivi post-opératoire' },
    { organization_id: org1.id, patient_id: p5.id,  doctor_id: doctor1.id, scheduled_at: T(9,0),   status: 'completed', reason: 'Diabète type 2 — bilan mensuel' },
    { organization_id: org1.id, patient_id: p4.id,  doctor_id: doctor2.id, scheduled_at: T(9,0),   status: 'in-room',   reason: 'Tension artérielle — contrôle' },
    { organization_id: org1.id, patient_id: p11.id, doctor_id: doctor1.id, scheduled_at: T(10,0),  status: 'waiting',   reason: 'Consultation générale' },
    { organization_id: org1.id, patient_id: p13.id, doctor_id: doctor2.id, scheduled_at: T(10,30), status: 'confirmed', reason: 'HTA — renouvellement ordonnance' },
    { organization_id: org1.id, patient_id: p1.id,  doctor_id: doctor1.id, scheduled_at: T(11,0),  status: 'confirmed', reason: 'Consultation générale' },
    { organization_id: org1.id, patient_id: p6.id,  doctor_id: doctor2.id, scheduled_at: T(11,30), status: 'pending',   reason: 'Résultats analyses sanguines' },
    { organization_id: org1.id, patient_id: p8.id,  doctor_id: doctor1.id, scheduled_at: T(14,0),  status: 'pending',   reason: 'Suivi grossesse — 7ème mois' },
    { organization_id: org1.id, patient_id: p15.id, doctor_id: doctor2.id, scheduled_at: T(14,30), status: 'pending',   reason: 'Douleurs articulaires' },
    { organization_id: org1.id, patient_id: p3.id,  doctor_id: doctor1.id, scheduled_at: T(15,0),  status: 'pending',   reason: 'Bilan de santé' },
    { organization_id: org1.id, patient_id: p9.id,  doctor_id: doctor2.id, scheduled_at: T(15,30), status: 'pending',   reason: 'Hypertension — suivi' },
  ]).returning(['id']);

  const [ta1,ta2,ta3,ta4,ta5,ta6,ta7,ta8,ta9,ta10,ta11] = todayAppts;

  // ─── Rendez-vous futurs (prochaines semaines) ─────────────────────────────────
  await knex('appointments').insert([
    { organization_id: org1.id, patient_id: p7.id,  doctor_id: doctor1.id, scheduled_at: future(1, 9),   status: 'confirmed', reason: 'Bilan sanguin complet' },
    { organization_id: org1.id, patient_id: p10.id, doctor_id: doctor2.id, scheduled_at: future(1, 10),  status: 'confirmed', reason: 'Consultation générale' },
    { organization_id: org1.id, patient_id: p14.id, doctor_id: doctor1.id, scheduled_at: future(1, 14),  status: 'pending',   reason: 'Contrôle post-traitement' },
    { organization_id: org1.id, patient_id: p12.id, doctor_id: doctor2.id, scheduled_at: future(2, 9),   status: 'confirmed', reason: 'Suivi douleurs abdominales' },
    { organization_id: org1.id, patient_id: p1.id,  doctor_id: doctor1.id, scheduled_at: future(2, 10),  status: 'pending',   reason: 'Renouvellement ordonnance' },
    { organization_id: org1.id, patient_id: p5.id,  doctor_id: doctor1.id, scheduled_at: future(7, 9),   status: 'confirmed', reason: 'Diabète — prochain contrôle' },
    { organization_id: org1.id, patient_id: p4.id,  doctor_id: doctor2.id, scheduled_at: future(7, 10),  status: 'pending',   reason: 'HTA — bilan trimestriel' },
    { organization_id: org1.id, patient_id: p8.id,  doctor_id: doctor1.id, scheduled_at: future(14, 9),  status: 'confirmed', reason: 'Suivi grossesse — 8ème mois' },
    { organization_id: org1.id, patient_id: p9.id,  doctor_id: doctor2.id, scheduled_at: future(14, 10), status: 'pending',   reason: 'Hypertension — contrôle' },
    { organization_id: org1.id, patient_id: p2.id,  doctor_id: doctor1.id, scheduled_at: future(21, 9),  status: 'pending',   reason: 'Suivi semestriel' },
  ]);

  // ─── Consultations (pour les RDV terminés) ────────────────────────────────────
  const consultations = await knex('consultations').insert([
    // -30j
    {
      organization_id: org1.id, appointment_id: pa1.id, patient_id: p5.id, doctor_id: doctor1.id,
      chief_complaint: 'Diabète type 2 — suivi mensuel. Patient se plaint de fatigue matinale.',
      examination: 'TA : 130/85 mmHg · FC : 78 bpm · Poids : 82 kg · IMC : 27.3\nExamen général : état général conservé, pas d\'œdème\nExamen des pieds : sensibilité conservée',
      diagnosis: 'Diabète type 2 stabilisé. HbA1c dans les objectifs.',
      notes: 'Glycémie à jeun : 1.18 g/L. Continuer traitement actuel. Revu dans 1 mois.'
    },
    {
      organization_id: org1.id, appointment_id: pa2.id, patient_id: p2.id, doctor_id: doctor1.id,
      chief_complaint: 'Consultation de contrôle gynécologique annuelle.',
      examination: 'TA : 118/72 mmHg · FC : 72 bpm · Poids : 64 kg\nExamen gynécologique normal. Pas d\'anomalie.',
      diagnosis: 'Examen gynécologique de contrôle — RAS.',
      notes: 'Frottis cervico-vaginal réalisé. Résultats dans 2 semaines. Mammographie recommandée.'
    },
    {
      organization_id: org1.id, appointment_id: pa3.id, patient_id: p9.id, doctor_id: doctor2.id,
      chief_complaint: 'Hypertension — bilan trimestriel. Patient asymptomatique.',
      examination: 'TA : 148/92 mmHg (bras droit) · FC : 82 bpm · Poids : 91 kg\nAuscultation cardiaque : bruits normaux, pas de souffle',
      diagnosis: 'Hypertension artérielle essentielle grade 2, insuffisamment contrôlée.',
      notes: 'Adapter le traitement. Ajout Amlodipine 5mg. Régime hyposodé renforcé.'
    },
    // -21j
    {
      organization_id: org1.id, appointment_id: pa4.id, patient_id: p3.id, doctor_id: doctor2.id,
      chief_complaint: 'Douleurs lombaires depuis 3 semaines, irradiant vers la fesse droite.',
      examination: 'TA : 125/80 mmHg · FC : 74 bpm\nExamen rachidien : contracture paravertébrale L4-L5, signe de Lasègue à 50° à droite',
      diagnosis: 'Lombo-sciatique droite L5 sur probable hernie discale.',
      notes: 'Prescription AINS + myorelaxant. Radiographie du rachis lombaire. Kiné à prévoir si pas d\'amélioration.'
    },
    {
      organization_id: org1.id, appointment_id: pa5.id, patient_id: p11.id, doctor_id: doctor1.id,
      chief_complaint: 'Contrôle tension artérielle. Patient sous traitement depuis 6 mois.',
      examination: 'TA : 135/85 mmHg · FC : 76 bpm · Poids : 78 kg',
      diagnosis: 'HTA contrôlée sous traitement.',
      notes: 'Bonne observance thérapeutique. Continuer Ramipril 5mg. Revu dans 3 mois.'
    },
    // -14j
    {
      organization_id: org1.id, appointment_id: pa7.id, patient_id: p1.id, doctor_id: doctor1.id,
      chief_complaint: 'Consultation générale. Fatigue depuis 2 semaines, maux de tête.',
      examination: 'TA : 120/75 mmHg · FC : 80 bpm · Temp : 37.2°C · Poids : 72 kg\nExamen ORL : tympans normaux. Pas de congestion nasale.',
      diagnosis: 'Syndrome asthénique — probablement carence en fer.',
      notes: 'NFS prescrite. Supplément en fer + vitamines. Revu dans 3 semaines avec résultats.'
    },
    {
      organization_id: org1.id, appointment_id: pa8.id, patient_id: p4.id, doctor_id: doctor1.id,
      chief_complaint: 'Suivi tension artérielle. Légère augmentation ces derniers jours.',
      examination: 'TA : 155/95 mmHg · FC : 88 bpm · Poids : 76 kg\nExamen cardio : tachycardie sinusale légère',
      diagnosis: 'HTA déséquilibrée — possible stress professionnel.',
      notes: 'Augmentation Amlodipine à 10mg. Conseils hygiène de vie. Contrôle dans 2 semaines.'
    },
    {
      organization_id: org1.id, appointment_id: pa9.id, patient_id: p12.id, doctor_id: doctor2.id,
      chief_complaint: 'Douleurs abdominales périombilicales depuis 4 jours. Nausées.',
      examination: 'TA : 122/78 mmHg · FC : 84 bpm · Temp : 37.8°C\nAbdomen : douleur épigastrique à la palpation, pas de défense',
      diagnosis: 'Gastrite aiguë probable. Pas d\'urgence chirurgicale.',
      notes: 'Inhibiteur de pompe à protons. Antispasmodique. Régime sans épices 1 semaine. Échographie abdominale si persistance.'
    },
    {
      organization_id: org1.id, appointment_id: pa10.id, patient_id: p6.id, doctor_id: doctor2.id,
      chief_complaint: 'Fièvre à 38.9°C depuis 3 jours, frissons, céphalées.',
      examination: 'TA : 110/70 mmHg · FC : 96 bpm · Temp : 38.9°C · Poids : 58 kg\nExamen général : pas de raideur méningée. Gorge légèrement érythémateuse.',
      diagnosis: 'Syndrome grippal. Paludisme exclu (TDR négatif).',
      notes: 'Paracétamol + hydratation. Test paludisme négatif. Antibiothérapie si fièvre persiste > 5j.'
    },
    // -7j
    {
      organization_id: org1.id, appointment_id: pa11.id, patient_id: p5.id, doctor_id: doctor1.id,
      chief_complaint: 'Ajustement traitement diabète. Glycémie à jeun élevée la semaine dernière.',
      examination: 'TA : 128/82 mmHg · FC : 76 bpm · Poids : 83 kg (+1 kg)\nPieds : pas de lésion. Pouls pédieux présents.',
      diagnosis: 'Diabète type 2 — déséquilibre glycémique léger.',
      notes: 'Augmentation Metformine 1000mg matin et soir. Rappel règles diététiques. Suivi glycémique quotidien demandé.'
    },
    {
      organization_id: org1.id, appointment_id: pa12.id, patient_id: p13.id, doctor_id: doctor2.id,
      chief_complaint: 'Renouvellement ordonnance HTA. Patient stable.',
      examination: 'TA : 138/88 mmHg · FC : 74 bpm · Poids : 88 kg',
      diagnosis: 'HTA essentielle — équilibre satisfaisant.',
      notes: 'Renouvellement Losartan 50mg + Hydrochlorothiazide 12.5mg. Prochain bilan dans 3 mois.'
    },
    {
      organization_id: org1.id, appointment_id: pa13.id, patient_id: p8.id, doctor_id: doctor1.id,
      chief_complaint: 'Suivi grossesse 6ème mois. Pas de complication signalée.',
      examination: 'TA : 115/70 mmHg · FC : 80 bpm · Poids : 72 kg (SA 26)\nHauteur utérine : 26 cm. BCF : 148 bpm. Présentation céphalique.',
      diagnosis: 'Grossesse 26 SA évolutive normale.',
      notes: 'Écho morphologique normale. Prescription fer + folates + vitamines. Prochain RDV SA 30.'
    },
    {
      organization_id: org1.id, appointment_id: pa14.id, patient_id: p10.id, doctor_id: doctor2.id,
      chief_complaint: 'Consultation générale. Toux sèche depuis 10 jours.',
      examination: 'TA : 118/75 mmHg · FC : 78 bpm · Temp : 37.1°C\nAuscultation pulmonaire : murmure vésiculaire présent bilatéralement. Pas de sibilance.',
      diagnosis: 'Trachéite aiguë.',
      notes: 'Antitussif le soir. Aérosol si pas d\'amélioration. Antibiotiques non indiqués à ce stade.'
    },
    // -3j
    {
      organization_id: org1.id, appointment_id: pa15.id, patient_id: p14.id, doctor_id: doctor1.id,
      chief_complaint: 'Bilan de santé annuel. Aucun symptôme.',
      examination: 'TA : 122/78 mmHg · FC : 72 bpm · Poids : 61 kg · Taille : 165 cm · IMC : 22.4\nExamen général complet : RAS. Abdomen souple. Cardio/Pulmo normaux.',
      diagnosis: 'Bilan de santé — aucune anomalie.',
      notes: 'Bilan biologique complet prescrit. Vaccins à jour. Prochain bilan dans 1 an.'
    },
    {
      organization_id: org1.id, appointment_id: pa16.id, patient_id: p9.id, doctor_id: doctor2.id,
      chief_complaint: 'Hypertension — contrôle après ajustement traitement.',
      examination: 'TA : 138/86 mmHg · FC : 78 bpm · Poids : 90 kg',
      diagnosis: 'HTA en amélioration sous traitement adapté.',
      notes: 'Bonne réponse au nouveau traitement. Continuer Amlodipine 10mg + Losartan 100mg.'
    },
    // Aujourd\'hui — terminés
    {
      organization_id: org1.id, appointment_id: ta1.id, patient_id: p2.id, doctor_id: doctor1.id,
      chief_complaint: 'Suivi post-opératoire appendicectomie (J+14).',
      examination: 'TA : 119/73 mmHg · FC : 70 bpm · Temp : 36.8°C\nCicatrice abdominale propre, pas de signe d\'infection. Douleur résiduelle minime.',
      diagnosis: 'Suites opératoires simples.',
      notes: 'Arrêt antibiotiques. Reprise activité progressive. Revu si douleur ou fièvre.'
    },
    {
      organization_id: org1.id, appointment_id: ta2.id, patient_id: p5.id, doctor_id: doctor1.id,
      chief_complaint: 'Diabète type 2 — bilan mensuel. Fatigue modérée.',
      examination: 'TA : 126/80 mmHg · FC : 74 bpm · Poids : 83 kg\nGlycémie capillaire : 1.42 g/L. Pieds : état satisfaisant.',
      diagnosis: 'Diabète type 2 partiellement contrôlé.',
      notes: 'HbA1c demandée. Ajustement régime alimentaire. Continuer Metformine 1000mg x2.'
    },
  ]).returning(['id']);

  const [c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14,c15,c16,c17] = consultations;

  // ─── Prescriptions ────────────────────────────────────────────────────────────
  await knex('prescriptions').insert([
    // Diabète - Ibrahima Bah
    {
      organization_id: org1.id, consultation_id: c1.id, patient_id: p5.id, doctor_id: doctor1.id,
      medications: JSON.stringify([
        { name: 'Metformine 500mg', dosage: '1 comprimé matin et soir', duration: '30 jours', instructions: 'À prendre au cours des repas' },
        { name: 'Glibenclamide 5mg', dosage: '1 comprimé le matin', duration: '30 jours', instructions: 'Avant le petit-déjeuner' },
      ]),
      notes: 'Contrôle glycémique mensuel. Régime diabétique strict. Éviter alcool et sucres rapides.'
    },
    // HTA - Koffi Yao
    {
      organization_id: org1.id, consultation_id: c3.id, patient_id: p9.id, doctor_id: doctor2.id,
      medications: JSON.stringify([
        { name: 'Amlodipine 5mg', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Le matin, de préférence à la même heure' },
        { name: 'Ramipril 5mg', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Le matin' },
      ]),
      notes: 'Régime hyposodé (sel < 5g/j). Activité physique modérée 30 min/jour. Automesure tensionnelle.'
    },
    // Lombalgie - Ousmane Diallo
    {
      organization_id: org1.id, consultation_id: c4.id, patient_id: p3.id, doctor_id: doctor2.id,
      medications: JSON.stringify([
        { name: 'Ibuprofène 400mg', dosage: '1 comprimé 3 fois par jour', duration: '7 jours', instructions: 'Pendant les repas. Contre-indiqué estomac vide' },
        { name: 'Myorelaxant (Méthocarbamol 750mg)', dosage: '1 comprimé matin et soir', duration: '7 jours', instructions: 'Peut causer somnolence — ne pas conduire' },
      ]),
      notes: 'Repos relatif 48h. Position antalgique. Radiographie rachis lombaire face+profil.'
    },
    // Syndrome asthénique - Karim Meïté
    {
      organization_id: org1.id, consultation_id: c6.id, patient_id: p1.id, doctor_id: doctor1.id,
      medications: JSON.stringify([
        { name: 'Fer (sulfate ferreux 80mg)', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'À jeun ou avec jus de citron pour améliorer absorption' },
        { name: 'Vitamine C 500mg', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'En même temps que le fer' },
        { name: 'Complexe multivitaminé', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Au petit-déjeuner' },
      ]),
      notes: 'NFS de contrôle dans 3 semaines. Augmenter consommation viande rouge, légumineuses.'
    },
    // HTA déséquilibrée - Mariam Touré
    {
      organization_id: org1.id, consultation_id: c7.id, patient_id: p4.id, doctor_id: doctor1.id,
      medications: JSON.stringify([
        { name: 'Amlodipine 10mg', dosage: '1 comprimé par jour', duration: '14 jours', instructions: 'Le matin' },
      ]),
      notes: 'Contrôle tensionnel dans 2 semaines. Réduire sel, caféine, stress. 7h de sommeil minimum.'
    },
    // Gastrite - Aïssatou Barry
    {
      organization_id: org1.id, consultation_id: c8.id, patient_id: p12.id, doctor_id: doctor2.id,
      medications: JSON.stringify([
        { name: 'Oméprazole 20mg', dosage: '1 gélule le matin à jeun', duration: '14 jours', instructions: '30 min avant le petit-déjeuner' },
        { name: 'Spasfon (Phloroglucinol 80mg)', dosage: '2 comprimés 3 fois par jour', duration: '5 jours', instructions: 'En cas de douleurs spastiques' },
      ]),
      notes: 'Repas fractionnés. Éviter épices, alcool, café. Consultation si douleur persiste > 1 semaine.'
    },
    // Syndrome grippal - Adjoa Asante
    {
      organization_id: org1.id, consultation_id: c9.id, patient_id: p6.id, doctor_id: doctor2.id,
      medications: JSON.stringify([
        { name: 'Paracétamol 1000mg', dosage: '1 comprimé toutes les 8h si fièvre > 38.5°C', duration: '5 jours', instructions: 'Respecter l\'intervalle de 6h minimum entre prises' },
        { name: 'Vitamine C 500mg + Zinc', dosage: '1 sachet par jour', duration: '7 jours', instructions: 'À diluer dans un verre d\'eau' },
      ]),
      notes: 'Hydratation abondante (2L/jour). Repos. Retour si fièvre > 5 jours ou aggravation.'
    },
    // Diabète ajustement - Ibrahima Bah
    {
      organization_id: org1.id, consultation_id: c10.id, patient_id: p5.id, doctor_id: doctor1.id,
      medications: JSON.stringify([
        { name: 'Metformine 1000mg', dosage: '1 comprimé matin et soir', duration: '30 jours', instructions: 'Pendant les repas' },
        { name: 'Glibenclamide 5mg', dosage: '1 comprimé le matin', duration: '30 jours', instructions: 'Avant le petit-déjeuner' },
        { name: 'Aspirine cardio 100mg', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Le soir au dîner' },
      ]),
      notes: 'Auto-surveillance glycémique quotidienne. Objectif glycémie à jeun < 1.26 g/L.'
    },
    // HTA renouvellement - Daouda Traoré
    {
      organization_id: org1.id, consultation_id: c11.id, patient_id: p13.id, doctor_id: doctor2.id,
      medications: JSON.stringify([
        { name: 'Losartan 50mg', dosage: '1 comprimé par jour', duration: '90 jours', instructions: 'Le matin, avec ou sans nourriture' },
        { name: 'Hydrochlorothiazide 12.5mg', dosage: '1 comprimé par jour', duration: '90 jours', instructions: 'Le matin — peut augmenter la miction' },
      ]),
      notes: 'Bilan rénal et ionogramme dans 3 mois. Régime pauvre en sel.'
    },
    // Grossesse - Rokia Sanogo
    {
      organization_id: org1.id, consultation_id: c12.id, patient_id: p8.id, doctor_id: doctor1.id,
      medications: JSON.stringify([
        { name: 'Sulfate ferreux 80mg', dosage: '1 comprimé matin et soir', duration: '30 jours', instructions: 'Entre les repas' },
        { name: 'Acide folique 5mg', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Le matin' },
        { name: 'Vitamine D3 1000 UI', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Au repas' },
        { name: 'Calcium 500mg', dosage: '1 comprimé par jour', duration: '30 jours', instructions: 'Le soir' },
      ]),
      notes: 'Prochaine écho à SA 32. Cours de préparation à l\'accouchement recommandés. Urgences si contractions ou saignements.'
    },
    // Bilan annuel - Nadia Ouattara
    {
      organization_id: org1.id, consultation_id: c14.id, patient_id: p14.id, doctor_id: doctor1.id,
      medications: JSON.stringify([
        { name: 'Vitamine D3 800 UI', dosage: '1 comprimé par jour', duration: '90 jours', instructions: 'Au repas du midi' },
      ]),
      notes: 'Bilan biologique : NFS, glycémie, bilan lipidique, fonction rénale, TSH. À réaliser à jeun.'
    },
  ]);

  // ─── Factures ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = (d) => d >= new Date(now.getFullYear(), now.getMonth(), 1);

  // Factures payées (mois en cours et précédents)
  await knex('invoices').insert([
    // -30j (mois dernier ou ce mois selon la date)
    { organization_id: org1.id, patient_id: p5.id,  consultation_id: c1.id,  appointment_id: pa1.id, amount: 15000, currency: 'FCFA', status: 'paid', payment_method: 'cash',          paid_at: past(30, 10), created_at: past(30, 10), updated_at: past(30, 10) },
    { organization_id: org1.id, patient_id: p2.id,  consultation_id: c2.id,  appointment_id: pa2.id, amount: 20000, currency: 'FCFA', status: 'paid', payment_method: 'orange_money',  paid_at: past(30, 11), created_at: past(30, 10), updated_at: past(30, 11) },
    { organization_id: org1.id, patient_id: p9.id,  consultation_id: c3.id,  appointment_id: pa3.id, amount: 12000, currency: 'FCFA', status: 'paid', payment_method: 'cash',          paid_at: past(30, 12), created_at: past(30, 11), updated_at: past(30, 12) },
    // -21j
    { organization_id: org1.id, patient_id: p3.id,  consultation_id: c4.id,  appointment_id: pa4.id, amount: 18000, currency: 'FCFA', status: 'paid', payment_method: 'mtn_money',     paid_at: past(21, 10), created_at: past(21, 9),  updated_at: past(21, 10) },
    { organization_id: org1.id, patient_id: p11.id, consultation_id: c5.id,  appointment_id: pa5.id, amount: 10000, currency: 'FCFA', status: 'paid', payment_method: 'cash',          paid_at: past(21, 11), created_at: past(21, 10), updated_at: past(21, 11) },
    // -14j
    { organization_id: org1.id, patient_id: p1.id,  consultation_id: c6.id,  appointment_id: pa7.id, amount: 12000, currency: 'FCFA', status: 'paid', payment_method: 'orange_money',  paid_at: past(14, 10), created_at: past(14, 9),  updated_at: past(14, 10) },
    { organization_id: org1.id, patient_id: p4.id,  consultation_id: c7.id,  appointment_id: pa8.id, amount: 10000, currency: 'FCFA', status: 'paid', payment_method: 'cash',          paid_at: past(14, 11), created_at: past(14, 10), updated_at: past(14, 11) },
    { organization_id: org1.id, patient_id: p12.id, consultation_id: c8.id,  appointment_id: pa9.id, amount: 15000, currency: 'FCFA', status: 'paid', payment_method: 'wave',          paid_at: past(14, 15), created_at: past(14, 11), updated_at: past(14, 15) },
    { organization_id: org1.id, patient_id: p6.id,  consultation_id: c9.id,  appointment_id: pa10.id,amount: 10000, currency: 'FCFA', status: 'paid', payment_method: 'cash',          paid_at: past(14, 15), created_at: past(14, 14), updated_at: past(14, 15) },
    // -7j
    { organization_id: org1.id, patient_id: p5.id,  consultation_id: c10.id, appointment_id: pa11.id,amount: 15000, currency: 'FCFA', status: 'paid', payment_method: 'cash',          paid_at: past(7, 10),  created_at: past(7, 9),  updated_at: past(7, 10) },
    { organization_id: org1.id, patient_id: p13.id, consultation_id: c11.id, appointment_id: pa12.id,amount: 8000,  currency: 'FCFA', status: 'paid', payment_method: 'orange_money',  paid_at: past(7, 11),  created_at: past(7, 10), updated_at: past(7, 11) },
    { organization_id: org1.id, patient_id: p8.id,  consultation_id: c12.id, appointment_id: pa13.id,amount: 25000, currency: 'FCFA', status: 'paid', payment_method: 'mtn_money',     paid_at: past(7, 12),  created_at: past(7, 11), updated_at: past(7, 12) },
    { organization_id: org1.id, patient_id: p10.id, consultation_id: c13.id, appointment_id: pa14.id,amount: 10000, currency: 'FCFA', status: 'paid', payment_method: 'cash',          paid_at: past(7, 15),  created_at: past(7, 14), updated_at: past(7, 15) },
    // -3j
    { organization_id: org1.id, patient_id: p14.id, consultation_id: c14.id, appointment_id: pa15.id,amount: 30000, currency: 'FCFA', status: 'paid', payment_method: 'wave',           paid_at: past(3, 10),  created_at: past(3, 9),  updated_at: past(3, 10) },
    { organization_id: org1.id, patient_id: p9.id,  consultation_id: c15.id, appointment_id: pa16.id,amount: 10000, currency: 'FCFA', status: 'paid', payment_method: 'cash',          paid_at: past(3, 11),  created_at: past(3, 10), updated_at: past(3, 11) },
    // Aujourd'hui — consultations terminées
    { organization_id: org1.id, patient_id: p2.id,  consultation_id: c16.id, appointment_id: ta1.id,  amount: 12000, currency: 'FCFA', status: 'paid', payment_method: 'orange_money',  paid_at: now,          created_at: now,         updated_at: now },
    { organization_id: org1.id, patient_id: p5.id,  consultation_id: c17.id, appointment_id: ta2.id,  amount: 15000, currency: 'FCFA', status: 'pending', payment_method: null,         paid_at: null,         created_at: now,         updated_at: now },
    // Factures en attente (RDV d'aujourd'hui pas encore terminés)
    { organization_id: org1.id, patient_id: p4.id,  consultation_id: null,   appointment_id: ta3.id,  amount: 10000, currency: 'FCFA', status: 'pending', payment_method: null,         paid_at: null,         created_at: now,         updated_at: now },
    { organization_id: org1.id, patient_id: p11.id, consultation_id: null,   appointment_id: ta4.id,  amount: 10000, currency: 'FCFA', status: 'pending', payment_method: null,         paid_at: null,         created_at: now,         updated_at: now },
  ]);

  // ─── Notifications in-app ────────────────────────────────────────────────────
  await knex('notifications').insert([

    // ══ NOUVEAUX RDV — notifiés au médecin + secrétaire ═══════════════════

    // RDV Ibrahima Bah il y a 30j → dr.kone (lu) + secrétaire (lu)
    { organization_id: org1.id, user_id: doctor1.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Ibrahima Bah — 09:00, Diabète type 2 – suivi mensuel',           link: '/appointments', is_read: true,  created_at: past(32, 8, 45), updated_at: past(32, 8, 45) },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Ibrahima Bah chez Dr Koné — 09:00',                               link: '/appointments', is_read: true,  created_at: past(32, 8, 45), updated_at: past(32, 8, 45) },

    // RDV Koffi Yao il y a 30j → dr.traore (lu) + secrétaire (lu)
    { organization_id: org1.id, user_id: doctor2.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Koffi Yao — 11:00, Hypertension – bilan trimestriel',            link: '/appointments', is_read: true,  created_at: past(32, 10, 50), updated_at: past(32, 10, 50) },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Koffi Yao chez Dr Traoré — 11:00',                                link: '/appointments', is_read: true,  created_at: past(32, 10, 50), updated_at: past(32, 10, 50) },

    // RDV Seydou Coulibaly il y a 21j → dr.traore (lu) — sera annulé
    { organization_id: org1.id, user_id: doctor2.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Seydou Coulibaly — 14:00, Bilan sanguin',                         link: '/appointments', is_read: true,  created_at: past(23, 13, 55), updated_at: past(23, 13, 55) },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Seydou Coulibaly chez Dr Traoré — 14:00',                         link: '/appointments', is_read: true,  created_at: past(23, 13, 55), updated_at: past(23, 13, 55) },

    // ══ ANNULATIONS ════════════════════════════════════════════════════════

    // Annulation Seydou Coulibaly il y a 21j → dr.traore (lu) + secrétaire (lu)
    { organization_id: org1.id, user_id: doctor2.id,    type: 'appointment_cancelled', title: 'RDV annulé',                  body: 'Seydou Coulibaly a annulé son RDV du 14:00',                      link: '/appointments', is_read: true,  created_at: past(21, 14, 5),  updated_at: past(21, 14, 5)  },
    { organization_id: org1.id, user_id: secretary1.id, type: 'appointment_cancelled', title: 'RDV annulé',                  body: 'Seydou Coulibaly — RDV 14:00 annulé (Dr Traoré)',                 link: '/appointments', is_read: true,  created_at: past(21, 14, 5),  updated_at: past(21, 14, 5)  },

    // Annulation Ousmane Diallo il y a 3j → dr.traore (lu) + secrétaire (non lu)
    { organization_id: org1.id, user_id: doctor2.id,    type: 'appointment_cancelled', title: 'RDV annulé',                  body: 'Ousmane Diallo a annulé son RDV de 09:00',                        link: '/appointments', is_read: true,  created_at: past(3, 14, 10),  updated_at: past(3, 14, 10)  },
    { organization_id: org1.id, user_id: secretary1.id, type: 'appointment_cancelled', title: 'RDV annulé',                  body: 'Ousmane Diallo — RDV 09:00 annulé (Dr Traoré)',                   link: '/appointments', is_read: false, created_at: past(3, 14, 10),  updated_at: past(3, 14, 10)  },

    // ══ AUJOURD'HUI — RDV créés hier ══════════════════════════════════════

    // Nouveaux RDV de ce matin → médecins + secrétaire (mixte lu/non lu)
    { organization_id: org1.id, user_id: doctor1.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Fatou Koné — 08:30, Consultation gynécologique',                  link: '/appointments', is_read: true,  created_at: past(1, 17, 0),  updated_at: past(1, 17, 0)  },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Fatou Koné chez Dr Koné — 08:30',                                 link: '/appointments', is_read: true,  created_at: past(1, 17, 0),  updated_at: past(1, 17, 0)  },
    { organization_id: org1.id, user_id: doctor1.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Ibrahima Bah — 09:00, Diabète – ajustement traitement',           link: '/appointments', is_read: true,  created_at: past(1, 17, 5),  updated_at: past(1, 17, 5)  },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Ibrahima Bah chez Dr Koné — 09:00',                               link: '/appointments', is_read: true,  created_at: past(1, 17, 5),  updated_at: past(1, 17, 5)  },
    { organization_id: org1.id, user_id: doctor2.id,    type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Adjoa Asante — 11:00, Fièvre persistante',                        link: '/appointments', is_read: false, created_at: past(1, 17, 10), updated_at: past(1, 17, 10) },
    { organization_id: org1.id, user_id: secretary1.id, type: 'new_appointment',       title: 'Nouveau rendez-vous',         body: 'Adjoa Asante chez Dr Traoré — 11:00',                             link: '/appointments', is_read: true,  created_at: past(1, 17, 10), updated_at: past(1, 17, 10) },

    // ══ AUJOURD'HUI — arrivées et consultations en cours ══════════════════

    // Fatou Koné arrivée (waiting) → Dr Koné notifié (lu, déjà appelée)
    { organization_id: org1.id, user_id: doctor1.id,    type: 'patient_arrived',       title: 'Patient en salle d\'attente', body: 'Fatou Koné est arrivée et vous attend (08:30)',                   link: '/doctor-home',  is_read: true,  created_at: T(8, 25),        updated_at: T(8, 25)        },

    // Fatou Koné en salle de consultation → secrétaire notifiée (lu)
    { organization_id: org1.id, user_id: secretary1.id, type: 'patient_in_room',       title: 'Consultation démarrée',       body: 'Fatou Koné est entrée en consultation chez Dr Koné',              link: '/secretary-home', is_read: true, created_at: T(8, 35),        updated_at: T(8, 35)        },

    // Consultation Fatou Koné terminée → secrétaire pour facturation (lu)
    { organization_id: org1.id, user_id: secretary1.id, type: 'appointment_completed', title: 'Consultation terminée',       body: 'Fatou Koné — consultation terminée, facturation à effectuer',    link: '/invoices',     is_read: true,  created_at: T(9, 10),        updated_at: T(9, 10)        },

    // Ibrahima Bah arrivé (waiting) → Dr Koné notifié (lu)
    { organization_id: org1.id, user_id: doctor1.id,    type: 'patient_arrived',       title: 'Patient en salle d\'attente', body: 'Ibrahima Bah est arrivé et vous attend (09:00)',                  link: '/doctor-home',  is_read: true,  created_at: T(8, 55),        updated_at: T(8, 55)        },

    // Ibrahima Bah en salle → secrétaire (lu)
    { organization_id: org1.id, user_id: secretary1.id, type: 'patient_in_room',       title: 'Consultation démarrée',       body: 'Ibrahima Bah est entré en consultation chez Dr Koné',             link: '/secretary-home', is_read: true, created_at: T(9, 15),        updated_at: T(9, 15)        },

    // Consultation Ibrahima Bah terminée → secrétaire (non lu — facture en attente)
    { organization_id: org1.id, user_id: secretary1.id, type: 'appointment_completed', title: 'Consultation terminée',       body: 'Ibrahima Bah — consultation terminée, facturation à effectuer',  link: '/invoices',     is_read: false, created_at: T(9, 55),        updated_at: T(9, 55)        },

    // ══ PAIEMENTS ══════════════════════════════════════════════════════════

    // Paiement Fatou Koné → admin + secrétaire notifiés
    { organization_id: org1.id, user_id: admin1.id,     type: 'invoice_paid',          title: 'Paiement reçu',               body: 'Fatou Koné — 12 000 FCFA reçus par Orange Money',                 link: '/invoices',     is_read: true,  created_at: T(9, 20),        updated_at: T(9, 20)        },
    { organization_id: org1.id, user_id: secretary1.id, type: 'invoice_paid',          title: 'Paiement reçu',               body: 'Fatou Koné — 12 000 FCFA reçus par Orange Money',                 link: '/invoices',     is_read: true,  created_at: T(9, 20),        updated_at: T(9, 20)        },

    // ══ NOTIFICATIONS SYSTÈME ══════════════════════════════════════════════

    // Bienvenue admin (lu)
    { organization_id: org1.id, user_id: admin1.id,     type: 'system',                title: 'Bienvenue sur CliniqueCI',    body: 'Votre espace Clinique du Plateau est prêt. Bonne journée !',      link: '/dashboard',    is_read: true,  created_at: past(7, 8, 0),   updated_at: past(7, 8, 0)   },

    // Rappel facturation en attente → secrétaire (non lu — 3 factures)
    { organization_id: org1.id, user_id: secretary1.id, type: 'system',                title: 'Factures en attente',         body: '3 factures en attente de règlement ce matin',                     link: '/invoices',     is_read: false, created_at: T(8, 0),         updated_at: T(8, 0)         },

    // ══ NOTIFICATIONS PATIENT (Karim Meïté) ═══════════════════════════════

    // Confirmation RDV -14j (lu)
    { organization_id: org1.id, user_id: patientUser1.id, type: 'appointment_confirmed', title: 'RDV confirmé',              body: 'Votre rendez-vous du ' + new Date(new Date().setDate(new Date().getDate() - 14)).toLocaleDateString('fr-FR', {day:'numeric',month:'long'}) + ' à 09:00 est confirmé',  link: '/my-appointments', is_read: true,  created_at: past(16, 9, 0),  updated_at: past(14, 8, 0)  },

    // Rappel RDV aujourd'hui (non lu)
    { organization_id: org1.id, user_id: patientUser1.id, type: 'new_appointment',       title: 'Rappel rendez-vous',        body: 'Vous avez un rendez-vous prévu demain à 14:30 chez Dr Koné',      link: '/my-appointments', is_read: false, created_at: past(1, 8, 0),   updated_at: past(1, 8, 0)   },
  ]);

  console.log('✅ Seed terminé :');
  console.log(`   • 2 organisations`);
  console.log(`   • ${4 + 2} utilisateurs`);
  console.log(`   • 16 patients (15 × Clinique du Plateau, 1 × Cabinet Cocody)`);
  console.log(`   • ${17 + 11 + 10} rendez-vous (passés + aujourd'hui + futurs)`);
  console.log(`   • 17 consultations`);
  console.log(`   • 12 prescriptions`);
  console.log(`   • 19 factures`);
  console.log(`   • 30 notifications in-app (nouveaux RDV, annulations, arrivées, paiements, système — admin/médecins/secrétaire/patient)`);
  console.log(`\n🔑 Identifiants demo :`);
  console.log(`   admin     → admin@clinique-plateau.ci      / Password123!`);
  console.log(`   docteur1  → dr.kone@clinique-plateau.ci    / Password123!`);
  console.log(`   docteur2  → dr.traore@clinique-plateau.ci  / Password123!`);
  console.log(`   secrétaire→ secretaire@clinique-plateau.ci / Password123!`);
  console.log(`   patient   → karim.meite@email.ci           / Password123!`);
};
