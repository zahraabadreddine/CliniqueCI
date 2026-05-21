exports.up = function (knex) {
  return knex.schema.createTable('organizations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 100).notNullable();
    t.string('address', 200);
    t.string('phone', 20);
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('organizations');
};
