exports.up = function (knex) {
  return knex.schema.createTable('push_subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    t.uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    t.text('endpoint').notNullable();
    t.jsonb('keys').notNullable(); // { p256dh, auth }
    t.timestamps(true, true);
    t.index('user_id');
    t.index('organization_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('push_subscriptions');
};
