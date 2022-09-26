const express = require('express')
const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (token == null) return res.status(401).json({err: "Missing login token!"})
  
  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({err: "Invalid login token!"})
    req.userId = user.id
    next()
  })
}

module.exports = authenticateToken