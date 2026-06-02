/**
 * Seed 002 — Données démo pour les nouvelles fonctionnalités
 *
 * Ajoute des données réalistes pour :
 *  - QR tokens sur les ordonnances existantes
 *  - Stock médicaments + matériels (avec alertes stock bas)
 *  - Mouvements de stock
 *  - File d'attente digitale (queue tokens) du jour
 *  - Rappels SMS (différents statuts)
 *  - Formulaires de consentement + signatures
 *  - Demandes de partage de dossiers inter-cliniques
 *
 * Compatible avec 5 patients org1 (seed 001 démo allégée).
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async function (knex) {
  // ─── Nettoyer les nouvelles tables (FK order) ────────────────────────────────
  await knex('record_share_requests').del();
  await knex('consent_signatures').del();
  await knex('consent_forms').del();
  await knex('stock_movements').del();
  await knex('stock_items').del();
  await knex('queue_tokens').del();
  await knex('sms_reminders').del();

  // ─── Récupérer les IDs existants ─────────────────────────────────────────────
  const org1 = await knex('organizations').where('name', 'Clinique du Plateau').first();
  const org2 = await knex('organizations').where('name', 'Cabinet Médical Cocody').first();

  const doctor1   = await knex('users').where({ organization_id: org1.id, role: 'doctor', last_name: 'Koné' }).first();
  const doctor2   = await knex('users').where({ organization_id: org1.id, role: 'doctor', last_name: 'Traoré' }).first();
  const admin1    = await knex('users').where({ organization_id: org1.id, role: 'admin' }).first();
  const secretary = await knex('users').where({ organization_id: org1.id, role: 'secretary' }).first();
  const drBamba   = await knex('users').where({ organization_id: org2.id, role: 'doctor' }).first();

  // Patients org1 — 5 patients dans l'ordre d'insertion
  // p1 = Karim Meïté · p2 = Fatou Koné · p3 = Ibrahima Bah · p4 = Mariam Touré · p5 = Koffi Yao
  const patients = await knex('patients').where('organization_id', org1.id).orderBy('created_at', 'asc');
  const [p1, p2, p3, p4, p5] = patients;

  // Rendez-vous d'aujourd'hui
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayAppts = await knex('appointments')
    .where('organization_id', org1.id)
    .whereRaw("DATE(scheduled_at) = ?", [todayStr])
    .orderBy('scheduled_at', 'asc');

  // Helpers dates
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

  // ════════════════════════════════════════════════════════════════════════════
  // 1. QR TOKENS sur les ordonnances existantes
  // ════════════════════════════════════════════════════════════════════════════
  const allPrescriptions = await knex('prescriptions').where('organization_id', org1.id);
  for (const rx of allPrescriptions) {
    if (!rx.qr_token) {
      await knex('prescriptions').where('id', rx.id).update({ qr_token: uuidv4() });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. STOCK — Articles médicaments et matériels
  // ════════════════════════════════════════════════════════════════════════════
  const stockItems = await knex('stock_items').insert([
    // ── Médicaments ──────────────────────────────────────────────────────────
    {
      organization_id: org1.id,
      name: 'Metformine 500mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 8,           // ⚠️ STOCK BAS (min: 20)
      min_quantity: 20,
      unit_price: 50,
      supplier: 'Pharma CI Distribution',
    },
    {
      organization_id: org1.id,
      name: 'Paracétamol 1000mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 240,
      min_quantity: 50,
      unit_price: 30,
      supplier: 'Pharma CI Distribution',
    },
    {
      organization_id: org1.id,
      name: 'Amlodipine 10mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 3,           // ⚠️ STOCK BAS (min: 15)
      min_quantity: 15,
      unit_price: 80,
      supplier: 'MedSupply Abidjan',
    },
    {
      organization_id: org1.id,
      name: 'Losartan 100mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 90,
      min_quantity: 30,
      unit_price: 90,
      supplier: 'MedSupply Abidjan',
    },
    {
      organization_id: org1.id,
      name: 'Glibenclamide 5mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 45,
      min_quantity: 20,
      unit_price: 65,
      supplier: 'Pharma CI Distribution',
    },
    {
      organization_id: org1.id,
      name: 'Ramipril 5mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 60,
      min_quantity: 20,
      unit_price: 75,
      supplier: 'MedSupply Abidjan',
    },
    // ── Consommables ─────────────────────────────────────────────────────────
    {
      organization_id: org1.id,
      name: 'Seringues 5mL (stériles)',
      category: 'materiel',
      unit: 'pièce',
      quantity: 150,
      min_quantity: 50,
      unit_price: 150,
      supplier: 'MedEquip Côte d\'Ivoire',
    },
    {
      organization_id: org1.id,
      name: 'Gants latex (boîte 100)',
      category: 'consommable',
      unit: 'boîte',
      quantity: 4,           // ⚠️ STOCK BAS (min: 10)
      min_quantity: 10,
      unit_price: 4500,
      supplier: 'MedEquip Côte d\'Ivoire',
    },
    {
      organization_id: org1.id,
      name: 'Alcool 70° (500mL)',
      category: 'consommable',
      unit: 'flacon',
      quantity: 2,           // ⚠️ STOCK BAS (min: 8)
      min_quantity: 8,
      unit_price: 1200,
      supplier: 'MedEquip Côte d\'Ivoire',
    },
    {
      organization_id: org1.id,
      name: 'Bandes de gaze (5cm × 5m)',
      category: 'consommable',
      unit: 'rouleau',
      quantity: 40,
      min_quantity: 15,
      unit_price: 800,
      supplier: 'MedEquip Côte d\'Ivoire',
    },
  ]).returning(['id', 'name', 'quantity']);

  const [
    sMetformine, sParacetamol, sAmlodipine, sLosartan,
    sGlibenclamide, sRamipril, sSeringues, sGants,
    sAlcool, sBandes,
  ] = stockItems;

  // ════════════════════════════════════════════════════════════════════════════
  // 3. MOUVEMENTS DE STOCK (historique réaliste)
  // ════════════════════════════════════════════════════════════════════════════
  await knex('stock_movements').insert([
    // ── Entrées (approvisionnement) il y a 30j ────────────────────────────────
    { organization_id: org1.id, stock_item_id: sMetformine.id,    actor_id: admin1.id,     type: 'in',         quantity: 200, reason: 'Commande mensuelle — livraison Pharma CI',         created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sParacetamol.id,   actor_id: admin1.id,     type: 'in',         quantity: 300, reason: 'Commande mensuelle paracétamol',                   created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sAmlodipine.id,    actor_id: admin1.id,     type: 'in',         quantity: 100, reason: 'Commande Amlodipine 10mg',                         created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sGants.id,          actor_id: admin1.id,     type: 'in',         quantity: 20,  reason: 'Commande consommables — 20 boîtes gants',          created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sAlcool.id,         actor_id: admin1.id,     type: 'in',         quantity: 20,  reason: 'Commande flacons alcool 70°',                      created_at: past(30, 9), updated_at: past(30, 9) },

    // ── Sorties (dispensation) régulières ─────────────────────────────────────
    { organization_id: org1.id, stock_item_id: sMetformine.id,    actor_id: doctor1.id,    type: 'out',        quantity: 60,  reason: 'Dispensation ordonnances diabète — sem. 1-2',      created_at: past(21, 10), updated_at: past(21, 10) },
    { organization_id: org1.id, stock_item_id: sParacetamol.id,   actor_id: doctor1.id,    type: 'out',        quantity: 30,  reason: 'Dispensation consultations fièvre/douleur',        created_at: past(21, 10), updated_at: past(21, 10) },
    { organization_id: org1.id, stock_item_id: sAmlodipine.id,    actor_id: doctor2.id,    type: 'out',        quantity: 50,  reason: 'Dispensation ordonnances HTA sem. 1-2',            created_at: past(21, 10), updated_at: past(21, 10) },
    { organization_id: org1.id, stock_item_id: sGants.id,          actor_id: secretary.id,  type: 'out',        quantity: 8,   reason: 'Utilisation quotidienne consultations — 2 semaines', created_at: past(14, 8), updated_at: past(14, 8) },
    { organization_id: org1.id, stock_item_id: sAlcool.id,         actor_id: secretary.id,  type: 'out',        quantity: 12,  reason: 'Utilisation quotidienne soins — 2 semaines',        created_at: past(14, 8), updated_at: past(14, 8) },
    { organization_id: org1.id, stock_item_id: sMetformine.id,    actor_id: doctor1.id,    type: 'out',        quantity: 80,  reason: 'Dispensation diabétiques — semaine dernière',      created_at: past(7, 10), updated_at: past(7, 10) },
    { organization_id: org1.id, stock_item_id: sSeringues.id,      actor_id: secretary.id,  type: 'out',        quantity: 30,  reason: 'Injections et prélèvements semaine en cours',      created_at: past(7, 8), updated_at: past(7, 8) },
    { organization_id: org1.id, stock_item_id: sAmlodipine.id,    actor_id: doctor2.id,    type: 'out',        quantity: 47,  reason: 'Dispensation ordonnances HTA — 3 dernières sem.',  created_at: past(3, 11), updated_at: past(3, 11) },

    // ── Ajustement inventaire ─────────────────────────────────────────────────
    { organization_id: org1.id, stock_item_id: sParacetamol.id,   actor_id: admin1.id,     type: 'adjustment', quantity: -30, reason: 'Correction inventaire — stock physique vérifié',    created_at: past(3, 11), updated_at: past(3, 11) },

    // ── Réapprovisionnement urgent ────────────────────────────────────────────
    { organization_id: org1.id, stock_item_id: sBandes.id,         actor_id: admin1.id,     type: 'in',         quantity: 50,  reason: 'Réapprovisionnement urgence bandes de gaze',        created_at: past(1, 9), updated_at: past(1, 9) },
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  // 4. FILE D'ATTENTE DIGITALE — Tokens du jour
  // ════════════════════════════════════════════════════════════════════════════
  await knex('queue_tokens').insert([
    // Déjà passés (patients ayant eu leur consultation)
    { organization_id: org1.id, number: 1, patient_name: 'Fatou Koné',       reason: 'Suivi HTA',                     status: 'done',    date: todayStr, created_at: past(0, 7, 45), updated_at: past(0, 9, 5)  },
    { organization_id: org1.id, number: 2, patient_name: 'Ibrahima Bah',     reason: 'Diabète — bilan mensuel',        status: 'done',    date: todayStr, created_at: past(0, 8, 5),  updated_at: past(0, 9, 50) },
    // En cours (appelé — en consultation)
    { organization_id: org1.id, number: 3, patient_name: 'Mariam Touré',     reason: 'HTA — renouvellement ordonnance', status: 'called',  date: todayStr, created_at: past(0, 8, 50), updated_at: past(0, 9, 35) },
    // En attente
    { organization_id: org1.id, number: 4, patient_name: 'Karim Meïté',      reason: 'Consultation générale',          status: 'waiting', date: todayStr, created_at: past(0, 9, 10), updated_at: past(0, 9, 10) },
    { organization_id: org1.id, number: 5, patient_name: 'Moussa Konaté',    reason: 'Résultats analyses',             status: 'waiting', date: todayStr, created_at: past(0, 9, 25), updated_at: past(0, 9, 25) },
    { organization_id: org1.id, number: 6, patient_name: 'Adjoa Asante',     reason: 'Renouvellement ordonnance HTA',  status: 'waiting', date: todayStr, created_at: past(0, 9, 40), updated_at: past(0, 9, 40) },
    { organization_id: org1.id, number: 7, patient_name: 'Sans rendez-vous', reason: 'Urgence — douleurs thoraciques', status: 'waiting', date: todayStr, created_at: past(0, 10, 5), updated_at: past(0, 10, 5) },
  ]);

  // File d'attente org2 — Cabinet Médical Cocody
  await knex('queue_tokens').insert([
    { organization_id: org2.id, number: 1, patient_name: 'Ahou Diallo',       reason: 'Consultation générale',              status: 'done',    date: todayStr, created_at: past(0, 8, 0),  updated_at: past(0, 8, 50)  },
    { organization_id: org2.id, number: 2, patient_name: 'Kouamé Yeboué',     reason: 'Renouvellement ordonnance',           status: 'done',    date: todayStr, created_at: past(0, 8, 20), updated_at: past(0, 9, 40)  },
    { organization_id: org2.id, number: 3, patient_name: 'Mariétou Sow',      reason: 'Diabète — suivi mensuel',             status: 'called',  date: todayStr, created_at: past(0, 8, 55), updated_at: past(0, 9, 55)  },
    { organization_id: org2.id, number: 4, patient_name: 'Lamine Ouédraogo',  reason: 'Douleurs articulaires',               status: 'waiting', date: todayStr, created_at: past(0, 9, 20), updated_at: past(0, 9, 20)  },
    { organization_id: org2.id, number: 5, patient_name: 'Fatimata Koné',     reason: 'Grossesse — consultation prénatale',  status: 'waiting', date: todayStr, created_at: past(0, 9, 45), updated_at: past(0, 9, 45)  },
    { organization_id: org2.id, number: 6, patient_name: 'Sans rendez-vous',  reason: 'Fièvre et maux de gorge',             status: 'waiting', date: todayStr, created_at: past(0, 10, 10), updated_at: past(0, 10, 10) },
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  // 5. RAPPELS SMS
  // ════════════════════════════════════════════════════════════════════════════
  const futureAppts = await knex('appointments')
    .where('organization_id', org1.id)
    .where('scheduled_at', '>', new Date().toISOString())
    .orderBy('scheduled_at', 'asc')
    .limit(6);

  const smsData = [];

  // SMS envoyés avec succès — rappels 48h et 2h pour Fatou Koné (todayAppts[0])
  if (todayAppts.length >= 1) {
    smsData.push({
      organization_id: org1.id,
      appointment_id: todayAppts[0].id,
      phone: p2.phone || '+225 05 06 07 08 09',
      status: 'sent',
      type: 'reminder_48h',
      message: `Bonjour Fatou Koné, rappel de votre rendez-vous demain à 08h30 à la Clinique du Plateau. Tél : +225 27 20 31 00 00`,
      scheduled_at: past(2, 8),
      sent_at: past(2, 8, 5),
      created_at: past(2, 7, 55),
      updated_at: past(2, 8, 5),
    });
    smsData.push({
      organization_id: org1.id,
      appointment_id: todayAppts[0].id,
      phone: p2.phone || '+225 05 06 07 08 09',
      status: 'sent',
      type: 'reminder_2h',
      message: `Bonjour Fatou Koné, votre RDV est dans 2h à la Clinique du Plateau (08h30). À tout à l'heure !`,
      scheduled_at: past(0, 6, 30),
      sent_at: past(0, 6, 31),
      created_at: past(0, 6, 29),
      updated_at: past(0, 6, 31),
    });
  }

  // SMS envoyé — rappel 48h pour Ibrahima Bah (todayAppts[1])
  if (todayAppts.length >= 2) {
    smsData.push({
      organization_id: org1.id,
      appointment_id: todayAppts[1].id,
      phone: p3.phone || '+225 05 55 44 33 22',
      status: 'sent',
      type: 'reminder_48h',
      message: `Bonjour Ibrahima Bah, rappel de votre rendez-vous demain à 09h00 à la Clinique du Plateau.`,
      scheduled_at: past(2, 9),
      sent_at: past(2, 9, 2),
      created_at: past(2, 8, 55),
      updated_at: past(2, 9, 2),
    });
  }

  // SMS en échec — Karim Meïté (todayAppts[3]), numéro temporairement injoignable
  if (todayAppts.length >= 4) {
    smsData.push({
      organization_id: org1.id,
      appointment_id: todayAppts[3].id,
      phone: p1.phone || '+225 07 08 09 10 11',
      status: 'failed',
      type: 'reminder_48h',
      message: `Bonjour Karim Meïté, rappel de votre rendez-vous demain à 10h30 à la Clinique du Plateau.`,
      scheduled_at: past(2, 10),
      sent_at: null,
      created_at: past(2, 9, 55),
      updated_at: past(2, 10, 3),
    });
  }

  // SMS en attente d'envoi (RDV futurs — 48h avant)
  for (let i = 0; i < Math.min(futureAppts.length, 4); i++) {
    const appt = futureAppts[i];
    const patientInfo = await knex('patients').where('id', appt.patient_id).first();
    if (!patientInfo || !patientInfo.phone) continue;

    const rdvDate = new Date(appt.scheduled_at);
    const scheduledSendAt = new Date(appt.scheduled_at);
    scheduledSendAt.setDate(scheduledSendAt.getDate() - 2);

    smsData.push({
      organization_id: org1.id,
      appointment_id: appt.id,
      phone: patientInfo.phone,
      status: 'pending',
      type: 'reminder_48h',
      message: `Bonjour ${patientInfo.first_name} ${patientInfo.last_name}, rappel de votre rendez-vous le ${rdvDate.toLocaleDateString('fr-FR')} à ${rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} à la Clinique du Plateau.`,
      scheduled_at: scheduledSendAt.toISOString(),
      sent_at: null,
      created_at: past(1, 14),
      updated_at: past(1, 14),
    });
  }

  if (smsData.length > 0) {
    await knex('sms_reminders').insert(smsData);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 6. FORMULAIRES DE CONSENTEMENT
  // ════════════════════════════════════════════════════════════════════════════
  const consentForms = await knex('consent_forms').insert([
    {
      organization_id: org1.id,
      title: 'Consentement éclairé général',
      category: 'general',
      is_active: true,
      content: `Je soussigné(e), patient(e) de la Clinique du Plateau, consens librement à recevoir les soins médicaux proposés par le médecin traitant.

J'ai été informé(e) de la nature des soins, des bénéfices attendus, des risques éventuels ainsi que des alternatives thérapeutiques disponibles.

Je comprends que je peux poser des questions à tout moment et retirer mon consentement sans préjudice pour ma prise en charge.

Je reconnais avoir reçu des explications claires et complètes en langue accessible.`,
    },
    {
      organization_id: org1.id,
      title: 'Consentement traitement des données personnelles (RGPD)',
      category: 'data',
      is_active: true,
      content: `Conformément à la loi ivoirienne sur la protection des données personnelles et au RGPD, la Clinique du Plateau collecte et traite vos données de santé aux fins suivantes :
- Gestion de votre dossier médical
- Facturation et prise en charge par votre assurance
- Communication des résultats d'examens
- Rappels de rendez-vous par SMS

Vos données sont conservées 10 ans après votre dernière consultation. Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données.

Pour exercer vos droits : admin@clinique-plateau.ci`,
    },
    {
      organization_id: org1.id,
      title: 'Consentement à un acte chirurgical mineur',
      category: 'operation',
      is_active: true,
      content: `Je consens à l'acte médical / chirurgical mineur qui m'a été décrit par le médecin, notamment :
- La nature de l'intervention et ses modalités
- Les bénéfices attendus
- Les risques et complications possibles (infection, saignement, réaction anesthésique)
- Les alternatives à cette intervention

Je certifie avoir eu le temps de réfléchir à cette décision et avoir pu poser toutes mes questions.`,
    },
    {
      organization_id: org1.id,
      title: 'Consentement partage de dossier médical',
      category: 'general',
      is_active: true,
      content: `J'autorise la Clinique du Plateau à partager tout ou partie de mon dossier médical avec un autre établissement de santé, dans le cadre de ma prise en charge coordonnée.

Ce partage est limité aux informations strictement nécessaires à ma prise en charge et s'effectue de manière sécurisée via le système CliniqueCI.

Je peux révoquer cette autorisation à tout moment auprès de l'accueil.`,
    },
  ]).returning(['id', 'title', 'category']);

  const [cfGeneral, cfData, cfOperation, cfShare] = consentForms;

  // ════════════════════════════════════════════════════════════════════════════
  // 7. SIGNATURES DE CONSENTEMENT (uniquement p1–p5)
  // ════════════════════════════════════════════════════════════════════════════
  // Signature factice (1×1 pixel transparent PNG en base64)
  const fakeSig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  await knex('consent_signatures').insert([
    // p1 — Karim Meïté : général + données (arrivée initiale il y a 30j)
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p1.id,
      collected_by: secretary.id, signed: true, signature_data: fakeSig,
      signed_at: past(30, 9, 5), created_at: past(30, 9), updated_at: past(30, 9, 5),
    },
    {
      organization_id: org1.id, consent_form_id: cfData.id, patient_id: p1.id,
      collected_by: secretary.id, signed: true, signature_data: fakeSig,
      signed_at: past(30, 9, 7), created_at: past(30, 9), updated_at: past(30, 9, 7),
    },

    // p2 — Fatou Koné : consentement général signé
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p2.id,
      collected_by: secretary.id, signed: true, signature_data: fakeSig,
      signed_at: past(30, 11, 5), created_at: past(30, 11), updated_at: past(30, 11, 5),
    },

    // p3 — Ibrahima Bah : général + données signé (patient chronique, arrivée il y a 30j)
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p3.id,
      collected_by: secretary.id, signed: true, signature_data: fakeSig,
      signed_at: past(30, 9, 10), created_at: past(30, 9), updated_at: past(30, 9, 10),
    },
    {
      organization_id: org1.id, consent_form_id: cfData.id, patient_id: p3.id,
      collected_by: secretary.id, signed: true, signature_data: fakeSig,
      signed_at: past(30, 9, 12), created_at: past(30, 9), updated_at: past(30, 9, 12),
    },

    // p4 — Mariam Touré : EN ATTENTE de signature générale (arrivée aujourd'hui)
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p4.id,
      collected_by: secretary.id, signed: false, signature_data: null, signed_at: null,
      created_at: past(0, 9), updated_at: past(0, 9),
    },

    // p5 — Koffi Yao : données EN ATTENTE (à signer lors de la prochaine consultation)
    {
      organization_id: org1.id, consent_form_id: cfData.id, patient_id: p5.id,
      collected_by: secretary.id, signed: false, signature_data: null, signed_at: null,
      created_at: past(3, 10), updated_at: past(3, 10),
    },
    // p5 — Koffi Yao : partage de dossier signé (autorisé lors du bilan il y a 7j)
    {
      organization_id: org1.id, consent_form_id: cfShare.id, patient_id: p5.id,
      collected_by: doctor2.id, signed: true, signature_data: fakeSig,
      signed_at: past(7, 10, 8), created_at: past(7, 10), updated_at: past(7, 10, 8),
    },
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  // 8. DEMANDES DE PARTAGE DE DOSSIERS (inter-cliniques)
  // ════════════════════════════════════════════════════════════════════════════
  // org2 (Cabinet Cocody) demande accès aux dossiers de patients suivis à org1

  if (drBamba) {
    await knex('record_share_requests').insert([
      // Approuvée — Koffi Yao : patient a donné accord, dossier cardio partagé
      {
        requesting_org_id: org2.id,
        source_org_id: org1.id,
        patient_id: p5.id,
        requested_by: drBamba.id,
        status: 'approved',
        reason: 'Patient Koffi Yao est venu en urgence au Cabinet Cocody. Besoin du dossier HTA + ECG (antécédents, ordonnances, dernières mesures tensionnelles).',
        patient_consent_code: 'PAT-2024-7731',
        expires_at: future(30),
        created_at: past(7, 11),
        updated_at: past(7, 14),
      },
      // En attente — Mariam Touré : demande récente, en cours de validation
      {
        requesting_org_id: org2.id,
        source_org_id: org1.id,
        patient_id: p4.id,
        requested_by: drBamba.id,
        status: 'pending',
        reason: 'Patiente Mariam Touré — HTA déséquilibrée. Besoin historique tensionnel et traitements en cours pour ajustement thérapeutique.',
        patient_consent_code: 'PAT-2024-8102',
        expires_at: future(30),
        created_at: past(0, 10),
        updated_at: past(0, 10),
      },
      // Refusée — Ibrahima Bah : patient n'a pas consenti au partage
      {
        requesting_org_id: org2.id,
        source_org_id: org1.id,
        patient_id: p3.id,
        requested_by: drBamba.id,
        status: 'denied',
        reason: 'Suivi diabète — patient Ibrahima Bah souhaite éventuellement transférer son suivi au Cabinet Cocody.',
        patient_consent_code: null,
        expires_at: null,
        created_at: past(14, 9),
        updated_at: past(12, 11),
      },
    ]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  console.log('✅ Seed 002 terminé :');
  console.log(`   • QR tokens ajoutés sur toutes les ordonnances`);
  console.log(`   • 10 articles en stock (2 en alerte stock bas — Amlodipine, Gants, Alcool)`);
  console.log(`   • 15 mouvements de stock (entrées, sorties, ajustement)`);
  console.log(`   • 7 tokens file d'attente (2 done, 1 called, 4 waiting)`);
  console.log(`   • ${smsData.length} rappels SMS (envoyés, en échec, en attente)`);
  console.log(`   • 4 formulaires de consentement`);
  console.log(`   • 8 signatures (5 signées, 3 en attente)`);
  console.log(`   • 3 demandes de partage de dossiers inter-cliniques (1 approuvée, 1 en attente, 1 refusée)`);
};
