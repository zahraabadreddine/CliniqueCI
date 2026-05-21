exports.up = function (knex) {
  return knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.string('email', 100).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('first_name', 50).notNullable();
    t.string('last_name', 50).notNullable();
    t.string('role', 20).notNullable().checkIn(['admin', 'doctor', 'secretary', 'patient']);
    t.timestamps(true, true);
    t.index('organization_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
