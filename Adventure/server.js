const express = require("express");
const fs = require("fs");
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

const scenes = JSON.parse(fs.readFileSync("p2.json"));

app.get("/", (req, res) => {
  res.redirect("/game/start");
});

app.get("/game/:scene", (req, res) => {
  const scene = scenes[req.params.scene];

  if (!scene) {
    return res.send("Scene not found");
  }

  res.render("game", {
    sceneText: scene.text,
    options: scene.options,
    currentScene: req.params.scene
  });
});

app.post("/choice", (req, res) => {
  const nextScene = req.body.next;
  res.redirect(`/game/${nextScene}`);
});

app.listen(3000, () => {
  console.log("Game running at http://localhost:3000");
});
