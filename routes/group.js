const express = require('express');
const router = express.Router();
const { pfpUpload } = require("../multer/multer");
const sharp = require('sharp');
const fs = require('fs');
const crypto = require('crypto')
const authenticateToken = require('../middlewares/authenticateToken');
const authorizeGroupOwnership = require('../middlewares/authorizeGroupOwnership');

router.get('/search', async(req, res) => {
  if(req.query.query.trim() != "") {
    const data = await req.dbConnect.collection("Groups").aggregate([
      {$search: {index: "groupSearch", autocomplete: {query: req.query.query.trim(), path: "full-name", fuzzy: {maxEdits: 1}}}},
      {$limit: 5},
      {$project: {"about": 0}}
    ]).toArray()
    return res.status(200).json(data)
  }
  res.status(400).json({err: "Missing search query!"})
})

router.get('/:groupId/short', async(req, res)=> {
  const data = await req.dbConnect.collection("Groups").findOne({_id: req.params.groupId}, {projection: {"full-name": 1, "pfp-filename": 1, "members-count": 1}});
  if(data === null) {
    return res.status(400).json({err: "Group doesn't exist!"});
  }
  res.status(200).json(data)
})

router.get('/:groupId/profile', authenticateToken, async(req, res)=> {
  const data = await req.dbConnect.collection("Groups").findOne({_id: req.params.groupId});
  if(data === null) {
    return res.status(404).json({err: "Group doesn't exist!"});
  }
  data.isMember = await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.userId}) !== null;
  res.status(200).json(data)
})

router.post('/', authenticateToken, async (req, res) => {
  const groupId = crypto.randomUUID().replace(/-/g, '');
  const { fullName } = req.body;
  if(fullName === undefined)
    return res.status(400).json({err : "Missing credentials."});
  await req.dbConnect.collection("Groups").insertOne({_id : groupId, "full-name": fullName, "members-count": 1});
  await req.dbConnect.collection("GroupsMembers").insertOne({group: groupId, user: req.userId, permission: "owner"});
  res.status(201).json({msg: "Group created!"});
})

router.post('/:groupId/pfp', authenticateToken, authorizeGroupOwnership, pfpUpload.single('avatar'), async (req, res) => {
  const updateResult = (await req.dbConnect.collection("Groups").findOneAndUpdate({_id: req.params.groupId}, {$set : {"pfp-filename": req.hashedFileName}}, {upsert: true, projection: {"pfp-filename": 1, _id: 0}})).value["pfp-filename"];
  if(updateResult) {
    await fs.rm('./public/pfps/' + updateResult.split('').slice(0, 3).join("/") + "/" + updateResult, (err) => {if(err) console.log(err)})
  }
  const image = sharp(req.dir + "/" + req.hashedFileName);
  const imageDimensions = await image.metadata()
  if(imageDimensions.height > 300 || imageDimensions.width > 300) {
    image.resize(300, 300, {fit: 'contain'}).toBuffer((err, buffer) => {if(!err) fs.writeFile(req.dir + "/" + req.hashedFileName, buffer, (e) => {})})
  }
  res.sendStatus(201);
})

router.post('/:groupId/about', authenticateToken, authorizeGroupOwnership, async(req, res) => {
  let {about} = req.body;
  if(about === undefined)
    return res.status(400).json({err : "Missing about info."});
  await req.dbConnect.collection("Groups").updateOne({_id: req.params.groupId}, {$set : {"about": about}}, {upsert: true});
  res.sendStatus(201);
})

router.post('/:groupId/fullname', authenticateToken, authorizeGroupOwnership, async(req, res) => {
  let {fullName} = req.body;
  if(fullName === undefined)
    return res.status(400).json({err : "Missing full name."});
  await req.dbConnect.collection("Groups").updateOne({_id: req.params.groupId}, {$set : {"full-name": fullName}});
  res.sendStatus(201);
})

module.exports = router
