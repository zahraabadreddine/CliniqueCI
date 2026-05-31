/**
 * Prevent double-booking: two non-cancelled appointments cannot share
 * the same doctor and the exact same scheduled_at timestamp.
 *
 * Using a partial unique index (PostgreSQL) so that cancelled appointments
 * are excluded — it's perfectly fine to re-book a cancelled slot.
 */
exports.up = function (knex) {
  return knex.schema.raw(`
    CREATE UNIQUE INDEX appointments_doctor_slot_unique
    ON appointments (doctor_id, scheduled_at)
    WHERE status NOT IN ('cancelled')
  `);
};

exports.down = function (knex) {
  return knex.schema.raw('DROP INDEX IF EXISTS appointments_doctor_slot_unique');
};
