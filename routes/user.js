const express = require('express')
const router = express.Router()
const { upload } = require("../multer/multer")
const fs = require('fs')

router.post('/:userId/pfp', upload.single('avatar'), async (req, res) => {
  if(req.params.userId === req.userId) {
    const updateResult = (await req.dbConnect.collection("Users").findOneAndUpdate({_id: req.userId}, {$set : {"pfp-filename": req.hashedFileName}}, {upsert: true, projection: {"pfp-filename": 1, _id: 0}})).value["pfp-filename"];
    if(updateResult) {
      await fs.rm('uploads/' + updateResult.split('').slice(0, 3).join("/") + "/" + updateResult, (err) => {if(err) console.log(err)})
    }
    res.sendStatus(201);
  }
  else {
    res.sendStatus(403)
  }
})

module.exports = router