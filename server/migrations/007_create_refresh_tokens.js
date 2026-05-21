exports.up = function (knex) {
  return knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token', 36).notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('token');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('refresh_tokens');
};
