const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const PORT = 80;
const formidable = require("formidable");
var mysql = require("mysql");
const cors = require("cors");
var fs = require("fs");
const helmet = require("helmet");

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// connection configurations
var dbConn = mysql.createConnection({
  host: "103.76.183.192",
  user: "project",
  password: "Admin2016!",
  database: "Onmyoji News",
});
// connect to database
dbConn.connect();

app.use(
  bodyParser.urlencoded({ extended: true }),
  bodyParser.json(),
  async (req, res, next) => {
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
    if (await CheckToken(req.query.token, req._parsedUrl.pathname)) {
      next();
    } else {
      res.status(401).json("401 Unauthorized");
      res.end();
    }
  }
);

const ListNoToken = [
  "/Login",
  "/LoginSocial",
  "/InsertUser",
  "/CheckDuplicateUser",
  "/GetAllNews",
  "/GetNewsById",
  "/GetCommentByHostId"
];

const CheckToken = async (token, url) => {
  return new Promise((resolve, reject) => {

    if (ListNoToken.find((e) => e.toString() == url.toString())) {
      resolve(true);
      return;
    }
    let query = `SELECT * FROM tbl_users WHERE tbl_users.token = '${token}'`;
    dbConn.query(query, function (error, results, fields) {
      if (error) throw error;
      resolve(results?.length ? true : false);
    });
  });
};

const SetToken = async (user) => {
  return new Promise((resolve, reject) => {
    let token = btoa(JSON.stringify(user));
    let body = {
      token: token,
    };
    let query = `UPDATE tbl_users SET ? WHERE tbl_users.id = ${user.id}`;
    dbConn.query(query, body, function (error, results, fields) {
      if (error) throw error;
      resolve(true);
    });
  });
};

const Query = async (query, res, body) => {
  dbConn.query(query, body, function (error, results, fields) {
    if (error) throw error;
    results?.length && results[0]?.password ? delete results[0]?.password : null;
    res.status(200).json(results);
  });
};

app.post("/SetAllNewsToActive", (req, res) => {
  let query = `UPDATE tbl_news SET status = 1`;
  Query(query, res);
});

app.post("/GetAllNews", (req, res) => {
  let limit = req.body.limit;
  let page = req.body.page;
  let region_id = req.body?.region_id || null;
  let query = `SELECT * FROM tbl_news INNER JOIN tbl_region ON (tbl_news.region_id = tbl_region.region_id) WHERE tbl_news.status=1 ORDER BY tbl_news.views, tbl_news.region_id ASC `;
  if (region_id) {
    query += `AND tbl_news.region_id = ${region_id} `
  }

  query += `LIMIT ${limit} OFFSET ${page}`
  
  Query(query, res);
});

app.post("/GetNewsById", (req, res) => {
  let query = `SELECT * FROM tbl_news INNER JOIN tbl_region ON (tbl_news.region_id = tbl_region.region_id) INNER JOIN tbl_users ON (tbl_news.created_by = tbl_users.id) WHERE (tbl_news.id=${req.body.id} AND tbl_news.status=1)`;
  Query(query, res);
});

app.post("/InsertNews", (req, res) => {
  let query = "INSERT INTO tbl_news SET ?";
  Query(query, res, req.body);
});

app.post("/InsertRegion", (req, res) => {
  let query = "INSERT INTO tbl_region SET ?";
  Query(query, res, req.body);
});

app.post("/UpdateNews", (req, res) => {
  let query = `UPDATE tbl_news SET ? WHERE id = ${req.body.id}`;
  Query(query, res, req.body);
});

app.post("/UpdateNewStatus", (req, res) => {
  let query = `UPDATE tbl_news SET status = NOT status WHERE id=${req.body.id}`;
  Query(query, res, req.body);
});

app.post("/UpdateView", (req, res) => {
  let query = `UPDATE tbl_news SET views = views + 1 WHERE id=${req.body.id}`;
  Query(query, res, req.body);
});

app.post("/InsertComment", (req, res) => {
  let query = "INSERT INTO tbl_comments SET ?";
  Query(query, res, req.body);
});

app.post("/GetCommentByHostId", (req, res) => {
  let query = `SELECT * FROM tbl_comments  WHERE tbl_comments.host_id=${req.body.id}`;
  Query(query, res, req.body);
});

app.post("/DeleteNewById", (req, res) => {
  let query = `DELETE FROM tbl_news WHERE tbl_news.id=${req.body.id}`;
  Query(query, res, req.body);
});

app.post("/DeleteCommentById", (req, res) => {
  let query = `DELETE FROM tbl_comments WHERE tbl_comments.comment_id=${req.body.comment_id}`;
  Query(query, res, req.body);
});

app.post("/InsertUser", (req, res) => {
  req.body.password = btoa(req.body.password);
  let query = `INSERT INTO tbl_users SET ?`;
  Query(query, res, req.body);
});

app.post("/CheckDuplicateUser", (req, res) => {
  let query = `SELECT username,email FROM tbl_users`;
  Query(query, res, req.body);
});

app.post("/Login", (req, res) => {
  req.body.password = btoa(req.body.password);
  let query = `SELECT id,username,first_name,last_name,email,image FROM tbl_users WHERE (tbl_users.username = '${req.body.username}' OR tbl_users.email = '${req.body.username}') AND tbl_users.password = '${req.body.password}'`;
  dbConn.query(query, req.body, async function (error, results, fields) {
    if (error) throw error;
    res.status(200).json(results);
    if (results?.length) {
      await SetToken(results[0]);
    }
  });
});

app.post("/LoginSocial", (req, res) => {
  let query = `SELECT id,username,first_name,last_name,email,image FROM tbl_users WHERE tbl_users.social_id = '${req.body.social_id}'`;
  dbConn.query(query, req.body, async function (error, results, fields) {
    if (error) throw error;
    res.status(200).json(results);
    if (results?.length) {
      await SetToken(results[0]);
    }
  });
});

const btoa = (text) => {
  return Buffer.from(text, "binary").toString("base64");
};

const atob = (text) => {
  return Buffer.from(text, "base64").toString();
};

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
