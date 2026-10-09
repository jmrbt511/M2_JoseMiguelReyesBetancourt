require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const asyncHandler = require('./utils/asyncHandler');
const authorsRoutes = require('./routes/authors');
const postsRoutes = require('./routes/posts');
const { postComments, commentsById } = require('./routes/comments');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.json({ name: 'Mini Blog API', status: 'ok', docs: '/docs' }));

// Health check (Railway): también verifica la base de datos
app.get('/health', asyncHandler(async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'error', database: 'down' });
  }
}));

// Documentación OpenAPI
const SPEC = path.join(__dirname, '..', 'docs', 'openapi.yaml');
app.get('/openapi.yaml', (req, res) => res.type('text/yaml').sendFile(SPEC));
app.get('/docs', (req, res) => {
  res.type('html').send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Mini Blog API – docs</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#ui' });</script></body></html>`);
});

app.use('/authors', authorsRoutes);
app.use('/posts/:postId/comments', postComments);
app.use('/posts', postsRoutes);
app.use('/comments', commentsById);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
