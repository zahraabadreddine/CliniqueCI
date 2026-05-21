exports.up = function (knex) {
  return knex.schema.createTable('consultations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('appointment_id').notNullable().references('id').inTable('appointments').onDelete('RESTRICT');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('chief_complaint', 500).notNullable();
    t.text('examination');
    t.string('diagnosis', 1000).notNullable();
    t.text('notes');
    t.timestamps(true, true);
    t.index('organization_id');
    t.index('patient_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('consultations');
};
