const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Welcome to Paymo1");
});

app.listen(port, () => {
  console.log(`Paymo app listening on port ${port}`);
});
