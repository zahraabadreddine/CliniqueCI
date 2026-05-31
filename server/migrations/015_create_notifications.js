exports.up = function (knex) {
  return knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    // type: new_appointment | appointment_confirmed | appointment_cancelled |
    //       patient_arrived | patient_in_room | appointment_completed | invoice_paid | system
    t.string('type', 60).notNullable();
    t.string('title', 200).notNullable();
    t.text('body').notNullable();
    t.string('link', 300).nullable();   // optional frontend route to navigate to on click
    t.boolean('is_read').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index('organization_id');
    t.index('user_id');
    t.index(['user_id', 'is_read']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('notifications');
};
