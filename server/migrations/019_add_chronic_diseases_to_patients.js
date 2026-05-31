exports.up = function (knex) {
  return knex.schema.table('patients', (t) => {
    t.text('chronic_diseases').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('patients', (t) => {
    t.dropColumn('chronic_diseases');
  });
};
