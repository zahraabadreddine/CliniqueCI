exports.up = function (knex) {
  return knex.schema.createTable('appointments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamp('scheduled_at').notNullable();
    t.string('status', 20).notNullable().defaultTo('pending')
      .checkIn(['pending', 'confirmed', 'cancelled', 'completed']);
    t.string('reason', 500);
    t.timestamps(true, true);
    t.index('organization_id');
    t.index(['organization_id', 'doctor_id']);
    t.index(['organization_id', 'scheduled_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('appointments');
};
