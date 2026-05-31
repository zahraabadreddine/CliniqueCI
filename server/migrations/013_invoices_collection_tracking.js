/**
 * 013_invoices_collection_tracking
 *
 * Adds a two-step billing workflow:
 *   pending → collected (secretary encashes, saves collected_by_id)
 *           → paid      (admin validates, saves validated_by_id)
 *
 * Also keeps backward-compat: existing 'paid' rows are untouched.
 */
exports.up = async function (knex) {
  // 1. Extend the status CHECK to include 'collected'
  await knex.raw(`ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check`);
  await knex.raw(`
    ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('pending', 'collected', 'paid', 'cancelled'))
  `);

  // 2. New columns
  await knex.schema.table('invoices', (t) => {
    t.uuid('collected_by_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    t.uuid('validated_by_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    t.timestamp('collected_at').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.table('invoices', (t) => {
    t.dropColumn('collected_by_id');
    t.dropColumn('validated_by_id');
    t.dropColumn('collected_at');
  });

  await knex.raw(`ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check`);
  await knex.raw(`
    ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('pending', 'paid', 'cancelled'))
  `);
};
