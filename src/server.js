const app = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 3000;

async function start() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL manquante (voir .env.example)');
    process.exit(1);
  }
  try {
    await db.query('SELECT 1');
  } catch (err) {
    console.error('Impossible de se connecter à PostgreSQL :', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => console.log(`API démarrée sur le port ${PORT}`));

  const shutdown = () => server.close(async () => { await db.close(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
