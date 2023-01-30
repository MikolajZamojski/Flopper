const express = require('express');
const router = express.Router();
const { pfpUpload } = require("../multer/multer");
const sharp = require('sharp');
const fs = require('fs');
const crypto = require('crypto')
const authenticateToken = require('../middlewares/authenticateToken');
const authorizeGroupOwnership = require('../middlewares/authorizeGroupOwnership');

router.get('/', authenticateToken, async(req, res) => {
  const groupResult = await req.dbConnect.collection("GroupsMembers").find({user: req.userId, permission: {$in: ["member", "owner"]}}, {projection: {_id: 0, group: 1}}).toArray();
  let groups = [];
  groupResult.forEach(groupObj => {
    groups.push(groupObj.group)
  });
  const data = await req.dbConnect.collection("Groups").find({_id: {$in: groups}}, {projection: {"full-name": 1, "pfp-filename": 1}}).toArray();
  res.status(200).json(data)
})

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

router.get('/:groupId/members', async(req, res)=> {
  const membersData = await req.dbConnect.collection("GroupsMembers").find({group: req.params.groupId, permission: {$in: ["member", "owner"]}}, {projection: {"user": 1, "_id": 0}}).toArray();
  let members = [];
  membersData.forEach(memberObj => {
    members.push(memberObj.user)
  });
  const data = await req.dbConnect.collection("Users").find({_id: {$in: members}}, {projection: {"full-name": 1, "pfp-filename": 1}}).toArray();
  res.status(200).json(data)
})

router.get('/:groupId/profile', authenticateToken, async(req, res)=> {
  const data = await req.dbConnect.collection("Groups").findOne({_id: req.params.groupId});
  if(data === null) {
    return res.status(404).json({err: "Group doesn't exist!"});
  }
  data.requested = await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.userId, permission: "request"}) !== null;
  data.isMember = await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.userId, permission: {$in: ["member", "owner"]}}) !== null;
  data.isOwner = await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.userId, permission: "owner"}) !== null;
  res.status(200).json(data)
})

router.get('/:groupId/requests', authenticateToken, authorizeGroupOwnership, async(req, res)=> {
  const data = await req.dbConnect.collection("Groups").findOne({_id: req.params.groupId});
  if(data === null) {
    return res.status(404).json({err: "Group doesn't exist!"});
  }
  const requestsData = await req.dbConnect.collection("GroupsMembers").find({group: req.params.groupId, permission: "request"}, {projection: {"user": 1, "_id": 0}}).toArray();
  let requests = [];
  requestsData.forEach(requestObj => {
    requests.push(requestObj.user)
  });
  const usersData = await req.dbConnect.collection("Users").find({_id: {$in: requests}}, {projection: {"full-name": 1, "pfp-filename": 1}}).toArray();
  res.status(200).json(usersData);
})

router.get('/invites', authenticateToken, async(req, res)=> {
  const invitesData = await req.dbConnect.collection("GroupsMembers").find({user: req.userId, permission: "invite"}, {projection: {"group": 1, "_id": 0}}).toArray();
  let invites = [];
  invitesData.forEach(inviteObj => {
    invites.push(inviteObj.group)
  });
  const groupsData = await req.dbConnect.collection("Groups").find({_id: {$in: invites}}, {projection: {"full-name": 1, "pfp-filename": 1}}).toArray();
  res.status(200).json(groupsData);
})

router.post('/', authenticateToken, async (req, res) => {
  const groupId = crypto.randomUUID().replace(/-/g, '');
  const { fullName } = req.body;
  if(fullName === undefined)
    return res.status(400).json({err : "Missing credentials."});
  await req.dbConnect.collection("Groups").insertOne({_id : groupId, "full-name": fullName, "members-count": 1});
  await req.dbConnect.collection("GroupsMembers").insertOne({group: groupId, user: req.userId, permission: "owner"});
  res.status(201).json({_id: groupId});
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

router.put('/:groupId/request', authenticateToken, async(req, res) => {
  const data = await req.dbConnect.collection("Groups").findOne({_id: req.params.groupId});
  if(data === null) {
    return res.status(404).json({err: "Group doesn't exist!"});
  }
  const memberData = await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.userId});
  if(memberData === null) {
    await req.dbConnect.collection("GroupsMembers").insertOne({group: req.params.groupId, user: req.userId, permission: "request"});
    return res.status(201).json({requested: true});
  }
  if(memberData.permission === "request") {
    await req.dbConnect.collection("GroupsMembers").deleteOne({_id: memberData._id});
    return res.status(201).json({requested: false});
  }
  if(memberData.permission === "invite") {
    await req.dbConnect.collection("GroupsMembers").updateOne({_id: memberData._id}, {$set: {permission: "member"}})
    await req.dbConnect.collection("Groups").updateOne({_id: req.params.groupId}, {$inc : {"members-count": 1}});
    return res.status(201).json({member: true})
  }
  return res.status(409).json({err: "Already a member"});
})

