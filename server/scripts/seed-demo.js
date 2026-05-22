/**
 * Seed script — crée les données de démo pour tester l'application.
 *
 * Usage : node scripts/seed-demo.js
 *
 * Comptes créés :
 *   admin@clinique-plateau.ci  / Password123!  (Admin)
 *   aminata@clinique-plateau.ci / Password123!  (Médecin)
 *   rana@clinique-plateau.ci   / Password123!  (Secrétaire)
 *   karim@email.ci             / Password123!  (Patient)
 */

require('dotenv').config();
const knex = require('knex');
const bcrypt = require('bcrypt');
const config = require('../knexfile');

const db = knex(config.development);
const SALT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Début du seed de démo...\n');

  // Nettoie les données existantes (ordre respectant les FK)
  await db('refresh_tokens').del();
  await db('prescriptions').del();
  await db('invoices').del();
  await db('consultations').del();
  await db('appointments').del();
  await db('patients').del();
  await db('users').del();
  await db('organizations').del();
  console.log('  ✓ Tables nettoyées');

  // 1. Organisation
  const [org] = await db('organizations')
    .insert({ name: 'Clinique du Plateau' })
    .returning(['id', 'name']);
  console.log(`  ✓ Organisation créée : ${org.name} (${org.id})`);

  const hash = await bcrypt.hash('Password123!', SALT_ROUNDS);

  // 2. Utilisateurs
  const [admin] = await db('users')
    .insert({
      organization_id: org.id,
      email: 'admin@clinique-plateau.ci',
      password_hash: hash,
      first_name: 'Diabaté',
      last_name: 'Admin',
      role: 'admin',
    })
    .returning(['id', 'email', 'role']);

  const [doctor] = await db('users')
    .insert({
      organization_id: org.id,
      email: 'aminata@clinique-plateau.ci',
      password_hash: hash,
      first_name: 'Aminata',
      last_name: 'Koné',
      role: 'doctor',
    })
    .returning(['id', 'email', 'role']);

  const [secretary] = await db('users')
    .insert({
      organization_id: org.id,
      email: 'rana@clinique-plateau.ci',
      password_hash: hash,
      first_name: 'Rana',
      last_name: 'Touré',
      role: 'secretary',
    })
    .returning(['id', 'email', 'role']);

  const [patientUser] = await db('users')
    .insert({
      organization_id: org.id,
      email: 'karim@email.ci',
      password_hash: hash,
      first_name: 'Karim',
      last_name: 'Meïté',
      role: 'patient',
    })
    .returning(['id', 'email', 'role']);

  console.log(`  ✓ Admin     : ${admin.email}`);
  console.log(`  ✓ Médecin   : ${doctor.email}`);
  console.log(`  ✓ Secrétaire: ${secretary.email}`);
  console.log(`  ✓ Patient   : ${patientUser.email}`);

  // 3. Dossier patient lié au compte karim
  const [patient] = await db('patients')
    .insert({
      organization_id: org.id,
      user_id: patientUser.id,
      first_name: 'Karim',
      last_name: 'Meïté',
      date_of_birth: '1993-04-15',
      phone: '+225 07 00 00 00',
      email: 'karim@email.ci',
      blood_type: 'O+',
    })
    .returning(['id', 'first_name', 'last_name']);
  console.log(`  ✓ Dossier patient : ${patient.first_name} ${patient.last_name}`);

  // 4. Quelques patients supplémentaires
  await db('patients').insert([
    {
      organization_id: org.id,
      first_name: 'Awa',
      last_name: 'Konaté',
      date_of_birth: '1988-11-30',
      phone: '+225 05 11 22 33',
      blood_type: 'A+',
    },
    {
      organization_id: org.id,
      first_name: 'Moussa',
      last_name: 'Traoré',
      date_of_birth: '1975-06-22',
      phone: '+225 01 44 55 66',
      blood_type: 'B-',
    },
    {
      organization_id: org.id,
      first_name: 'Fatou',
      last_name: 'Diallo',
      date_of_birth: '2001-03-08',
      phone: '+225 07 88 99 00',
    },
  ]);
  console.log('  ✓ 3 patients supplémentaires créés');

  // 5. Rendez-vous à venir
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 30, 0, 0);

  await db('appointments').insert([
    {
      organization_id: org.id,
      patient_id: patient.id,
      doctor_id: doctor.id,
      scheduled_at: tomorrow.toISOString(),
      reason: 'Consultation générale',
      status: 'confirmed',
    },
    {
      organization_id: org.id,
      patient_id: patient.id,
      doctor_id: doctor.id,
      scheduled_at: dayAfter.toISOString(),
      reason: 'Suivi tension artérielle',
      status: 'confirmed',
    },
  ]);
  console.log('  ✓ 2 rendez-vous créés');

  console.log('\n✅ Seed terminé avec succès !\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Comptes disponibles (mot de passe : Password123!)');
  console.log('  👤 Admin      : admin@clinique-plateau.ci');
  console.log('  👩‍⚕️ Médecin    : aminata@clinique-plateau.ci');
  console.log('  👩‍💼 Secrétaire : rana@clinique-plateau.ci');
  console.log('  🧑 Patient    : karim@email.ci');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed()
  .catch(err => {
    console.error('❌ Erreur seed :', err.message);
    process.exit(1);
  })
  .finally(() => db.destroy());
