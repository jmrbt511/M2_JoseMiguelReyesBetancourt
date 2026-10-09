# Mini Blog API (Express + PostgreSQL)

API REST para un mini blog: **autores**, **artículos** y **comentarios**.
Relación 1:N autores → artículos, y artículos → comentarios.

## Arquitectura

```
src/
  app.js                 Aplicación Express (middlewares, montaje de rutas)
  server.js              Arranque, verificación de la base de datos, cierre limpio
  db.js                  Pool de conexiones PostgreSQL (pg.Pool) + query() parametrizada
  validators.js          Validación de entradas (400)
  routes/                Solo capa HTTP (authors, posts, comments)
  services/              Lógica de negocio + consultas SQL parametrizadas
  middlewares/           Gestión global de errores (404, 400, 409, 500…)
db/schema.sql            Tablas, claves primarias/foráneas, restricciones, índices
db/seed.sql              Datos de demostración (re-ejecutable)
scripts/init-db.js       Aplica el esquema (+ seed con --seed)
docs/openapi.yaml        Especificación OpenAPI 3
tests/api.test.js        29 tests de integración (node:test)
```

## Instalación local

Requisitos: Node.js 18+ y PostgreSQL.

```bash
npm install
cp .env.example .env          # luego adapta DATABASE_URL (y TEST_DATABASE_URL)
createdb mini_blog            # o desde pgAdmin / psql
npm run db:seed               # crea las tablas + datos de demostración (db:init = sin datos)
npm run dev                   # o: npm start   → http://localhost:3000
```

Variables de entorno (ver `.env.example`): `PORT`, `DATABASE_URL`, `DATABASE_SSL`, `PG_POOL_MAX`, `TEST_DATABASE_URL`.

## Documentación

- Interfaz Swagger: `GET /docs`
- Especificación: `docs/openapi.yaml` (también servida en `GET /openapi.yaml`)

## Endpoints

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | /authors | Listar los autores | 200 |
| GET | /authors/:id | Detalles de un autor | 200, 400, 404 |
| POST | /authors | Crear un autor (`name`, `email`, `bio?`) | 201, 400, 409 |
| PUT | /authors/:id | Actualizar un autor | 200, 400, 404, 409 |
| DELETE | /authors/:id | Eliminar un autor | 204, 400, 404 |
| GET | /posts | Listar los artículos (`?published=true\|false`) | 200, 400 |
| GET | /posts/:id | Detalle de un artículo (con su autor) | 200, 400, 404 |
| GET | /posts/author/:authorId | Artículos de un autor con sus detalles | 200, 400, 404 |
| POST | /posts | Crear un artículo (`author_id`, `title`, `content`, `published?`) | 201, 400 |
| PUT | /posts/:id | Actualizar (`title`, `content`, `published?`) | 200, 400, 404 |
| DELETE | /posts/:id | Eliminar un artículo | 204, 400, 404 |
| GET | /posts/:postId/comments | Listar los comentarios de un artículo | 200, 400, 404 |
| POST | /posts/:postId/comments | Comentar (`author_id`, `content`) | 201, 400, 404 |
| DELETE | /comments/:id | Eliminar un comentario | 204, 400, 404 |
| GET | /health | Health check (comprueba la base de datos) | 200, 503 |

Formato de los errores: `{ "error": "mensaje", "details": [{ "field": "name", "message": "…" }] }`.
Los mensajes de error que devuelve la API están en francés.

### Validaciones

- Autor: `name` no vacío; `email` válido y **único** (409 en caso contrario, sin distinguir mayúsculas).
- Artículo: `title`, `content` y `author_id` obligatorios y no vacíos; el autor debe existir (si no, 400).
- Comentario: `content` y `author_id` obligatorios; el artículo debe existir (404) y el autor también (400).

### Integridad referencial

| Al eliminar… | Efecto |
|---|---|
| un autor | sus artículos se eliminan (`ON DELETE CASCADE`); sus comentarios se **conservan** con `author_id = NULL` (`ON DELETE SET NULL`) |
| un artículo | sus comentarios se eliminan (`ON DELETE CASCADE`) |

### Ejemplos

```bash
curl -X POST localhost:3000/authors -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","bio":"Dev"}'

curl -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -d '{"author_id":1,"title":"Hola","content":"Mi primer artículo","published":true}'

curl localhost:3000/posts/author/1
```

## Tests

Los tests arrancan el servidor Express real y usan una **base de datos PostgreSQL exclusiva para tests**.
⚠️ Las tablas `authors`, `posts` y `comments` de `TEST_DATABASE_URL` se **eliminan y se vuelven a crear** en cada ejecución: no uses nunca tu base de desarrollo ni la de producción.

```bash
createdb mini_blog_test
# en .env: TEST_DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/mini_blog_test
npm test


## 
URL pública: https://m2josemiguelreyesbetancourt-production.up.railway.app
cls