const express = require('express')
const router = express.Router()
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
    cb(null, req.hashedFileName + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })

router.post('/', upload.single('avatar'), (req, res) => {
  res.sendStatus(201);
})

module.exports = router