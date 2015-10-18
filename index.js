var express = require("express");
var app = express();

app.get("/", function(req, res) {
  res.send("hello world");
});

app.use("/ui", express.static("ui"));

app.listen(3000);

