import { toNodeHandler } from "better-auth/node";
import { db } from "./db";
import { exercisesTable } from "./db/schema";
import { auth } from "./auth";

const express = require("express");
const app = express();
const port = 3000;

// Note -- make sure to use JSON middleware _after_ this
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.static("public"));

app.set("view engine", "pug");

app.get("/", async (req, res) => {
  const exercise = (await db.select().from(exercisesTable).limit(1))[0];
  res.render("index", {
    title: "Exercise Tracker",
    message: "Hello world!",
    exercise,
  });
});

if ((await db.$count(exercisesTable)) == 0) {
  console.log("Inserting demo exercise");
  await db.insert(exercisesTable).values({
    name: "Demo exercise",
  });
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
