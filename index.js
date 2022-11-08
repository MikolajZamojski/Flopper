const express = require('express')
const app = express()
const cors = require('cors')
const dbo = require('./db/conn');
const auth = require('./routes/auth')
const user = require('./routes/user')
const post = require('./routes/post')
const authenticateToken = require('./middlewares/authenticateToken');
require('dotenv').config()

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use((req,res,next) => {
  req.dbConnect = dbo.getDb();
  next();
});

app.use('/auth', auth)

app.use('/u', user)

app.use('/p', post)

app.get('/', authenticateToken, (req, res) => {
  res.sendStatus(200);
})

const PORT = process.env.PORT || 5000

dbo.connectToServer(function (err) {
  if (err) {
    console.error(err);
    process.exit();
  }

  app.listen(PORT, () => {
    console.log(`Flopper API listening on port ${PORT}`)
  })
});