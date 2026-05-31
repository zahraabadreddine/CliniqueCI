/**
 * Migration 018 — New Features
 * 2. QR token on prescriptions
 * 3. Record share requests (inter-clinics)
 * 5. Stock items + movements
 * 7. SMS reminders
 * 8. Queue tokens (digital waiting room)
 * 19. Consent forms + signatures
 */

exports.up = async function (knex) {
  // ── Feature 2: QR token on prescriptions ──────────────────────────────
  await knex.schema.alterTable('prescriptions', (t) => {
    t.uuid('qr_token').nullable();
    t.index('qr_token');
  });

  // ── Feature 7: SMS reminders ───────────────────────────────────────────
  await knex.schema.createTable('sms_reminders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('appointment_id').notNullable().references('id').inTable('appointments').onDelete('CASCADE');
    t.string('phone', 20).notNullable();
    t.string('status', 20).notNullable().defaultTo('pending');   // pending|sent|failed
    t.string('type', 30).notNullable().defaultTo('reminder_48h'); // reminder_48h|reminder_2h|confirmation
    t.text('message').notNullable();
    t.timestamp('scheduled_at').notNullable();
    t.timestamp('sent_at').nullable();
    t.timestamps(true, true);
    t.index('organization_id');
    t.index('appointment_id');
    t.index(['status', 'scheduled_at']);
  });

  // ── Feature 8: Queue tokens ────────────────────────────────────────────
  await knex.schema.createTable('queue_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.integer('number').notNullable();
    t.string('patient_name', 100).nullable();
    t.string('reason', 200).nullable();
    t.string('status', 20).notNullable().defaultTo('waiting'); // waiting|called|done|cancelled
    t.date('date').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.index('organization_id');
    t.index(['organization_id', 'date']);
  });

  // ── Feature 5: Stock ───────────────────────────────────────────────────
  await knex.schema.createTable('stock_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    t.string('category', 50).notNullable().defaultTo('medicament'); // medicament|materiel|consommable
    t.string('unit', 30).notNullable().defaultTo('unité');
    t.integer('quantity').notNullable().defaultTo(0);
    t.integer('min_quantity').notNullable().defaultTo(5);
    t.decimal('unit_price', 12, 0).nullable();
    t.string('supplier', 100).nullable();
    t.timestamps(true, true);
    t.index('organization_id');
  });

  await knex.schema.createTable('stock_movements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('stock_item_id').notNullable().references('id').inTable('stock_items').onDelete('CASCADE');
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('type', 20).notNullable(); // in|out|adjustment
    t.integer('quantity').notNullable();
    t.text('reason').nullable();
    t.timestamps(true, true);
    t.index('organization_id');
    t.index('stock_item_id');
  });

  // ── Feature 19: Consent forms ──────────────────────────────────────────
  await knex.schema.createTable('consent_forms', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.string('title', 200).notNullable();
    t.text('content').notNullable();
    t.string('category', 50).notNullable().defaultTo('general'); // general|operation|anesthesia|data
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index('organization_id');
  });

  await knex.schema.createTable('consent_signatures', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('consent_form_id').notNullable().references('id').inTable('consent_forms').onDelete('CASCADE');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('CASCADE');
    t.uuid('collected_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('signature_data').nullable();
    t.boolean('signed').notNullable().defaultTo(false);
    t.timestamp('signed_at').nullable();
    t.timestamps(true, true);
    t.index('organization_id');
    t.index('patient_id');
    t.index('consent_form_id');
  });

  // ── Feature 3: Record share requests ──────────────────────────────────
  await knex.schema.createTable('record_share_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('requesting_org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('source_org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('CASCADE');
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('status', 20).notNullable().defaultTo('pending'); // pending|approved|denied|expired
    t.string('reason', 300).nullable();
    t.string('patient_consent_code', 20).nullable();
    t.timestamp('expires_at').nullable();
    t.timestamps(true, true);
    t.index('requesting_org_id');
    t.index('source_org_id');
    t.index('patient_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('record_share_requests');
  await knex.schema.dropTableIfExists('consent_signatures');
  await knex.schema.dropTableIfExists('consent_forms');
  await knex.schema.dropTableIfExists('stock_movements');
  await knex.schema.dropTableIfExists('stock_items');
  await knex.schema.dropTableIfExists('queue_tokens');
  await knex.schema.dropTableIfExists('sms_reminders');
  await knex.schema.alterTable('prescriptions', (t) => {
    t.dropColumn('qr_token');
  });
};
