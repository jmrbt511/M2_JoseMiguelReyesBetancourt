const HttpError = require('./utils/httpError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INT = 2147483647;

const isBlank = (v) => typeof v !== 'string' || v.trim() === '';

function fail(errors) {
  throw new HttpError(400, 'Validation échouée', errors);
}

// Identificador de la URL: entero estrictamente positivo (si no, 400)
function parseId(raw, label = 'id') {
  if (!/^\d+$/.test(String(raw))) fail([{ field: label, message: `${label} doit être un entier positif` }]);
  const n = Number(raw);
  if (n < 1 || n > MAX_INT) fail([{ field: label, message: `${label} hors limites` }]);
  return n;
}

// Clave foránea recibida en el cuerpo de la petición
function checkAuthorId(value, errors) {
  if (value === undefined || value === null || value === '') {
    errors.push({ field: 'author_id', message: 'author_id est requis' });
    return null;
  }
  const ok = (typeof value === 'number' && Number.isInteger(value)) || /^\d+$/.test(String(value));
  const n = Number(value);
  if (!ok || n < 1 || n > MAX_INT) {
    errors.push({ field: 'author_id', message: 'author_id doit être un entier positif' });
    return null;
  }
  return n;
}

function validateAuthor(body = {}) {
  const errors = [];
  const { name, email, bio } = body;

  if (isBlank(name)) errors.push({ field: 'name', message: 'name est requis et ne peut pas être vide' });
  else if (name.trim().length > 100) errors.push({ field: 'name', message: 'name: 100 caractères maximum' });

  if (isBlank(email)) errors.push({ field: 'email', message: 'email est requis' });
  else if (email.trim().length > 255 || !EMAIL_RE.test(email.trim()))
    errors.push({ field: 'email', message: 'email invalide' });

  if (bio !== undefined && bio !== null && typeof bio !== 'string')
    errors.push({ field: 'bio', message: 'bio doit être une chaîne de caractères' });

  if (errors.length) fail(errors);
  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    bio: typeof bio === 'string' && bio.trim() !== '' ? bio.trim() : null,
  };
}

function validatePost(body = {}, { creating = false } = {}) {
  const errors = [];
  const { title, content, published } = body;

  if (isBlank(title)) errors.push({ field: 'title', message: 'title est requis et ne peut pas être vide' });
  else if (title.trim().length > 255) errors.push({ field: 'title', message: 'title: 255 caractères maximum' });

  if (isBlank(content)) errors.push({ field: 'content', message: 'content est requis et ne peut pas être vide' });

  if (published !== undefined && typeof published !== 'boolean')
    errors.push({ field: 'published', message: 'published doit être un booléen' });

  let author_id;
  if (creating) author_id = checkAuthorId(body.author_id, errors);

  if (errors.length) fail(errors);
  return {
    title: title.trim(),
    content: content.trim(),
    published: published === undefined ? undefined : published,
    author_id,
  };
}

function validateComment(body = {}) {
  const errors = [];
  if (isBlank(body.content)) errors.push({ field: 'content', message: 'content est requis et ne peut pas être vide' });
  const author_id = checkAuthorId(body.author_id, errors);
  if (errors.length) fail(errors);
  return { content: body.content.trim(), author_id };
}

function parsePublishedFilter(raw) {
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fail([{ field: 'published', message: "published doit valoir 'true' ou 'false'" }]);
}

module.exports = { parseId, validateAuthor, validatePost, validateComment, parsePublishedFilter };
