const { Pool } = require('pg');

let pool;

// Pool creado bajo demanda (permite a los tests definir DATABASE_URL antes de la primera consulta).
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquante');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: Number(process.env.PG_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => console.error('Erreur sur une connexion inactive :', err.message));
  }
  return pool;
}

// Siempre consultas parametrizadas: query('... WHERE id = $1', [id])
const query = (text, params) => getPool().query(text, params);

async function close() {
  if (pool) {
    const p = pool;
    pool = undefined;
    await p.end();
  }
}

module.exports = { query, getPool, close };
