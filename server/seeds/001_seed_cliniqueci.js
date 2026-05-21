const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  await knex('refresh_tokens').del();
  await knex('prescriptions').del();
  await knex('consultations').del();
  await knex('appointments').del();
  await knex('patients').del();
  await knex('users').del();
  await knex('organizations').del();

  const hash = await bcrypt.hash('password123', 12);

  const [org1, org2] = await knex('organizations').insert([
    { name: 'Clinique du Plateau', address: 'Plateau, Abidjan', phone: '+225 27 20 31 00 00' },
    { name: 'Cabinet Médical Cocody', address: 'Cocody, Abidjan', phone: '+225 27 22 44 00 00' },
  ]).returning(['id', 'name']);

  const [doctor1, secretary1, patient1User] = await knex('users').insert([
    { organization_id: org1.id, email: 'aminata@clinique-plateau.ci', password_hash: hash, first_name: 'Aminata', last_name: 'Koné', role: 'doctor' },
    { organization_id: org1.id, email: 'rana@clinique-plateau.ci', password_hash: hash, first_name: 'Rana', last_name: 'Touré', role: 'secretary' },
    { organization_id: org1.id, email: 'karim@email.ci', password_hash: hash, first_name: 'Karim', last_name: 'Meïté', role: 'patient' },
  ]).returning(['id', 'email', 'role']);

  await knex('users').insert([
    { organization_id: org2.id, email: 'admin@cabinet-cocody.ci', password_hash: hash, first_name: 'Diallo', last_name: 'Moussa', role: 'admin' },
    { organization_id: org2.id, email: 'doctor@cabinet-cocody.ci', password_hash: hash, first_name: 'Aïcha', last_name: 'Bamba', role: 'doctor' },
  ]);

  const [p1, p2] = await knex('patients').insert([
    { organization_id: org1.id, first_name: 'Karim', last_name: 'Meïté', date_of_birth: '1995-04-10', phone: '+225 07 08 09 10 11', email: 'karim@email.ci', blood_type: 'O+', user_id: patient1User.id },
    { organization_id: org1.id, first_name: 'Fatou', last_name: 'Koné', date_of_birth: '1985-07-22', phone: '+225 05 06 07 08 09', blood_type: 'A+', allergies: 'Pénicilline' },
    { organization_id: org1.id, first_name: 'Ousmane', last_name: 'Diallo', date_of_birth: '1978-02-14', phone: '+225 01 02 03 04 05', blood_type: 'B+' },
    { organization_id: org2.id, first_name: 'Joud', last_name: 'Salloum', date_of_birth: '1992-11-10', phone: '+225 09 08 07 06 05', blood_type: 'B+' },
  ]).returning(['id']);

  const today = new Date().toISOString().slice(0, 10);
  await knex('appointments').insert([
    { organization_id: org1.id, patient_id: p1.id, doctor_id: doctor1.id, scheduled_at: `${today}T09:00:00`, status: 'confirmed', reason: 'Consultation générale' },
    { organization_id: org1.id, patient_id: p2.id, doctor_id: doctor1.id, scheduled_at: `${today}T10:30:00`, status: 'pending', reason: 'Douleurs abdominales' },
    { organization_id: org1.id, patient_id: p1.id, doctor_id: doctor1.id, scheduled_at: `${today}T14:00:00`, status: 'pending', reason: 'Suivi tension artérielle' },
  ]);
};
