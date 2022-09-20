const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    req.hashedFileName = crypto.randomUUID();
    const dir = 'uploads/' + req.hashedFileName.split('').slice(0, 3).join("/")
    if(!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true})
    }
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    req.hashedFileName += path.extname(file.originalname)
    cb(null, req.hashedFileName)
  }
})

module.exports.upload = multer({ storage: storage});