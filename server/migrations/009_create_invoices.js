exports.up = async function (knex) {
  await knex.schema.createTable('invoices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('consultation_id').nullable().references('id').inTable('consultations').onDelete('SET NULL');
    t.uuid('appointment_id').nullable().references('id').inTable('appointments').onDelete('SET NULL');
    t.decimal('amount', 12, 0).notNullable();
    t.string('currency', 5).notNullable().defaultTo('XOF');
    t.string('status', 20).notNullable().defaultTo('pending');
    t.string('payment_method', 30).nullable();
    t.string('notes', 1000).nullable();
    t.timestamp('paid_at').nullable();
    t.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('pending', 'paid', 'cancelled'));
  `);

  await knex.raw(`
    ALTER TABLE invoices ADD CONSTRAINT invoices_payment_method_check
    CHECK (payment_method IN ('cash', 'orange_money', 'wave', 'mtn_money', 'moov_money'));
  `);

  await knex.schema.table('invoices', (t) => {
    t.index('organization_id');
    t.index('patient_id');
    t.index('status');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('invoices');
};
