/**
 * Migration 012 — P0 Security Foundations
 * 1. Add is_active to users (soft-suspend)
 * 2. Create audit_logs (INSERT-ONLY, multi-tenant compliance log)
 */

exports.up = async function (knex) {
  // 1. is_active on users (default TRUE — no disruption to existing accounts)
  await knex.schema.alterTable('users', (t) => {
    t.boolean('is_active').notNullable().defaultTo(true);
  });

  // 2. audit_logs
  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 80).notNullable();          // e.g. USER_CREATED, USER_SUSPENDED
    t.string('target_type', 50).nullable();         // e.g. user, appointment, invoice
    t.uuid('target_id').nullable();
    t.string('ip_address', 45).nullable();
    t.jsonb('details').nullable();                  // extra context (never PII / medical data)
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    // No updated_at — audit logs are immutable

    t.index('organization_id');
    t.index('actor_id');
    t.index('action');
    t.index('created_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('is_active');
  });
};
