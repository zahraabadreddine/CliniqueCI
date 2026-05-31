exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_status_check;
  `);
  await knex.raw(`
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending', 'confirmed', 'waiting', 'in-room', 'completed', 'cancelled'));
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_status_check;
  `);
  await knex.raw(`
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending', 'confirmed', 'in-room', 'completed', 'cancelled'));
  `);
};
