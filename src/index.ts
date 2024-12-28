import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { db } from "./db";
import { exercisesTable } from "./db/schema";
import { auth, getSessionMiddleware, requireSessionOrRedirect } from "./auth";

const express = require("express");
const app = express();
const port = 3000;

// Note -- make sure to use JSON middleware _after_ this
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.static("public"));

app.set("view engine", "pug");

app.use(getSessionMiddleware);

app.get("/", async (req, res) => {
  const exercise = (await db.select().from(exercisesTable).limit(1))[0];

  const { user } = req;

  res.render("index", {
    title: "Exercise Tracker",
    message: "Hello world!",
    exercise,
    user,
  });
});

const authenticatedRouter = express.Router();

authenticatedRouter.use(requireSessionOrRedirect);

authenticatedRouter.get("/today", async (req, res) => {
  const { user } = req;

  res.render("today", {
    title: "Today",
    user,
  });
});

app.use(authenticatedRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
