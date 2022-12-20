const express = require('express')

async function authorizeGroupOwnership(req, res, next) {
  if(await req.dbConnect.collection("GroupsMembers").findOne({group: req.params.groupId, user: req.userId, permission: "owner"})) {
    next()
  }
  else {
    return res.sendStatus(403)
  }
}

module.exports = authorizeGroupOwnership
