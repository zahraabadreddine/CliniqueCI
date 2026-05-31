/**
 * Ajoute retry_count sur sms_reminders
 * Utilisé par le cron pour l'auto-retry des SMS failed (max 3 tentatives)
 */
exports.up = function (knex) {
  return knex.schema.alterTable('sms_reminders', (t) => {
    t.integer('retry_count').notNullable().defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('sms_reminders', (t) => {
    t.dropColumn('retry_count');
  });
};
