var MongoClient = require('mongodb').MongoClient;
var express = require("express");
var app = express();
var async = require("async");
var request = require("request");

app.use("/", express.static("jobsearch"));

app.get("/api/job-seekers", function(req, res) {
  MongoClient.connect("mongodb://localhost:27017/hack", function(err, db) {
    if (err) {
      res.status(500).send(err);
    } else {
      db.collection("users").find({}).toArray(function(err, users) {
        if (err) {
          res.status(500).send(err);
        } else {
          async.map(users, function(user, callback) {

            var url = "http://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(user.address.fullAddress) + "&format=json";
            request(url, function(err, response, body) {
              if (err) {
                console.log(JSON.stringify(err));
                callback(err);
              } else {
                var info = JSON.parse(body);
                user = JSON.parse(JSON.stringify(user));
                //console.log(info);
                if (info.length == 0) {
                  user.lng = 0;
                  user.lat = 0;
                } else {
                  user.lng = info[0].lon;
                  user.lat = info[0].lat;
                }
                callback(null, user);
              }
            });

          }, function(error, users) {
            res.send(users);
            db.close();
          });
        }
      });
    }
  });
});

app.use("/admin", express.static("ui"));

app.listen(80);

