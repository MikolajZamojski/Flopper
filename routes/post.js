const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { postUpload } = require("../multer/multer")
const authenticateToken = require('../middlewares/authenticateToken');

router.post('/new', authenticateToken, (req, res, next) => {req.postId = crypto.randomUUID().replaceAll('-', ''); next()}, postUpload.array('attachments'), async(req, res) => {
  const attachments = req.files.map(file => ({content: file.mimetype.split('/')[0], filename: file.filename}));
  const {text} = req.body;
  await req.dbConnect.collection("Posts").insertOne({_id: req.postId, text: text, attachments: attachments, author: req.userId, date: new Date()});
  res.sendStatus(201);
})

router.put('/:postId/like', authenticateToken, async(req, res) => {
  const post = await req.dbConnect.collection("Posts").findOne({_id: req.params.postId});
  if(post === null) {
    return res.status(400).json({err: "Post doesn't exist!"});
  }
  const likeResult = await req.dbConnect.collection("PostsLikes").findOne({post: req.params.postId, user: req.userId});
  if(likeResult !== null) {
    await req.dbConnect.collection("PostsLikes").deleteOne({_id: likeResult._id});
    await req.dbConnect.collection("Posts").updateOne({_id: post._id}, {$inc: {"likes-count": -1}});
  }
  else {
    await req.dbConnect.collection("PostsLikes").insertOne({post: post._id, user: req.userId});
    await req.dbConnect.collection("Posts").updateOne({_id: post._id}, {$inc: {"likes-count": 1}}, {upsert: true});
  }
  return res.sendStatus(201);
})

router.post('/:postId/c', authenticateToken, async(req, res) => {
  const post = await req.dbConnect.collection("Posts").findOne({_id: req.params.postId});
  if(post === null) {
    return res.status(400).json({err: "Post doesn't exist!"});
  }
  const {text} = req.body;
  const commentId = crypto.randomUUID().replaceAll('-', '');
  await req.dbConnect.collection("Comments").insertOne({_id: commentId, text: text, post: post._id, author: req.userId, date: new Date()});
  res.sendStatus(201);
})

// add partial index
router.put('/:postId/c/:commentId/like', authenticateToken, async(req, res) => {
  const comment = await req.dbConnect.collection("Comments").findOne({post: req.params.postId, _id: req.params.commentId});
  if(comment === null) {
    return res.status(400).json({err: "Comment doesn't exist!"});
  }
  const likeResult = await req.dbConnect.collection("CommentsLikes").findOne({comment: req.params.commentId, user: req.userId});
  if(likeResult !== null) {
    await req.dbConnect.collection("CommentsLikes").deleteOne({_id: likeResult._id});
    await req.dbConnect.collection("Comments").updateOne({_id: comment._id}, {$inc: {"likes-count": -1}});
  }
  else {
    await req.dbConnect.collection("CommentsLikes").insertOne({comment: comment._id, user: req.userId});
    await req.dbConnect.collection("Comments").updateOne({_id: comment._id}, {$inc: {"likes-count": 1}}, {upsert: true});
  }
  return res.sendStatus(201);
})

router.post('/:postId/c/:commentId/reply', authenticateToken, async(req, res) => {
  const comment = await req.dbConnect.collection("Comments").findOne({post: req.params.postId, _id: req.params.commentId});
  if(comment === null) {
    return res.status(400).json({err: "Comment doesn't exist!"});
  }
  const {text} = req.body;
  const commentId = crypto.randomUUID().replaceAll('-', '');
  await req.dbConnect.collection("Comments").insertOne({_id: commentId, text: text, post: req.params.postId, author: req.userId, date: new Date(), "answering-comment": comment._id});
  res.sendStatus(201);
})

module.exports = router