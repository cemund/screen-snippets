import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const app = express();
const port = 3000;
const API_url = "https://search.imdbot.workers.dev";

const db = new pg.Client({
  host: "localhost",
  user: "postgres",
  password: "postgresql",
  database: "screensnippets",
  port: 5432,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

let searchContent = [];
let reviews = [];

// Routes
app.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM reviews");
  reviews = result.rows;
  res.render("index.ejs", { reviews });
});

app.post("/create", async (req, res) => {
  try {
    const response = await axios.get(API_url + "/", {
      params: {
        q: req.body.title,
      },
    });

    const result = response.data;

    searchContent = result.description;

    res.render("new.ejs", { searchContent });
  } catch (error) {
    res.status(404);
  }
});

app.post("/new", async (req, res) => {
  const result = searchContent.findIndex(
    (content) => content["#IMDB_ID"] == req.body.id
  );
  if (result > -1) {
    try {
      await db.query(
        "INSERT INTO reviews (title, image_url, rating, notes, comments, date_watch) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          searchContent[result]["#TITLE"],
          searchContent[result]["#IMG_POSTER"],
          parseInt(req.body.rating),
          req.body.notes,
          req.body.comments,
          req.body.date,
        ]
      );
    } catch (error) {
      console.log(error);
      res.status(500);
    }
    res.redirect("/");
  } else {
    res.status(500);
  }
});

app.get("/review/:id", async (req, res) => {
  const result = await db.query("SELECT * FROM reviews WHERE id = $1", [
    req.params.id,
  ]);

  res.render("detail.ejs", { data: result.rows[0] });
});

app.post("/review/:id", async (req, res) => {
  const data = req.body;

  await db.query(
    "UPDATE reviews SET date_watch = $1, rating = $2, comments = $3, notes = $4 WHERE id = $5",
    [data.date, data.rating, data.comments, data.notes, req.params.id]
  );

  res.redirect("/review/" + req.params.id);
});

app.post("/edit/:id", async (req, res) => {
  if (req.body.delete) {
    await db.query("DELETE FROM reviews WHERE id = $1", [req.params.id]);
    res.redirect("/");
  } else {
    console.log("edit");
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log("Listening to port: " + port);
});