router.put('/:groupId/:userId/invite', authenticateToken, authorizeGroupOwnership, async(req, res) => {
  if(req.userId === req.params.userId) {
    return res.status(404).json({err: "You cannot invite yourself!"});
  }
  const data = await req.dbConnect.collection("Groups").findOne({_id: req.params.groupId});
  if(data === null) {
    return res.status(404).json({err: "Group doesn't exist!"});
  }
  const memberData = await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.params.userId});
  if(memberData === null) {
    await req.dbConnect.collection("GroupsMembers").insertOne({group: req.params.groupId, user: req.params.userId, permission: "invite"});
    return res.status(201).json({invited: true});
  }
  if(memberData.permission === "invite") {
    await req.dbConnect.collection("GroupsMembers").deleteOne({_id: memberData._id});
    return res.status(201).json({invited: false});
  }
  if(memberData.permission === "request") {
    await req.dbConnect.collection("GroupsMembers").updateOne({_id: memberData._id}, {$set: {permission: "member"}})
    await req.dbConnect.collection("Groups").updateOne({_id: req.params.groupId}, {$inc : {"members-count": 1}});
    return res.status(201).json({member: true})
  }
  return res.status(409).json({err: "Already a member"});
})

router.delete('/:groupId/quit', authenticateToken, async(req, res) => {
  const data = await req.dbConnect.collection("Groups").findOne({_id: req.params.groupId});
  if(data === null) {
    return res.status(404).json({err: "Group doesn't exist!"});
  }
  const memberData = await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.userId});
  if(memberData.permission !== null) {
    await req.dbConnect.collection("GroupsMembers").deleteOne({_id: memberData._id});
    if(memberData.permission === "member") {
      await req.dbConnect.collection("Groups").updateOne({_id: req.params.groupId}, {$inc : {"members-count": -1}});
    }
    return res.sendStatus(200);
  }
  return res.status(409).json({err: "User is not a member of this group."})
  
})

router.delete('/:groupId/:userId/kick', authenticateToken, authorizeGroupOwnership, async(req, res) => {
  const memberData = await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.params.userId});
  if(memberData !== null) {
    await req.dbConnect.collection("GroupsMembers").deleteOne({group: req.params.groupId, user: req.params.userId});
    if(memberData.permission !== "member") {
      return res.sendStatus(200);
    }
    await req.dbConnect.collection("Groups").updateOne({_id: req.params.groupId}, {$inc : {"members-count": -1}});
    const groupPosts = await req.dbConnect.collection("Posts").find({group: req.params.groupId, author: req.params.userId}, {projection: {_id: 1}}).toArray();
    if(groupPosts) {
      const groupPostsIds = groupPosts.map(postObj => postObj._id)
      await req.dbConnect.collection("Posts").deleteMany({group: req.params.groupId});
      await req.dbConnect.collection("PostsLikes").deleteMany({post: {$in: groupPostsIds}});
      const deletedComments = await req.dbConnect.collection("Comments").find({post: {$in: groupPostsIds}}, {projection: {_id: 1}}).toArray();
      if(deletedComments) {
        const deletedCommentsIds = deletedComments.map(commentObj => commentObj._id);
        await req.dbConnect.collection("Comments").deleteMany({post: {$in: groupPostsIds}});
        await req.dbConnect.collection("CommentsLikes").deleteMany({comment: {$in: deletedCommentsIds}});
      }
      return res.sendStatus(200);
    }
  }
  else {
    return res.sendStatus(409);
  }
})


router.delete('/:groupId', authenticateToken, authorizeGroupOwnership, async(req, res) => {
  await req.dbConnect.collection("Groups").deleteOne({_id: req.params.groupId});
  await req.dbConnect.collection("GroupsMembers").deleteMany({group: req.params.groupId});
  const groupPosts = await req.dbConnect.collection("Posts").find({group: req.params.groupId}, {projection: {_id: 1}}).toArray();
  if(groupPosts) {
    const groupPostsIds = groupPosts.map(postObj => postObj._id)
    await req.dbConnect.collection("Posts").deleteMany({group: req.params.groupId});
    await req.dbConnect.collection("PostsLikes").deleteMany({post: {$in: groupPostsIds}});
    const deletedComments = await req.dbConnect.collection("Comments").find({post: {$in: groupPostsIds}}, {projection: {_id: 1}}).toArray();
    if(deletedComments) {
      const deletedCommentsIds = deletedComments.map(commentObj => commentObj._id);
      await req.dbConnect.collection("Comments").deleteMany({post: {$in: groupPostsIds}});
      await req.dbConnect.collection("CommentsLikes").deleteMany({comment: {$in: deletedCommentsIds}});
    }
  }
  return res.status(200).json({msg: "Group deleted."});
})

module.exports = router
