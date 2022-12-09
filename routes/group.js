const express = require('express');
const router = express.Router();
const { pfpUpload } = require("../multer/multer");
const sharp = require('sharp');
const fs = require('fs');
const crypto = require('crypto')
const authenticateToken = require('../middlewares/authenticateToken');

router.post('/', authenticateToken, async (req, res) => {
  const groupId = crypto.randomUUID().replace(/-/g, '');
  const { name } = req.body;
  if(name === undefined)
    return res.status(400).json({err : "Missing credentials."});
  await req.dbConnect.collection("Groups").insertOne({_id : groupId, name: name});
  await req.dbConnect.collection("GroupsMembers").insertOne({group: groupId, user: req.userId, permission: "owner"});
  res.status(201).json({msg: "Group created!"});
})

module.exports = router