const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

const pfpStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    req.hashedFileName = crypto.randomUUID();
    req.dir = 'public/pfps/' + req.hashedFileName.split('').slice(0, 3).join("/")
    if(!fs.existsSync(req.dir)) {
      fs.mkdirSync(req.dir, {recursive: true})
    }
    cb(null, req.dir)
  },
  filename: function (req, file, cb) {
    req.hashedFileName += path.extname(file.originalname)
    cb(null, req.hashedFileName)
  }
})

function pfpFileFilter (req, file, cb) {    
  const filetypes = /jpeg|jpg|png/;
  const extname =  filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

 if(mimetype && extname){
     return cb(null,true);
 } else {
     cb('Error: Images Only!');
 }
}

module.exports = {
  pfpUpload: multer({ storage: pfpStorage, fileFilter: pfpFileFilter, limits: {fileSize: 10000000, files: 1}})
};