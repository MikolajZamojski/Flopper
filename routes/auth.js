const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
require('dotenv').config()

router.post('/login', async (req, res) => {
  let {id, password} = req.body;
  if(id === undefined || password === undefined)
    return res.status(400).json({err : "Missing credentials."});
  hashedPasswordResult = await req.dbConnect.collection("Users").findOne({_id: id}, {projection : {password: 1, _id: 0} })
  if(hashedPasswordResult === null || !await bcrypt.compare(password, hashedPasswordResult.password)) {
    return res.status(401).json({err : "Invalid credentials!"});
  }
  const token = jwt.sign({id: id}, process.env.TOKEN_SECRET, { expiresIn: '3600s' })
  res.status(200).json({token: token})
})

router.post('/register', async (req, res) => {
  let { id, password, fullName} = req.body;
  if(id === undefined || password === undefined || fullName === undefined)
    return res.status(400).json({err : "Missing credentials."});
  const findResult = await req.dbConnect.collection("Users").findOne({_id : id})
  if(findResult !== null)
    return res.status(409).json({err : "User already exists!"});
  password = await bcrypt.hash(password, 10)
  await req.dbConnect.collection("Users").insertOne({_id : id, password: password, "full-name": fullName, "last-seen": new Date()})
  res.status(201).json({msg: "Account created!"});
})

module.exports = router
