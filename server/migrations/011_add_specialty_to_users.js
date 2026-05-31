exports.up = function (knex) {
  return knex.schema.alterTable('users', (t) => {
    t.string('specialty', 100).nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (t) => {
    t.dropColumn('specialty');
  });
};
