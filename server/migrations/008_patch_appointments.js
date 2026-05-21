exports.up = async function (knex) {
  await knex.schema.table('appointments', (t) => {
    t.string('notes', 1000).nullable();
  });

  // Replace CHECK constraint to add 'in-room' status
  await knex.raw(`
    ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_status_check;
  `);
  await knex.raw(`
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending', 'confirmed', 'in-room', 'cancelled', 'completed'));
  `);
};

exports.down = async function (knex) {
  await knex.schema.table('appointments', (t) => {
    t.dropColumn('notes');
  });
  await knex.raw(`
    ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_status_check;
  `);
  await knex.raw(`
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));
  `);
};
