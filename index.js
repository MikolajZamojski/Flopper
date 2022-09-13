const express = require('express')
const app = express()
const dbo = require('./db/conn');
require('dotenv').config()

app.get('/', (req, res) => {
  const dbConnect = dbo.getDb();
  // dbConnect
  //   .collection('Posts')
  //   .find({})
  //   .limit(50)
  //   .toArray(function (err, result) {
  //     if (err) {
  //       res.status(400).send('Error fetching listings!');
  //     } else {
  //       res.json(result);
  //     }
  //   });
  res.send('Dzieki wiksze pozdrawiam Cie')
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