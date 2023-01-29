const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const crypto = require('crypto')

const commentsLimit = 10;

router.get('/:postId/:skips', authenticateToken, async (req, res) => {
  if(isNaN(req.params.skips)) {
    return res.status(400).json({err: "Skip parameter is not a number"});
  }
  const commentsResult = await req.dbConnect.collection("Comments").aggregate([{$match: {post: req.params.postId, "answering-comment": null}}, {$sort: {"likes-count": -1, date: 1}}, {$skip: commentsLimit * parseInt(req.params.skips)}, {$limit: commentsLimit}]).toArray();
  const likeResult = await req.dbConnect.collection("CommentsLikes").find({comment: {$in: commentsResult.map(result => result._id)}, user: req.userId}, {projection: {_id: 0, comment: 1}}).toArray();
  const likeArray = likeResult.map(result => {
    return result.comment
  })
  commentsResult.map(comment => {
    return comment.isLiked = likeArray.includes(comment._id);
  })
  res.status(200).json(commentsResult)
})

router.get('/:commentId/replies/:skips', authenticateToken, async (req, res) => {
  if(isNaN(req.params.skips)) {
    return res.status(400).json({err: "Skip parameter is not a number"});
  }
  const commentsResult = await req.dbConnect.collection("Comments").aggregate([{$match: {"answering-comment": req.params.commentId}}, {$sort: {date: 1}}, {$skip: commentsLimit * parseInt(req.params.skips)}, {$limit: commentsLimit}]).toArray();
  const likeResult = await req.dbConnect.collection("CommentsLikes").find({comment: {$in: commentsResult.map(result => result._id)}, user: req.userId}, {projection: {_id: 0, comment: 1}}).toArray();
  const likeArray = likeResult.map(result => {
    return result.comment
  })
  commentsResult.map(comment => {
    return comment.isLiked = likeArray.includes(comment._id);
  })
  res.status(200).json(commentsResult)
})

router.post('/:postId', authenticateToken, async(req, res) => {
  const post = await req.dbConnect.collection("Posts").findOne({_id: req.params.postId});
  if(post === null) {
    return res.status(404).json({err: "Post doesn't exist!"});
  }
  const {text} = req.body;
  const commentId = crypto.randomUUID().replace(/-/g, '');
  await req.dbConnect.collection("Comments").insertOne({_id: commentId, text: text, post: post._id, author: req.userId, date: new Date()});
  res.sendStatus(201);
})

router.post('/:commentId/reply', authenticateToken, async(req, res) => {
  const comment = await req.dbConnect.collection("Comments").findOne({_id: req.params.commentId});
  if(comment === null) {
    return res.status(400).json({err: "Comment doesn't exist!"});
  }
  const {text} = req.body;
  const commentId = crypto.randomUUID().replace(/-/g, '');
  await req.dbConnect.collection("Comments").insertOne({_id: commentId, text: text, post: comment.post, author: req.userId, date: new Date(), "answering-comment": comment._id});
  await req.dbConnect.collection("Comments").updateOne({_id: comment._id}, {$inc: {"replies-count": 1}}, {upsert: true});
  res.sendStatus(201);
})

router.put('/:commentId/like', authenticateToken, async(req, res) => {
  const comment = await req.dbConnect.collection("Comments").findOne({_id: req.params.commentId});
  if(comment === null) {
    return res.status(404).json({err: "Comment doesn't exist!"});
  }
  const likeResult = await req.dbConnect.collection("CommentsLikes").findOne({comment: req.params.commentId, user: req.userId});
  if(likeResult !== null) {
    await req.dbConnect.collection("CommentsLikes").deleteOne({_id: likeResult._id});
    await req.dbConnect.collection("Comments").updateOne({_id: comment._id}, {$inc: {"likes-count": -1}});
    return res.status(201).json({isLiked: false, likesCount: comment["likes-count"] - 1});
  }
  else {
    await req.dbConnect.collection("CommentsLikes").insertOne({comment: comment._id, user: req.userId});
    await req.dbConnect.collection("Comments").updateOne({_id: comment._id}, {$inc: {"likes-count": 1}}, {upsert: true});
    return res.status(201).json({isLiked: true, likesCount: comment["likes-count"] + 1 || 1});
  }
})

module.exports = router
