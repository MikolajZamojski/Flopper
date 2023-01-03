const express = require('express')

async function authorizePostAuthor(req, res, next) {
  if(await req.dbConnect.collection("Posts").findOne({_id: req.params.postId, author: req.userId})) {
    next()
  }
  else {
    return res.sendStatus(403)
  }
}

module.exports = authorizePostAuthor
