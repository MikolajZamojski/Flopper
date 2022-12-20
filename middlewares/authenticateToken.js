const express = require('express')
const jwt = require('jsonwebtoken')

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (token == null) return res.status(401).json({err: "Missing login token!"})
  
  const isValid = jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) {
      return false
    }
    req.userId = user.id
    return true;
  })
  if(!isValid) {
    return res.status(403).json({err: "Invalid login token!"})
  }
  await req.dbConnect.collection("Users").updateOne({_id: req.userId}, {$currentDate: {"last-seen": true}}, {upsert: true})
  next()
}

module.exports = authenticateToken
