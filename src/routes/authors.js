const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, validateAuthor } = require('../validators');
const authors = require('../services/authors');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await authors.list());
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await authors.getById(parseId(req.params.id)));
}));

router.post('/', asyncHandler(async (req, res) => {
  const author = await authors.create(validateAuthor(req.body));
  res.status(201).location(`/authors/${author.id}`).json(author);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  res.json(await authors.update(id, validateAuthor(req.body)));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await authors.remove(parseId(req.params.id));
  res.status(204).end();
}));

module.exports = router;
