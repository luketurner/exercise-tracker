import { toNodeHandler } from "better-auth/node";
import { auth, getSessionMiddleware, requireSessionOrRedirect } from "./auth";
import type { Request, Response } from "express";
import type { Session, User } from "better-auth";
import { exercisesTable } from "./db/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface RequestWithSession extends Request {
  user?: User;
  session?: Session;
}

export interface RequestWithGuaranteedSession extends RequestWithSession {
  user: User;
  session: Session;
}

const express = require("express");
const app = express();
const port = 3000;

// Note -- make sure to use JSON middleware _after_ this
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");

app.use(getSessionMiddleware);

app.get("/", async (req: RequestWithSession, res: Response) => {
  const { user } = req;

  if (user) {
    return res.redirect("/today");
  }

  res.render("index", {
    title: "Exercise Tracker",
    message: "Hello world!",
    user,
  });
});

const authenticatedRouter = express.Router();

authenticatedRouter.use(requireSessionOrRedirect);

authenticatedRouter.get(
  "/today",
  async (req: RequestWithSession, res: Response) => {
    const { user } = req;

    res.render("today", {
      title: "Today",
      user,
    });
  }
);

authenticatedRouter.get(
  "/exercises",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const exercises = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.user, user.id));

    res.render("exercises", {
      title: "Exercises",
      user,
      exercises,
    });
  }
);

authenticatedRouter.post(
  "/exercises",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    if (!req.body.name) {
      throw new Error("Must specify a name");
    }

    await db.insert(exercisesTable).values({
      name: req.body.name,
      user: user.id,
    });

    res.redirect("/exercises");
  }
);

app.use(authenticatedRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
