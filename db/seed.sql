-- Datos de demostración (idempotente: se puede volver a ejecutar sin crear duplicados)

INSERT INTO authors (name, email, bio) VALUES
  ('Alice Martin', 'alice@example.com', 'Développeuse back-end et passionnée de bases de données.'),
  ('Bruno Lefèvre', 'bruno@example.com', 'Rédacteur technique, fan de Node.js.'),
  ('Chloé Dubois', 'chloe@example.com', NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO posts (author_id, title, content, published)
SELECT a.id, v.title, v.content, v.published
FROM (VALUES
  ('alice@example.com', 'Bienvenue sur le blog', 'Premier article de démonstration.', true),
  ('alice@example.com', 'Pourquoi PostgreSQL ?', 'Contraintes, transactions et fiabilité : tour d''horizon.', true),
  ('bruno@example.com', 'Express en 10 minutes', 'Routes, middlewares et gestion d''erreurs.', true),
  ('bruno@example.com', 'Brouillon : tests automatisés', 'À compléter.', false)
) AS v(email, title, content, published)
JOIN authors a ON a.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.author_id = a.id AND p.title = v.title);

INSERT INTO comments (post_id, author_id, content)
SELECT p.id, a.id, v.content
FROM (VALUES
  ('Bienvenue sur le blog', 'bruno@example.com', 'Bravo pour le lancement !'),
  ('Bienvenue sur le blog', 'chloe@example.com', 'Hâte de lire la suite.'),
  ('Express en 10 minutes', 'alice@example.com', 'Très clair, merci.')
) AS v(post_title, email, content)
JOIN posts p ON p.title = v.post_title
JOIN authors a ON a.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.author_id = a.id AND c.content = v.content);
