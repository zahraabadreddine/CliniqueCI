exports.up = function (knex) {
  return knex.schema.createTable('patients', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('first_name', 50).notNullable();
    t.string('last_name', 50).notNullable();
    t.date('date_of_birth').notNullable();
    t.string('phone', 20);
    t.string('email', 100);
    t.string('address', 200);
    t.string('blood_type', 5);
    t.text('allergies');
    t.timestamps(true, true);
    t.index('organization_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('patients');
};
