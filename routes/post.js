const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { postUpload } = require("../multer/multer")
const authenticateToken = require('../middlewares/authenticateToken');

const postUploadFields = postUpload.fields([
  {name: "a00", maxCount: 1}, {name: "a01", maxCount: 1}, {name: "a02", maxCount: 1}, {name: "a03", maxCount: 1}, {name: "a04", maxCount: 1}, {name: "a05", maxCount: 1},
  {name: "a06", maxCount: 1}, {name: "a07", maxCount: 1}, {name: "a08", maxCount: 1}, {name: "a09", maxCount: 1}, {name: "a10", maxCount: 1}, {name: "a11", maxCount: 1}
])

router.get('/:postId', authenticateToken, async (req, res) => {
  const data = await req.dbConnect.collection("Posts").findOne({_id: req.params.postId});
  if(data === null) {
    return res.status(404).json({err: "Post doesn't exist!"});
  }
  res.status(200).json(data)
})

const limit = 10;

router.get('/feed/:skips', authenticateToken, async (req, res) => {
  if(isNaN(req.params.skips)) {
    return res.status(400).json({err: "Skip parameter is not a number"});
  }
  const followResults = await req.dbConnect.collection("Follows").find({follower: req.userId}, {projection: {followed: 1, _id: 0}}).toArray();
  const followArray = followResults.map((followResult) => {
    return followResult.followed
  });
  const feedResult = await req.dbConnect.collection("Posts").aggregate([{$match: {author: {$in: followArray}}}, {$sort: {date: -1}}, {$skip: limit * parseInt(req.params.skips)}, {$limit: limit}]).toArray();
  const likeResult = await req.dbConnect.collection("PostsLikes").find({post: {$in: feedResult.map(result => result._id)}, user: req.userId}, {projection: {_id: 0, post: 1}}).toArray();
  const likeArray = likeResult.map(result => {
    return result.post
  })
  const feedResult2 = feedResult.map(post => {
    post.isLiked = likeArray.includes(post._id);
  })
  res.status(200).json(feedResult)
})

router.post('/new', authenticateToken, (req, res, next) => {req.postId = crypto.randomUUID().replace(/-/g, ''); next()}, postUploadFields , async(req, res) => {
  let attachments = [];
  Object.keys(req.files).forEach((key) => {
    attachments.push({order: key, content: req.files[key][0].mimetype.split('/')[0], filename: req.files[key][0].filename})
  })
  Object.keys(req.body).forEach((key) => {
    if(key !== "text") {
      if(req.body[key].substr(0, 7) === "spotify")
        attachments.push({order: key, content: "spotify", uri: req.body[key]})
    }
  })
  const attachmentsResult = attachments.sort((a,b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0)).map(({order, ...attr}) => attr)
  await req.dbConnect.collection("Posts").insertOne({_id: req.postId, text: req.body.text, attachments: attachmentsResult, author: req.userId, date: new Date()});
  res.sendStatus(201);
})

router.put('/:postId/like', authenticateToken, async(req, res) => {
  const post = await req.dbConnect.collection("Posts").findOne({_id: req.params.postId});
  if(post === null) {
    return res.status(404).json({err: "Post doesn't exist!"});
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
    return res.status(404).json({err: "Post doesn't exist!"});
  }
  const {text} = req.body;
  const commentId = crypto.randomUUID().replace(/-/g, '');
  await req.dbConnect.collection("Comments").insertOne({_id: commentId, text: text, post: post._id, author: req.userId, date: new Date()});
  res.sendStatus(201);
})

// add partial index
router.put('/:postId/c/:commentId/like', authenticateToken, async(req, res) => {
  const comment = await req.dbConnect.collection("Comments").findOne({post: req.params.postId, _id: req.params.commentId});
  if(comment === null) {
    return res.status(404).json({err: "Comment doesn't exist!"});
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
  const commentId = crypto.randomUUID().replace(/-/g, '');
  await req.dbConnect.collection("Comments").insertOne({_id: commentId, text: text, post: req.params.postId, author: req.userId, date: new Date(), "answering-comment": comment._id});
  res.sendStatus(201);
})

module.exports = router