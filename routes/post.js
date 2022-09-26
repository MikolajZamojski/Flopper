const express = require('express')
const router = express.Router()
const authenticateToken = require('../middlewares/authenticateToken');

router.post('/new', authenticateToken, async(req, res) => {
  let {text} = req.body;
  await req.dbConnect.collection("Posts").insertOne({text: text, author: req.userId, date: new Date()});
  res.sendStatus(201);
})

module.exports = router