const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { postUpload } = require("../multer/multer")
const authenticateToken = require('../middlewares/authenticateToken');
const authorizePostAuthor = require('../middlewares/authorizePostAuthor')

const postUploadFields = postUpload.fields([
  {name: "a00", maxCount: 1}, {name: "a01", maxCount: 1}, {name: "a02", maxCount: 1}, {name: "a03", maxCount: 1}, {name: "a04", maxCount: 1}, {name: "a05", maxCount: 1},
  {name: "a06", maxCount: 1}, {name: "a07", maxCount: 1}, {name: "a08", maxCount: 1}, {name: "a09", maxCount: 1}, {name: "a10", maxCount: 1}, {name: "a11", maxCount: 1}
])

const postsLimit = 10;

router.get('/:postId', authenticateToken, async (req, res) => {
  const data = await req.dbConnect.collection("Posts").findOne({_id: req.params.postId});
  if(data === null) {
    return res.status(404).json({err: "Post doesn't exist!"});
  }
  data.isLiked = await req.dbConnect.collection("PostsLikes").findOne({post: req.params.postId, user: req.userId}) !== null;
  res.status(200).json(data)
})

router.get('/feed/:skips', authenticateToken, async (req, res) => {
  if(isNaN(req.params.skips)) {
    return res.status(400).json({err: "Skip parameter is not a number"});
  }
  const followResults = await req.dbConnect.collection("Follows").find({follower: req.userId}, {projection: {followed: 1, _id: 0}}).toArray();
  let followArray = followResults.map((followResult) => {
    return followResult.followed
  });
  followArray.push(req.userId);
  const feedResult = await req.dbConnect.collection("Posts").aggregate([{$match: {author: {$in: followArray}}}, {$sort: {date: -1}}, {$skip: postsLimit * parseInt(req.params.skips)}, {$limit: postsLimit}]).toArray();
  const likeResult = await req.dbConnect.collection("PostsLikes").find({post: {$in: feedResult.map(result => result._id)}, user: req.userId}, {projection: {_id: 0, post: 1}}).toArray();
  const likeArray = likeResult.map(result => {
    return result.post
  })
  feedResult.map(post => {
    return post.isLiked = likeArray.includes(post._id);
  })
  res.status(200).json(feedResult)
})

router.post('/', authenticateToken, (req, res, next) => {req.postId = crypto.randomUUID().replace(/-/g, ''); next()}, postUploadFields , async(req, res) => {
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
    return res.status(201).json({isLiked: false, likesCount: post["likes-count"] || 0 + 1});
  }
  else {
    await req.dbConnect.collection("PostsLikes").insertOne({post: post._id, user: req.userId});
    await req.dbConnect.collection("Posts").updateOne({_id: post._id}, {$inc: {"likes-count": 1}}, {upsert: true});
    return res.status(201).json({isLiked: true, likesCount: post["likes-count"] + 1});
  }
})

router.delete('/:postId', authenticateToken, authorizePostAuthor, async(req, res) => {
  await req.dbConnect.collection("Posts").deleteOne({_id: req.params.postId});
  await req.dbConnect.collection("PostsLikes").deleteMany({post: req.params.postId});
  const deletedComments = await req.dbConnect.collection("Comments").find({post: req.params.postId}, {projection: {_id: 1}}).toArray();
  if(deletedComments) {
    const deletedCommentsIds = deletedComments.map(commentObj => commentObj._id);
    await req.dbConnect.collection("Comments").deleteMany({post: req.params.postId});
    await req.dbConnect.collection("CommentsLikes").deleteMany({comment: {$in: deletedCommentsIds}});
  }
  return res.status(200).json({msg: "Post deleted."});
})

module.exports = router
