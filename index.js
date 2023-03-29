const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const PORT = 8080;
const formidable = require("formidable");
var mysql = require("mysql");
const cors = require("cors");
var fs = require("fs");
const helmet = require("helmet");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// connection configurations
var dbConn = mysql.createConnection({
  host: "103.76.183.192",
  user: "project",
  password: "Admin2016!",
  database: "Onmyoji News",
});
// connect to database
dbConn.connect();

app.use((req, res, next) => {
  helmet.contentSecurityPolicy({
    directives: {
      "script-src": ["'self'"],
      upgradeInsecureRequests: null,
    },
  });
  res.append("Access-Control-Allow-Origin", "*");
  res.append(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS, POST, PUT, PATCH, DELETE"
  );
  res.append("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.status(200);
    res.end();
  } else {
    next();
  }
});

app.post("/SetAllNewsToActive", (req, res) => {
  let query = `UPDATE tbl_news SET status = 1`;
  dbConn.query(query, function (error, results, fields) {
    if (error) throw error;
    res.status(200).json(results);
  });
});

app.post("/GetAllNews", (req, res) => {
  let limit = req.body.limit;
  let page = req.body.page;
  let query = `SELECT * FROM tbl_news INNER JOIN tbl_region ON (tbl_news.region_id = tbl_region.region_id) WHERE tbl_news.status=1 LIMIT ${limit} OFFSET ${page}`;
  dbConn.query(query, function (error, results, fields) {
    if (error) throw error;
    res.status(200).json(results);
  });
});

app.post("/GetNewsById", (req, res) => {
  let query = `SELECT * FROM tbl_news INNER JOIN tbl_region ON (tbl_news.region_id = tbl_region.region_id) WHERE (tbl_news.id=${req.body.id} AND tbl_news.status=1)`;
  dbConn.query(query, function (error, results, fields) {
    if (error) throw error;
    res.status(200).json(results);
  });
});

app.post("/InsertNews", (req, res) => {
  let body = req.body;
  let query = "INSERT INTO tbl_news SET ?";
  dbConn.query(query, body, function (error, results, fields) {
    if (error) throw error;
    res.status(200).json("Success");
  });
});

app.post("/InsertRegion", (req, res) => {
  let body = req.body;
  let query = "INSERT INTO tbl_region SET ?";
  dbConn.query(query, body, function (error, results, fields) {
    if (error) throw error;
    res.status(200).json("Success");
  });
});

app.post("/UpdateNews", (req, res) => {
  let body = req.body;
  let query = `UPDATE tbl_news SET ? WHERE id = ${req.body.id}`;
  dbConn.query(query, body, function (error, results, fields) {
    if (error) throw error;
    res.status(200).json("Success");
  });
});

app.post("/UpdateNewStatus", (req, res) => {
  let body = req.body;
  let query = `UPDATE tbl_news SET status = NOT status WHERE id=${body.id}`;
  dbConn.query(query, body, function (error, results, fields) {
    if (error) throw error;
    res.status(200).json("Success");
  });
});

app.post("/UpdateView", (req, res) => {
  let body = req.body;
  let query = `UPDATE tbl_news SET views = views + 1 WHERE id=${body.id}`;
  dbConn.query(query, body, function (error, results, fields) {
    if (error) throw error;
    res.status(200).json("Success");
  });
});

app.post("/fileupload", function (req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    var oldpath = files.file.filepath;
    var newpath =
      "C:/Work/aot-news/src/assets/image/" + files.file.originalFilename;
    fs.rename(oldpath, newpath, function (err) {
      if (err) throw err;
      res.status(200).json("./assets/image/" + files.file.originalFilename);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Service review is running`);
});
