const app = require('./app');
const db = require('./lib/db');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Run migrations automatically on every startup
    await db.migrate.latest();
    console.log('[DB] Migrations OK');

    // Seed only if the database is empty (no organizations yet)
    const result = await db('organizations').count('id as count').first();
    if (parseInt(result.count, 10) === 0) {
      await db.seed.run();
      console.log('[DB] Seeds OK');
    } else {
      console.log('[DB] Data already present — skipping seeds');
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('[DB] Startup error:', err.message);
    process.exit(1);
  }
}

start();
