// Crea las tablas (y, con --seed, inserta datos de demostración).
//   npm run db:init     → solo el esquema
//   npm run db:seed     → esquema + seed
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'db', file), 'utf8');

(async () => {
  try {
    await db.query(read('schema.sql'));
    console.log('Schéma appliqué.');
    if (process.argv.includes('--seed')) {
      await db.query(read('seed.sql'));
      console.log('Données de démonstration insérées.');
    }
  } catch (err) {
    console.error('Échec de l\'initialisation :', err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
})();
