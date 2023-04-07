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
  "/GetCommentByHostId",
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
      resolve(body);
    });
  });
};

const Query = async (query, res, body) => {
  return new Promise((resolve, reject) => {
    dbConn.query(query, body, function (error, results, fields) {
      if (error) resolve(res.status(400).json(error));

      resolve(results);
    });
  });
};

app.post("/SetAllNewsToActive", async (req, res) => {
  let query = `UPDATE tbl_news SET status = 1`;
  let results = await Query(query, res);
});

app.post("/GetAllNews", async (req, res) => {
  let limit = req.body.limit;
  let page = req.body.page;
  let region_id = req.body?.region_id || null;
  let query = `SELECT * FROM tbl_news INNER JOIN tbl_region ON (tbl_news.region_id = tbl_region.region_id) WHERE tbl_news.status=1 ORDER BY tbl_news.views DESC, tbl_news.region_id ASC `;
  if (region_id) {
    query += `AND tbl_news.region_id = ${region_id} `;
  }

  query += `LIMIT ${limit} OFFSET ${page}`;

  let results = await Query(query, res);
  res.status(200).json(results);
});

app.post("/GetNewsById", async (req, res) => {
  let query = `SELECT * FROM tbl_news INNER JOIN tbl_region ON (tbl_news.region_id = tbl_region.region_id) INNER JOIN tbl_users ON (tbl_news.created_by = tbl_users.id) WHERE (tbl_news.id=${req.body.id} AND tbl_news.status=1)`;
  let results = await Query(query, res);
  results?.length && results[0]?.password ? delete results[0]?.password : null;
  results?.length && results[0]?.token ? delete results[0]?.token : null;
  results?.length && results[0]?.id ? delete results[0]?.id : null;
  results?.length && results[0]?.email ? delete results[0]?.email : null;
  results?.length && results[0]?.first_name
    ? delete results[0]?.first_name
    : null;
  results?.length && results[0]?.last_name
    ? delete results[0]?.last_name
    : null;
  results?.length && results[0]?.social_id
    ? delete results[0]?.social_id
    : null;
  res.status(200).json(results);
});

app.post("/InsertNews", async (req, res) => {
  let query = "INSERT INTO tbl_news SET ?";
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/InsertRegion", async (req, res) => {
  let query = "INSERT INTO tbl_region SET ?";
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/UpdateNews", async (req, res) => {
  let query = `UPDATE tbl_news SET ? WHERE id = ${req.body.id}`;
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/UpdateNewStatus", async (req, res) => {
  let query = `UPDATE tbl_news SET status = NOT status WHERE id=${req.body.id}`;
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/UpdateView", async (req, res) => {
  let query = `UPDATE tbl_news SET views = views + 1 WHERE id=${req.body.id}`;
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/InsertComment", async (req, res) => {
  let query = "INSERT INTO tbl_comments SET ?";
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/GetCommentByHostId", async (req, res) => {
  let query = `SELECT * FROM tbl_comments INNER JOIN tbl_users ON (tbl_users.id = tbl_comments.comment_by) WHERE tbl_comments.host_id=${req.body.id}`;
  let results = await Query(query, res, req.body);
  for (let i of results) {
    i.password ? delete i.password : null;
    i.token ? delete i.token : null;
    i.id ? delete i.id : null;
    i.email ? delete i.email : null;
    i.first_name ? delete i.first_name : null;
    i.last_name ? delete i.last_name : null;
    i.social_id ? delete i.social_id : null;
  }

  res.status(200).json(results);
});

app.post("/DeleteNewById", async (req, res) => {
  let query = `DELETE FROM tbl_news WHERE tbl_news.id=${req.body.id}`;
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/DeleteCommentById", async (req, res) => {
  let query = `DELETE FROM tbl_comments WHERE tbl_comments.comment_id=${req.body.comment_id}`;
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/InsertUser", async (req, res) => {
  req.body.password = btoa(req.body.password);
  let query = `INSERT INTO tbl_users SET ?`;
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/CheckDuplicateUser", async (req, res) => {
  let query = `SELECT username,email FROM tbl_users`;
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
});

app.post("/Login", async (req, res) => {
  req.body.password = btoa(req.body.password);
  let query = `SELECT id,username,first_name,last_name,email FROM tbl_users WHERE (tbl_users.username = '${req.body.username}' OR tbl_users.email = '${req.body.username}') AND tbl_users.password = '${req.body.password}'`;
  let results = await Query(query, res, req.body);

  if (results?.length) {
    let token = await SetToken(results[0]);
    results[0].token = token;
    res.status(200).json(results);
  }
});

app.post("/LoginSocial", async (req, res) => {
  let query = `SELECT id,username,first_name,last_name,email FROM tbl_users WHERE tbl_users.social_id = '${req.body.social_id}'`;
  let results = await Query(query, res, req.body);
  res.status(200).json(results);
  if (results?.length) {
    let token = await SetToken(results[0]);
    results[0].token = token;
    res.status(200).json(results);
  }
});

const btoa = (text) => {
  return Buffer.from(text, "binary").toString("base64");
};

const atob = (text) => {
  return Buffer.from(text, "base64").toString();
};

app.post("/fileupload", function async(req, res) {
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
