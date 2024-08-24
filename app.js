const express = require("express");
const port = 3000;
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Welcome to Paymo1");
});

app.listen(port, () => {
  console.log(`Paymo app listening on port ${port}`);
});
