const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const dbo = require('./db/conn');
const auth = require('./routes/auth')
const user = require('./routes/user')
require('dotenv').config()

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

app.use(cors())
app.use(express.json())

app.use((req,res,next) => {
  req.dbConnect = dbo.getDb();
  next();
});

app.use('/auth', auth)

app.use('/u', authenticateToken, user)

app.get('/', authenticateToken, (req, res) => {
  res.sendStatus(200);
})

dbo.connectToServer(function (err) {
  if (err) {
    console.error(err);
    process.exit();
  }

  app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${process.env.PORT}`)
  })
});