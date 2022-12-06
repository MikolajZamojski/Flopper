const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

const pfpStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    req.hashedFileName = crypto.randomUUID().replace(/-/g, '');
    req.dir = '/tmp/public/pfps/' + req.hashedFileName[0]
    if(!fs.existsSync(req.dir)) {
      fs.mkdirSync(req.dir)
    }
    req.dir += "/" + req.hashedFileName[1]
    if(!fs.existsSync(req.dir)) {
      fs.mkdirSync(req.dir)
    }
    req.dir += "/" + req.hashedFileName[2]
    if(!fs.existsSync(req.dir)) {
      fs.mkdirSync(req.dir)
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

const postStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    req.hashedFileName = crypto.randomUUID().replace(/-/g, '');
    req.dir = 'tmp/public/pfps/' + req.hashedFileName[0]
    if(!fs.existsSync(req.dir)) {
      fs.mkdirSync(req.dir)
    }
    req.dir += "/" + req.hashedFileName[1]
    if(!fs.existsSync(req.dir)) {
      fs.mkdirSync(req.dir)
    }
    req.dir += "/" + req.hashedFileName[2]
    if(!fs.existsSync(req.dir)) {
      fs.mkdirSync(req.dir)
    }
    req.dir += "/" + req.postId
    if(!fs.existsSync(req.dir)) {
      fs.mkdirSync(req.dir)
    }
    cb(null, req.dir)
  },
  filename: function (req, file, cb) {
    req.hashedFileName += path.extname(file.originalname)
    cb(null, req.hashedFileName)
  }
})

function postFileFilter (req, file, cb) {    
  const filetypes = /jpeg|jpg|png|gif|mp4|webm/;
  const extname =  filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

 if(mimetype && extname){
     return cb(null,true);
 } else {
     cb('Error: Images and videos Only!');
 }
}


module.exports = {
  pfpUpload: multer({ storage: pfpStorage, fileFilter: pfpFileFilter, limits: {fileSize: 10000000, files: 1}}),
  postUpload: multer({ storage: postStorage, fileFilter: postFileFilter, limits: {fileSize: 10000000, parts: 13}})
};