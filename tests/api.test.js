// Tests de integración: servidor Express real + base de datos PostgreSQL EXCLUSIVA para tests.
// ATENCIÓN: las tablas authors/posts/comments de TEST_DATABASE_URL se eliminan y se vuelven a crear.
require('dotenv').config();
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

if (!process.env.TEST_DATABASE_URL) {
  console.error('TEST_DATABASE_URL es obligatoria (base de datos exclusiva para tests, ver .env.example).');
  process.exit(1);
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const db = require('../src/db');

let server;
let base;

async function api(method, url, body, rawBody) {
  const hasBody = body !== undefined || rawBody !== undefined;
  const res = await fetch(base + url, {
    method,
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* cuerpo que no es JSON */ }
  return { status: res.status, body: json, headers: res.headers };
}

const ids = {};

before(async () => {
  await db.query('DROP TABLE IF EXISTS comments, posts, authors CASCADE');
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.close();
});

describe('Autores', () => {
  it('POST /authors → 201 y crea el autor', async () => {
    const r = await api('POST', '/authors', { name: 'Alice', email: 'Alice@Example.com', bio: 'Bio' });
    assert.equal(r.status, 201);
    assert.equal(r.body.name, 'Alice');
    assert.equal(r.body.email, 'alice@example.com'); // normalizado a minúsculas
    assert.ok(r.body.id && r.body.created_at);
    assert.equal(r.headers.get('location'), `/authors/${r.body.id}`);
    ids.alice = r.body.id;
  });

  it('POST /authors con nombre vacío → 400', async () => {
    const r = await api('POST', '/authors', { name: '   ', email: 'x@example.com' });
    assert.equal(r.status, 400);
    assert.ok(r.body.details.some((d) => d.field === 'name'));
  });

  it('POST /authors sin e-mail o con e-mail inválido → 400', async () => {
    assert.equal((await api('POST', '/authors', { name: 'Bob' })).status, 400);
    assert.equal((await api('POST', '/authors', { name: 'Bob', email: 'pas-un-email' })).status, 400);
  });

  it('POST /authors con un e-mail ya usado → 409 (sin distinguir mayúsculas)', async () => {
    const r = await api('POST', '/authors', { name: 'Autre', email: 'ALICE@example.com' });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /e-mail/);
  });

  it('GET /authors → 200 y lista los autores', async () => {
    const r = await api('GET', '/authors');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body));
    assert.ok(r.body.some((a) => a.id === ids.alice));
  });

  it('GET /authors/:id → 200', async () => {
    const r = await api('GET', `/authors/${ids.alice}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.email, 'alice@example.com');
  });

  it('GET /authors/:id inexistente → 404, id inválido → 400', async () => {
    assert.equal((await api('GET', '/authors/999999')).status, 404);
    assert.equal((await api('GET', '/authors/abc')).status, 400);
  });

  it('PUT /authors/:id → 200 y actualiza', async () => {
    const r = await api('PUT', `/authors/${ids.alice}`, { name: 'Alice M.', email: 'alice@example.com', bio: 'Nouvelle bio' });
    assert.equal(r.status, 200);
    assert.equal(r.body.name, 'Alice M.');
    assert.equal(r.body.bio, 'Nouvelle bio');
  });

  it('PUT /authors/:id con el e-mail de otro autor → 409', async () => {
    const b = await api('POST', '/authors', { name: 'Bruno', email: 'bruno@example.com' });
    assert.equal(b.status, 201);
    ids.bruno = b.body.id;
    const r = await api('PUT', `/authors/${ids.bruno}`, { name: 'Bruno', email: 'alice@example.com' });
    assert.equal(r.status, 409);
  });

  it('PUT /authors/:id inexistente → 404 ; nombre vacío → 400', async () => {
    assert.equal((await api('PUT', '/authors/999999', { name: 'X', email: 'x@example.com' })).status, 404);
    assert.equal((await api('PUT', `/authors/${ids.alice}`, { name: '', email: 'alice@example.com' })).status, 400);
  });
});

describe('Artículos', () => {
  it('POST /posts → 201 con los detalles del autor, published=false por defecto', async () => {
    const r = await api('POST', '/posts', { author_id: ids.alice, title: 'Mon premier article', content: 'Contenu' });
    assert.equal(r.status, 201);
    assert.equal(r.body.title, 'Mon premier article');
    assert.equal(r.body.published, false);
    assert.equal(r.body.author.id, ids.alice);
    assert.equal(r.body.author.name, 'Alice M.');
    ids.post = r.body.id;
  });

  it('POST /posts sin título, contenido o author_id → 400', async () => {
    assert.equal((await api('POST', '/posts', { author_id: ids.alice, title: '', content: 'x' })).status, 400);
    assert.equal((await api('POST', '/posts', { author_id: ids.alice, title: 'T', content: '  ' })).status, 400);
    const r = await api('POST', '/posts', { title: 'T', content: 'x' });
    assert.equal(r.status, 400);
    assert.ok(r.body.details.some((d) => d.field === 'author_id'));
  });

  it('POST /posts con un author_id inexistente → 400', async () => {
    const r = await api('POST', '/posts', { author_id: 999999, title: 'T', content: 'x' });
    assert.equal(r.status, 400);
  });

  it('GET /posts → 200 ; filtro ?published=', async () => {
    const all = await api('GET', '/posts');
    assert.equal(all.status, 200);
    assert.ok(all.body.some((p) => p.id === ids.post));
    const published = await api('GET', '/posts?published=true');
    assert.equal(published.status, 200);
    assert.ok(!published.body.some((p) => p.id === ids.post));
    assert.equal((await api('GET', '/posts?published=peut-etre')).status, 400);
  });

  it('GET /posts/:id → 200 ; inexistente → 404', async () => {
    const r = await api('GET', `/posts/${ids.post}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.author.email, 'alice@example.com');
    assert.equal((await api('GET', '/posts/999999')).status, 404);
  });

  it('PUT /posts/:id → 200 ; título vacío → 400 ; inexistente → 404', async () => {
    const r = await api('PUT', `/posts/${ids.post}`, { title: 'Titre modifié', content: 'Nouveau contenu', published: true });
    assert.equal(r.status, 200);
    assert.equal(r.body.title, 'Titre modifié');
    assert.equal(r.body.published, true);
    assert.equal((await api('PUT', `/posts/${ids.post}`, { title: '', content: 'x' })).status, 400);
    assert.equal((await api('PUT', '/posts/999999', { title: 'T', content: 'x' })).status, 404);
  });

  it('GET /posts/author/:authorId → 200, artículos con los detalles del autor', async () => {
    const r = await api('GET', `/posts/author/${ids.alice}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 1);
    assert.equal(r.body[0].id, ids.post);
    assert.equal(r.body[0].author.name, 'Alice M.');
    // autor sin artículos → lista vacía
    const empty = await api('GET', `/posts/author/${ids.bruno}`);
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body, []);
  });

  it('GET /posts/author/:authorId inexistente → 404, inválido → 400', async () => {
    assert.equal((await api('GET', '/posts/author/999999')).status, 404);
    assert.equal((await api('GET', '/posts/author/abc')).status, 400);
  });
});

describe('Comentarios', () => {
  it('POST /posts/:postId/comments → 201', async () => {
    const r = await api('POST', `/posts/${ids.post}/comments`, { author_id: ids.bruno, content: 'Super article !' });
    assert.equal(r.status, 201);
    assert.equal(r.body.post_id, ids.post);
    assert.equal(r.body.author.name, 'Bruno');
    ids.comment = r.body.id;
  });

  it('POST comentario vacío o sin author_id → 400 ; autor desconocido → 400', async () => {
    assert.equal((await api('POST', `/posts/${ids.post}/comments`, { author_id: ids.bruno, content: ' ' })).status, 400);
    assert.equal((await api('POST', `/posts/${ids.post}/comments`, { content: 'x' })).status, 400);
    assert.equal((await api('POST', `/posts/${ids.post}/comments`, { author_id: 999999, content: 'x' })).status, 400);
  });

  it('POST comentario en un artículo inexistente → 404', async () => {
    const r = await api('POST', '/posts/999999/comments', { author_id: ids.bruno, content: 'x' });
    assert.equal(r.status, 404);
  });

  it('GET /posts/:postId/comments → 200 ; artículo inexistente → 404', async () => {
    const r = await api('GET', `/posts/${ids.post}/comments`);
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 1);
    assert.equal((await api('GET', '/posts/999999/comments')).status, 404);
  });

  it('DELETE /comments/:id → 204 y luego 404', async () => {
    assert.equal((await api('DELETE', `/comments/${ids.comment}`)).status, 204);
    assert.equal((await api('DELETE', `/comments/${ids.comment}`)).status, 404);
  });
});

describe('Eliminaciones e integridad referencial', () => {
  it('eliminar un autor elimina sus artículos (CASCADE) y anonimiza sus comentarios (SET NULL)', async () => {
    const post2 = await api('POST', '/posts', { author_id: ids.bruno, title: 'Article de Bruno', content: 'x' });
    const c = await api('POST', `/posts/${ids.post}/comments`, { author_id: ids.bruno, content: 'Commentaire de Bruno' });
    assert.equal(c.status, 201);

    assert.equal((await api('DELETE', `/authors/${ids.bruno}`)).status, 204);

    assert.equal((await api('GET', `/posts/${post2.body.id}`)).status, 404); // artículo eliminado
    const comments = await api('GET', `/posts/${ids.post}/comments`);
    assert.equal(comments.body.length, 1); // comentario conservado…
    assert.equal(comments.body[0].author_id, null); // …sin autor
    assert.equal(comments.body[0].author, null);
  });

  it('DELETE /posts/:id → 204 y elimina sus comentarios (CASCADE)', async () => {
    assert.equal((await api('DELETE', `/posts/${ids.post}`)).status, 204);
    assert.equal((await api('GET', `/posts/${ids.post}`)).status, 404);
    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM comments WHERE post_id = $1', [ids.post]);
    assert.equal(rows[0].n, 0);
    assert.equal((await api('DELETE', `/posts/${ids.post}`)).status, 404);
  });

  it('DELETE /authors/:id → 204 y luego 404', async () => {
    assert.equal((await api('DELETE', `/authors/${ids.alice}`)).status, 204);
    assert.equal((await api('DELETE', `/authors/${ids.alice}`)).status, 404);
  });
});

describe('Gestión global de errores', () => {
  it('JSON inválido → 400', async () => {
    const r = await api('POST', '/authors', undefined, '{"name": ');
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'JSON invalide');
  });

  it('ruta desconocida → 404', async () => {
    const r = await api('GET', '/nimporte-quoi');
    assert.equal(r.status, 404);
  });

  it('GET /health → 200 cuando la base de datos responde', async () => {
    const r = await api('GET', '/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.database, 'up');
  });
});
