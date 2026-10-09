const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, validateComment } = require('../validators');
const comments = require('../services/comments');

// /posts/:postId/comments
const postComments = express.Router({ mergeParams: true });

postComments.get('/', asyncHandler(async (req, res) => {
  res.json(await comments.listByPost(parseId(req.params.postId, 'postId')));
}));

postComments.post('/', asyncHandler(async (req, res) => {
  const postId = parseId(req.params.postId, 'postId');
  const comment = await comments.create(postId, validateComment(req.body));
  res.status(201).location(`/posts/${postId}/comments`).json(comment);
}));

// /comments/:id
const commentsById = express.Router();

commentsById.delete('/:id', asyncHandler(async (req, res) => {
  await comments.remove(parseId(req.params.id));
  res.status(204).end();
}));

module.exports = { postComments, commentsById };
