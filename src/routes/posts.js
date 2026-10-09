const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, validatePost, parsePublishedFilter } = require('../validators');
const posts = require('../services/posts');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await posts.list({ published: parsePublishedFilter(req.query.published) }));
}));

// Debe permanecer ANTES de '/:id'
router.get('/author/:authorId', asyncHandler(async (req, res) => {
  res.json(await posts.listByAuthor(parseId(req.params.authorId, 'authorId')));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await posts.getById(parseId(req.params.id)));
}));

router.post('/', asyncHandler(async (req, res) => {
  const post = await posts.create(validatePost(req.body, { creating: true }));
  res.status(201).location(`/posts/${post.id}`).json(post);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  res.json(await posts.update(id, validatePost(req.body)));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await posts.remove(parseId(req.params.id));
  res.status(204).end();
}));

module.exports = router;
