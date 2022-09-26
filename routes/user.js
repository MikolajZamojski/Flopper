const express = require('express')
const router = express.Router()
const { pfpUpload } = require("../multer/multer")
const sharp = require('sharp');
const fs = require('fs')
const authenticateToken = require('../middlewares/authenticateToken');

router.post('/:userId/pfp', authenticateToken, (req, res, next) => {req.params.userId === req.userId ? next() : res.sendStatus(403)}, pfpUpload.single('avatar'), async (req, res) => {
  const updateResult = (await req.dbConnect.collection("Users").findOneAndUpdate({_id: req.userId}, {$set : {"pfp-filename": req.hashedFileName}}, {upsert: true, projection: {"pfp-filename": 1, _id: 0}})).value["pfp-filename"];
  if(updateResult) {
    await fs.rm('public/pfps/' + updateResult.split('').slice(0, 3).join("/") + "/" + updateResult, (err) => {if(err) console.log(err)})
  }
  const image = sharp(req.dir + "/" + req.hashedFileName);
  const imageDimensions = await image.metadata()
  if(imageDimensions.height > 300 || imageDimensions.width > 300) {
    image.resize(300, 300, {fit: 'contain'}).toBuffer((err, buffer) => {if(!err) fs.writeFile(req.dir + "/" + req.hashedFileName, buffer, (e) => {})})
  }
  res.sendStatus(201);
})

router.post('/:userId/about', authenticateToken, async(req, res) => {
  if(req.params.userId !== req.userId) {
    return res.sendStatus(403);
  }
  let {about} = req.body;
  if(about === undefined)
    return res.status(400).json({err : "Missing about info."});
  await req.dbConnect.collection("Users").updateOne({_id: req.userId}, {$set : {"about": about}}, {upsert: true});
  res.sendStatus(201);
})

router.put('/:userId/follow', authenticateToken, async(req, res) => {
  if(req.params.userId === req.userId) {
    return res.status(400).json({err: "You can't follow yourself!"});
  }
  const receiver = await req.dbConnect.collection("Users").findOne({_id: req.params.userId});
  if(receiver === null) {
    return res.status(400).json({err: "User doesn't exist!"});
  }
  const followResult = await req.dbConnect.collection("Follows").findOne({follower: req.userId, followed: receiver._id});
  if(followResult !== null) {
    await req.dbConnect.collection("Follows").deleteOne({_id: followResult._id});
    await req.dbConnect.collection("Users").updateOne({_id: req.userId}, {$inc: {"following-count": -1}}, {upsert: true})
    await req.dbConnect.collection("Users").updateOne({_id: receiver._id}, {$inc: {"followers-count": -1}}, {upsert: true})
  }
  else {
    await req.dbConnect.collection("Follows").insertOne({follower: req.userId, followed: receiver._id});
    await req.dbConnect.collection("Users").updateOne({_id: req.userId}, {$inc: {"following-count": 1}}, {upsert: true})
    await req.dbConnect.collection("Users").updateOne({_id: receiver._id}, {$inc: {"followers-count": 1}}, {upsert: true})
  }
  return res.sendStatus(201);
})

router.put('/:userId/friend', authenticateToken, async(req, res) => {
  if(req.params.userId === req.userId) {
    return res.status(400).json({err: "You can't friend yourself!"});
  }
  const receiver = await req.dbConnect.collection("Users").findOne({_id: req.params.userId});
  if(receiver === null) {
    return res.status(400).json({err: "User doesn't exist!"});
  }
  const friendResult = await req.dbConnect.collection("Friends").findOne({friends : {$all : [req.params.userId, req.userId]}});
  if(friendResult === null) {
    await req.dbConnect.collection("Friends").insertOne({friends: [req.userId, req.params.userId], pending: true})
    return res.status(201).json({msg: "User invited!"});
  }
  if(friendResult.pending === false) {
    return res.status(400).json({err: "You are already friends!"});
  }
  if(friendResult.friends[0] === req.userId) {
    return res.status(400).json({err: "Invite already sent!"});
  }
  await req.dbConnect.collection("Friends").updateOne({_id: friendResult._id}, {$set : {pending: false}})
  return res.status(201).json({msg: "User accepted as friend."});
})

router.put('/:userId/unfriend', authenticateToken, async(req, res) => {
  if(req.params.userId === req.userId) {
    return res.status(400).json({err: "You can't unfriend yourself!"});
  }
  const receiver = await req.dbConnect.collection("Users").findOne({_id: req.params.userId});
  if(receiver === null) {
    return res.status(400).json({err: "User doesn't exist!"});
  }
  const friendResult = await req.dbConnect.collection("Friends").deleteOne({friends : {$all : [req.params.userId, req.userId]}});
  if(friendResult.deletedCount === 0) {
    return res.status(404).json({err: "Friend document not found."});
  }
  return res.status(200).json({msg: "Unfriended."});
})

module.exports = router