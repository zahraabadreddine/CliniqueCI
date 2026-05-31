exports.up = function (knex) {
  return knex.schema.createTable('whatsapp_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('appointment_id').nullable().references('id').inTable('appointments').onDelete('SET NULL');
    t.uuid('patient_id').nullable().references('id').inTable('patients').onDelete('SET NULL');
    t.string('to_phone', 30).notNullable();
    t.string('template', 60).notNullable();     // rdv_confirmation | rdv_rappel_j1 | rdv_rappel_h2 | rdv_annule
    t.string('status', 20).notNullable().defaultTo('pending'); // pending | sent | failed | simulated
    t.string('wa_message_id', 100).nullable();  // ID retourné par Meta
    t.text('error_message').nullable();
    t.timestamps(true, true);
    t.index('organization_id');
    t.index('appointment_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('whatsapp_logs');
};
