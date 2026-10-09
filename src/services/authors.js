const { query } = require('../db');
const HttpError = require('../utils/httpError');

const COLUMNS = 'id, name, email, bio, created_at';

async function list() {
  const { rows } = await query(`SELECT ${COLUMNS} FROM authors ORDER BY id`);
  return rows;
}

async function getById(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM authors WHERE id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Auteur introuvable');
  return rows[0];
}

async function exists(id) {
  const { rowCount } = await query('SELECT 1 FROM authors WHERE id = $1', [id]);
  return rowCount > 0;
}

// La unicidad del e-mail la garantiza la restricción UNIQUE (error 23505 → 409 mediante el middleware)
async function create({ name, email, bio }) {
  const { rows } = await query(
    `INSERT INTO authors (name, email, bio) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [name, email, bio]
  );
  return rows[0];
}

async function update(id, { name, email, bio }) {
  const { rows } = await query(
    `UPDATE authors SET name = $1, email = $2, bio = $3 WHERE id = $4 RETURNING ${COLUMNS}`,
    [name, email, bio, id]
  );
  if (!rows[0]) throw new HttpError(404, 'Auteur introuvable');
  return rows[0];
}

// Los artículos del autor se eliminan en cascada; sus comentarios conservan su texto (author_id → NULL)
async function remove(id) {
  const { rowCount } = await query('DELETE FROM authors WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Auteur introuvable');
}

module.exports = { list, getById, exists, create, update, remove };
