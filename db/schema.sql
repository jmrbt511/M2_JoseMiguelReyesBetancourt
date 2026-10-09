-- Esquema de Mini Blog (idempotente: se puede volver a ejecutar sin riesgo)

CREATE TABLE IF NOT EXISTS authors (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  email      VARCHAR(255) NOT NULL UNIQUE,
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relación 1:N: un autor → varios artículos.
-- Eliminar un autor elimina sus artículos (CASCADE).
CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  author_id  INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
  content    TEXT NOT NULL CHECK (length(trim(content)) > 0),
  published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un artículo → varios comentarios.
--  * eliminar el artículo elimina sus comentarios (CASCADE)
--  * eliminar el autor CONSERVA el comentario, con author_id = NULL (SET NULL)
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  INTEGER REFERENCES authors(id) ON DELETE SET NULL,
  content    TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id    ON posts (author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id   ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments (author_id);
