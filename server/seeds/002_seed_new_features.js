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

  // Patients org1
  const patients = await knex('patients').where('organization_id', org1.id).orderBy('created_at', 'asc');
  const [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15] = patients;

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
      name: 'Amlodipine 5mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 3,           // ⚠️ STOCK BAS (min: 15)
      min_quantity: 15,
      unit_price: 80,
      supplier: 'MedSupply Abidjan',
    },
    {
      organization_id: org1.id,
      name: 'Amoxicilline 500mg',
      category: 'medicament',
      unit: 'gélule',
      quantity: 180,
      min_quantity: 60,
      unit_price: 45,
      supplier: 'Pharma CI Distribution',
    },
    {
      organization_id: org1.id,
      name: 'Oméprazole 20mg',
      category: 'medicament',
      unit: 'gélule',
      quantity: 75,
      min_quantity: 30,
      unit_price: 60,
      supplier: 'MedSupply Abidjan',
    },
    {
      organization_id: org1.id,
      name: 'Ibuprofène 400mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 4,           // ⚠️ STOCK BAS (min: 20)
      min_quantity: 20,
      unit_price: 35,
      supplier: 'Pharma CI Distribution',
    },
    {
      organization_id: org1.id,
      name: 'Losartan 50mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 120,
      min_quantity: 30,
      unit_price: 90,
      supplier: 'MedSupply Abidjan',
    },
    {
      organization_id: org1.id,
      name: 'Sulfate ferreux 80mg',
      category: 'medicament',
      unit: 'comprimé',
      quantity: 90,
      min_quantity: 20,
      unit_price: 25,
      supplier: 'Pharma CI Distribution',
    },
    // ── Matériels / Consommables ──────────────────────────────────────────────
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
    {
      organization_id: org1.id,
      name: 'Oxymètre de pouls',
      category: 'materiel',
      unit: 'pièce',
      quantity: 3,
      min_quantity: 2,
      unit_price: 15000,
      supplier: 'SanteEquip CI',
    },
  ]).returning(['id', 'name', 'quantity']);

  const [
    sMetformine, sParacetamol, sAmlodipine, sAmoxicilline, sOmeprazole,
    sIbuprofene, sLosartan, sFerSulfate, sSeringues, sGants,
    sAlcool, sBandes, sOxymetre,
  ] = stockItems;

  // ════════════════════════════════════════════════════════════════════════════
  // 3. MOUVEMENTS DE STOCK (historique réaliste)
  // ════════════════════════════════════════════════════════════════════════════
  await knex('stock_movements').insert([
    // Entrées (approvisionnement) il y a 30j
    { organization_id: org1.id, stock_item_id: sMetformine.id,  actor_id: admin1.id, type: 'in',  quantity: 200, reason: 'Commande mensuelle — livraison Pharma CI', created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sParacetamol.id, actor_id: admin1.id, type: 'in',  quantity: 300, reason: 'Commande mensuelle', created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sAmlodipine.id,  actor_id: admin1.id, type: 'in',  quantity: 100, reason: 'Commande mensuelle', created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sGants.id,        actor_id: admin1.id, type: 'in',  quantity: 20,  reason: 'Commande consommables — 20 boîtes', created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sAlcool.id,       actor_id: admin1.id, type: 'in',  quantity: 20,  reason: 'Commande flacons alcool', created_at: past(30, 9), updated_at: past(30, 9) },
    { organization_id: org1.id, stock_item_id: sIbuprofene.id,   actor_id: admin1.id, type: 'in',  quantity: 100, reason: 'Commande mensuelle', created_at: past(30, 9), updated_at: past(30, 9) },
    // Sorties (dispensation) régulières
    { organization_id: org1.id, stock_item_id: sMetformine.id,  actor_id: doctor1.id, type: 'out', quantity: 60,  reason: 'Dispensation ordonnances diabète — semaines 1-2', created_at: past(21, 10), updated_at: past(21, 10) },
    { organization_id: org1.id, stock_item_id: sParacetamol.id, actor_id: doctor1.id, type: 'out', quantity: 30,  reason: 'Dispensation consultations fièvre/douleur', created_at: past(21, 10), updated_at: past(21, 10) },
    { organization_id: org1.id, stock_item_id: sAmlodipine.id,  actor_id: doctor2.id, type: 'out', quantity: 50,  reason: 'Dispensation ordonnances HTA', created_at: past(21, 10), updated_at: past(21, 10) },
    { organization_id: org1.id, stock_item_id: sGants.id,        actor_id: secretary.id, type: 'out', quantity: 8,   reason: 'Utilisation quotidienne consultations', created_at: past(14, 8), updated_at: past(14, 8) },
    { organization_id: org1.id, stock_item_id: sAlcool.id,       actor_id: secretary.id, type: 'out', quantity: 12,  reason: 'Utilisation quotidienne — soins', created_at: past(14, 8), updated_at: past(14, 8) },
    { organization_id: org1.id, stock_item_id: sIbuprofene.id,   actor_id: doctor2.id, type: 'out', quantity: 50,  reason: 'Dispensation ordonnances lombalgies', created_at: past(14, 10), updated_at: past(14, 10) },
    { organization_id: org1.id, stock_item_id: sMetformine.id,  actor_id: doctor1.id, type: 'out', quantity: 80,  reason: 'Dispensation diabétiques — semaine dernière', created_at: past(7, 10), updated_at: past(7, 10) },
    { organization_id: org1.id, stock_item_id: sSeringues.id,    actor_id: secretary.id, type: 'out', quantity: 30,  reason: 'Injections et prélèvements semaine en cours', created_at: past(7, 8), updated_at: past(7, 8) },
    // Ajustement (inventaire) il y a 3j
    { organization_id: org1.id, stock_item_id: sParacetamol.id, actor_id: admin1.id,  type: 'adjustment', quantity: -30, reason: 'Correction inventaire — stock physique vérifié', created_at: past(3, 11), updated_at: past(3, 11) },
    // Entrée + sortie récentes aujourd'hui
    { organization_id: org1.id, stock_item_id: sBandes.id,       actor_id: admin1.id,  type: 'in',  quantity: 50,  reason: 'Réapprovisionnement urgence', created_at: past(1, 9), updated_at: past(1, 9) },
    { organization_id: org1.id, stock_item_id: sAmlodipine.id,  actor_id: doctor2.id, type: 'out', quantity: 47,  reason: 'Dispensation ordonnances HTA — semaine', created_at: past(3, 11), updated_at: past(3, 11) },
    { organization_id: org1.id, stock_item_id: sIbuprofene.id,   actor_id: doctor1.id, type: 'out', quantity: 46,  reason: 'Dispensation anti-inflammatoires', created_at: past(1, 11), updated_at: past(1, 11) },
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  // 4. FILE D'ATTENTE DIGITALE — Tokens du jour
  // ════════════════════════════════════════════════════════════════════════════
  await knex('queue_tokens').insert([
    // Déjà passés
    { organization_id: org1.id, number: 1, patient_name: 'Fatou Koné',       reason: 'Consultation générale',          status: 'done',    date: todayStr, created_at: past(0, 7, 45), updated_at: past(0, 8, 55) },
    { organization_id: org1.id, number: 2, patient_name: 'Ibrahima Bah',     reason: 'Suivi diabète',                  status: 'done',    date: todayStr, created_at: past(0, 8, 5),  updated_at: past(0, 9, 30) },
    { organization_id: org1.id, number: 3, patient_name: 'Mariam Touré',     reason: 'Tension artérielle',             status: 'called',  date: todayStr, created_at: past(0, 8, 50), updated_at: past(0, 9, 50) },
    // En attente
    { organization_id: org1.id, number: 4, patient_name: 'Moussa Konaté',    reason: 'Consultation générale',          status: 'waiting', date: todayStr, created_at: past(0, 9, 10), updated_at: past(0, 9, 10) },
    { organization_id: org1.id, number: 5, patient_name: 'Adjoa Asante',     reason: 'Résultats analyses',             status: 'waiting', date: todayStr, created_at: past(0, 9, 25), updated_at: past(0, 9, 25) },
    { organization_id: org1.id, number: 6, patient_name: 'Daouda Traoré',    reason: 'Renouvellement ordonnance HTA',  status: 'waiting', date: todayStr, created_at: past(0, 9, 40), updated_at: past(0, 9, 40) },
    { organization_id: org1.id, number: 7, patient_name: 'Sans rendez-vous', reason: 'Urgence — douleurs thoraciques', status: 'waiting', date: todayStr, created_at: past(0, 10, 5), updated_at: past(0, 10, 5) },
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  // 5. RAPPELS SMS
  // ════════════════════════════════════════════════════════════════════════════
  // On a besoin de RDV futurs
  const futureAppts = await knex('appointments')
    .where('organization_id', org1.id)
    .where('scheduled_at', '>', new Date().toISOString())
    .orderBy('scheduled_at', 'asc')
    .limit(6);

  const smsData = [];

  // SMS envoyés avec succès (RDV passés)
  if (todayAppts.length >= 2) {
    smsData.push({
      organization_id: org1.id,
      appointment_id: todayAppts[0].id,
      phone: p2.phone || '+225 05 06 07 08 09',
      status: 'sent',
      type: 'reminder_48h',
      message: `Bonjour Fatou Koné, rappel de votre rendez-vous demain à 08h30 à la Clinique du Plateau. Tel: +225 27 20 31 00 00`,
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
    smsData.push({
      organization_id: org1.id,
      appointment_id: todayAppts[1].id,
      phone: p5.phone || '+225 05 55 44 33 22',
      status: 'sent',
      type: 'reminder_48h',
      message: `Bonjour Ibrahima Bah, rappel de votre rendez-vous demain à 09h00 à la Clinique du Plateau.`,
      scheduled_at: past(2, 9),
      sent_at: past(2, 9, 2),
      created_at: past(2, 8, 55),
      updated_at: past(2, 9, 2),
    });
  }

  // SMS en échec (numéro injoignable)
  if (todayAppts.length >= 4) {
    smsData.push({
      organization_id: org1.id,
      appointment_id: todayAppts[3].id,
      phone: p11.phone || '+225 05 33 44 55 66',
      status: 'failed',
      type: 'reminder_48h',
      message: `Bonjour Moussa Konaté, rappel de votre rendez-vous demain à 10h00 à la Clinique du Plateau.`,
      scheduled_at: past(2, 10),
      sent_at: null,
      created_at: past(2, 9, 55),
      updated_at: past(2, 10, 3),
    });
  }

  // SMS en attente d'envoi (RDV futurs)
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
  // 7. SIGNATURES DE CONSENTEMENT
  // ════════════════════════════════════════════════════════════════════════════
  await knex('consent_signatures').insert([
    // Karim Meïté — a signé le consentement général et données (il y a 14j lors de sa consultation)
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p1.id,
      collected_by: secretary.id, signed: true,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signed_at: past(14, 9, 5), created_at: past(14, 9), updated_at: past(14, 9, 5),
    },
    {
      organization_id: org1.id, consent_form_id: cfData.id, patient_id: p1.id,
      collected_by: secretary.id, signed: true,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signed_at: past(14, 9, 7), created_at: past(14, 9), updated_at: past(14, 9, 7),
    },
    // Fatou Koné — consentement général signé (suivi post-op)
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p2.id,
      collected_by: secretary.id, signed: true,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signed_at: past(30, 11, 5), created_at: past(30, 11), updated_at: past(30, 11, 5),
    },
    // Ibrahima Bah — signé général + données
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p5.id,
      collected_by: secretary.id, signed: true,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signed_at: past(30, 9, 10), created_at: past(30, 9), updated_at: past(30, 30, 10),
    },
    {
      organization_id: org1.id, consent_form_id: cfData.id, patient_id: p5.id,
      collected_by: secretary.id, signed: true,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signed_at: past(30, 9, 12), created_at: past(30, 9), updated_at: past(30, 9, 12),
    },
    // Rokia Sanogo — signé général + opération (suivi grossesse)
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p8.id,
      collected_by: secretary.id, signed: true,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signed_at: past(7, 11, 5), created_at: past(7, 11), updated_at: past(7, 11, 5),
    },
    // Koffi Yao — en attente de signature (données)
    {
      organization_id: org1.id, consent_form_id: cfData.id, patient_id: p9.id,
      collected_by: secretary.id, signed: false,
      signature_data: null, signed_at: null,
      created_at: past(3, 10), updated_at: past(3, 10),
    },
    // Mariam Touré — en attente signature générale (aujourd'hui)
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p4.id,
      collected_by: secretary.id, signed: false,
      signature_data: null, signed_at: null,
      created_at: past(0, 9), updated_at: past(0, 9),
    },
    // Daouda Traoré — signé général + partage dossier
    {
      organization_id: org1.id, consent_form_id: cfGeneral.id, patient_id: p13.id,
      collected_by: secretary.id, signed: true,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signed_at: past(7, 10, 5), created_at: past(7, 10), updated_at: past(7, 10, 5),
    },
    {
      organization_id: org1.id, consent_form_id: cfShare.id, patient_id: p13.id,
      collected_by: doctor2.id, signed: true,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signed_at: past(7, 10, 8), created_at: past(7, 10), updated_at: past(7, 10, 8),
    },
    // Nadia Ouattara — en attente (bilan annuel récent)
    {
      organization_id: org1.id, consent_form_id: cfData.id, patient_id: p14.id,
      collected_by: secretary.id, signed: false,
      signature_data: null, signed_at: null,
      created_at: past(3, 9), updated_at: past(3, 9),
    },
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  // 8. DEMANDES DE PARTAGE DE DOSSIERS (inter-cliniques)
  // ════════════════════════════════════════════════════════════════════════════
  // org2 (Cabinet Cocody) demande accès aux dossiers de patients qui ont été
  // vus à org1 (Clinique du Plateau)
  const expiresInMonth = future(30);

  if (drBamba) {
    await knex('record_share_requests').insert([
      // Demande approuvée — Daouda Traoré (patient a donné son accord)
      {
        requesting_org_id: org2.id,
        source_org_id: org1.id,
        patient_id: p13.id,
        requested_by: drBamba.id,
        status: 'approved',
        reason: 'Patient Daouda Traoré est venu en urgence au Cabinet Cocody. Besoin du dossier HTA (antécédents, ordonnances, dernière TA mesurée).',
        patient_consent_code: 'PAT-2024-7731',
        expires_at: expiresInMonth,
        created_at: past(7, 11),
        updated_at: past(7, 14),
      },
      // Demande en attente — Koffi Yao
      {
        requesting_org_id: org2.id,
        source_org_id: org1.id,
        patient_id: p9.id,
        requested_by: drBamba.id,
        status: 'pending',
        reason: 'Patient Koffi Yao consulte pour suivi cardiologique. Besoin des derniers ECG et ordonnances antihypertensives de la Clinique du Plateau.',
        patient_consent_code: 'PAT-2024-7890',
        expires_at: future(14),
        created_at: past(1, 10),
        updated_at: past(1, 10),
      },
      // Demande refusée (patient n'a pas consenti)
      {
        requesting_org_id: org2.id,
        source_org_id: org1.id,
        patient_id: p5.id,
        requested_by: drBamba.id,
        status: 'denied',
        reason: 'Suivi diabète — patient Ibrahima Bah souhaite transférer son suivi au Cabinet Cocody.',
        patient_consent_code: null,
        expires_at: null,
        created_at: past(14, 9),
        updated_at: past(12, 11),
      },
      // Demande récente en attente (aujourd'hui)
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
    ]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  console.log('✅ Seed 002 terminé :');
  console.log(`   • QR tokens ajoutés sur toutes les ordonnances`);
  console.log(`   • 13 articles en stock (5 en alerte stock bas)`);
  console.log(`   • 18 mouvements de stock`);
  console.log(`   • 7 tokens file d'attente (2 done, 1 called, 4 waiting)`);
  console.log(`   • ${smsData.length} rappels SMS (envoyés, en échec, en attente)`);
  console.log(`   • 4 formulaires de consentement`);
  console.log(`   • 11 signatures (8 signées, 3 en attente)`);
  console.log(`   • 4 demandes de partage de dossiers inter-cliniques`);
};
