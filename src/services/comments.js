const { query } = require('../db');
const HttpError = require('../utils/httpError');
const authors = require('./authors');
const posts = require('./posts');

// LEFT JOIN: un comentario cuyo autor fue eliminado sigue siendo visible (author = null)
const SELECT = `
  SELECT c.id, c.post_id, c.author_id, c.content, c.created_at,
         CASE WHEN a.id IS NULL THEN NULL
              ELSE json_build_object('id', a.id, 'name', a.name) END AS author
  FROM comments c
  LEFT JOIN authors a ON a.id = c.author_id`;

async function getById(id) {
  const { rows } = await query(`${SELECT} WHERE c.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Commentaire introuvable');
  return rows[0];
}

async function listByPost(postId) {
  if (!(await posts.exists(postId))) throw new HttpError(404, 'Article introuvable');
  const { rows } = await query(`${SELECT} WHERE c.post_id = $1 ORDER BY c.created_at ASC, c.id ASC`, [postId]);
  return rows;
}

async function create(postId, { author_id, content }) {
  if (!(await posts.exists(postId))) throw new HttpError(404, 'Article introuvable');
  if (!(await authors.exists(author_id))) {
    throw new HttpError(400, 'Validation échouée', [{ field: 'author_id', message: 'Auteur introuvable' }]);
  }
  const { rows } = await query(
    'INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING id',
    [postId, author_id, content]
  );
  return getById(rows[0].id);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM comments WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Commentaire introuvable');
}

module.exports = { getById, listByPost, create, remove };
