exports.up = function (knex) {
  return knex.schema.createTable('prescriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('consultation_id').notNullable().references('id').inTable('consultations').onDelete('RESTRICT');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.jsonb('medications').notNullable();
    t.text('notes');
    t.timestamps(true, true);
    t.index('organization_id');
    t.index('patient_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('prescriptions');
};
