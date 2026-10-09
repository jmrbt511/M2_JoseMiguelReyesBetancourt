const { query } = require('../db');
const HttpError = require('../utils/httpError');
const authors = require('./authors');

const SELECT = `
  SELECT p.id, p.title, p.content, p.published, p.created_at, p.author_id,
         json_build_object('id', a.id, 'name', a.name, 'email', a.email, 'bio', a.bio) AS author
  FROM posts p
  JOIN authors a ON a.id = p.author_id`;

async function list({ published } = {}) {
  if (published === undefined) {
    return (await query(`${SELECT} ORDER BY p.created_at DESC, p.id DESC`)).rows;
  }
  return (await query(`${SELECT} WHERE p.published = $1 ORDER BY p.created_at DESC, p.id DESC`, [published])).rows;
}

async function getById(id) {
  const { rows } = await query(`${SELECT} WHERE p.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Article introuvable');
  return rows[0];
}

async function exists(id) {
  const { rowCount } = await query('SELECT 1 FROM posts WHERE id = $1', [id]);
  return rowCount > 0;
}

// Artículos de un autor, cada uno con los detalles del autor
async function listByAuthor(authorId) {
  if (!(await authors.exists(authorId))) throw new HttpError(404, 'Auteur introuvable');
  const { rows } = await query(`${SELECT} WHERE p.author_id = $1 ORDER BY p.created_at DESC, p.id DESC`, [authorId]);
  return rows;
}

async function create({ author_id, title, content, published }) {
  if (!(await authors.exists(author_id))) {
    throw new HttpError(400, 'Validation échouée', [{ field: 'author_id', message: 'Auteur introuvable' }]);
  }
  const { rows } = await query(
    'INSERT INTO posts (author_id, title, content, published) VALUES ($1, $2, $3, COALESCE($4, FALSE)) RETURNING id',
    [author_id, title, content, published]
  );
  return getById(rows[0].id);
}

async function update(id, { title, content, published }) {
  const { rows } = await query(
    'UPDATE posts SET title = $1, content = $2, published = COALESCE($3, published) WHERE id = $4 RETURNING id',
    [title, content, published, id]
  );
  if (!rows[0]) throw new HttpError(404, 'Article introuvable');
  return getById(id);
}

// Los comentarios del artículo se eliminan en cascada
async function remove(id) {
  const { rowCount } = await query('DELETE FROM posts WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Article introuvable');
}

module.exports = { list, getById, exists, listByAuthor, create, update, remove };
