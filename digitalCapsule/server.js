
const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const file = "p1.json";


function readData() {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function saveData(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


app.post("/addData", (req, res) => {
  const { message, unlockDate } = req.body;

  if (!message || !unlockDate) {
    return res.status(400).json({
      error: "Message and unlockDate required"
    });
  }

  const capsules = readData();

  const newId =
    capsules.length > 0
      ? capsules[capsules.length - 1].id + 1
      : 1;

  const newCapsule = {
    id: newId,
    message,
    unlockDate,
    createdAt: new Date()
  };

  capsules.push(newCapsule);
  saveData(capsules);

  res.status(201).json({
    message: "Capsule created",
    capsuleId: newId
  });
});


app.get("/capsule/:id", (req, res) => {
  const capsules = readData();

  const capsule = capsules.find(
    c => c.id === parseInt(req.params.id)
  );

  if (!capsule) {
    return res.status(404).json({
      error: "Capsule not found"
    });
  }

  const now = new Date();
  const unlockTime = new Date(capsule.unlockDate);

  if (now < unlockTime) {
    return res.status(403).json({
      message: "Capsule is locked 🔒",
      unlocksAt: capsule.unlockDate
    });
  }

  res.json({
    message: "Capsule unlocked 🎉",
    data: capsule.message
  });
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});




