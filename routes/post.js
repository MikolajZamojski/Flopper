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

module.exports = router