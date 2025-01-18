import { toNodeHandler } from "better-auth/node";
import { auth, getSessionMiddleware, requireSessionOrRedirect } from "./auth";
import type { Request, Response } from "express";
import type { Session, User } from "better-auth";
import {
  exercisesTable,
  setsTable,
  type ParameterDefinition,
} from "./db/schema";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";
import {
  allParameters,
  getExercise,
  getExercisesForUser,
} from "./models/exercises";
import { getSetsForDay } from "./models/sets";

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
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    if (Array.isArray(req.query.editingSet)) {
      return res.status(400).send("Cannot edit multiple sets at once");
    }

    const editingSet =
      typeof req.query.editingSet === "string"
        ? parseInt(req.query.editingSet, 10)
        : undefined;

    const exercises = await getExercisesForUser(user.id);

    const today = new Date().toLocaleDateString();

    const sets = await getSetsForDay(today, user.id);

    const nextSetOrder = (sets[sets.length - 1]?.order ?? 0) + 1;

    res.render("today", {
      title: "Today",
      user,
      exercises,
      today,
      sets,
      nextSetOrder,
      editingSet,
      allParameters: allParameters(),
    });
  }
);

authenticatedRouter.post(
  "/sets",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const { exercise: exerciseId, date, order } = req.body;

    const exercise = await getExercise(parseInt(exerciseId, 10), user.id);

    const parameters: Record<string, string> = {};

    for (const parameter of exercise.parameters ?? []) {
      parameters[parameter.id] = req.body[parameter.id];
    }

    await db.insert(setsTable).values({
      user: user.id,
      exercise: exerciseId,
      date,
      order,
      parameters,
    });

    res.redirect("/today");
  }
);

authenticatedRouter.post(
  "/sets/:id",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const id = req.params.id;

    const { exercise: exerciseId } = req.body;

    const exercise = await getExercise(parseInt(exerciseId, 10), user.id);

    const parameters: Record<string, string> = {};

    for (const parameter of exercise.parameters ?? []) {
      parameters[parameter.id] = req.body[parameter.id];
    }

    await db
      .update(setsTable)
      .set({
        exercise: exerciseId,
        parameters,
      })
      .where(
        and(eq(setsTable.user, user.id), eq(setsTable.id, parseInt(id, 10)))
      );

    res.redirect("/today");
  }
);

authenticatedRouter.post(
  "/sets/:id/delete",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;
    const id = req.params.id;

    await db
      .delete(setsTable)
      .where(
        and(eq(setsTable.user, user.id), eq(setsTable.id, parseInt(id, 10)))
      );

    res.redirect("/today");
  }
);

authenticatedRouter.get(
  "/exercises",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const exercises = await getExercisesForUser(user.id);

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
      return res.status(400).send("Must specify a name");
    }

    await db.insert(exercisesTable).values({
      name: req.body.name,
      user: user.id,
    });

    res.redirect("/exercises");
  }
);

authenticatedRouter.get(
  "/exercises/:id",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;
    const id = req.params.id;

    const exercise = await getExercise(parseInt(id, 10), user.id);

    if (!exercise) {
      return res.sendStatus(404);
    }

    res.render("exercise", {
      title: `Exercise: ${exercise.name}`,
      user,
      exercise,
    });
  }
);

authenticatedRouter.post(
  "/exercises/:id",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;
    const id = req.params.id;

    if (!req.body.name) {
      return res.status(400).send("Must specify a name");
    }

    const parameters: ParameterDefinition[] = [];

    for (const parameter of allParameters()) {
      if (req.body[parameter.id]) {
        parameters.push(parameter);
      }
    }

    console.log(parameters);

    const exercise = await db
      .update(exercisesTable)
      .set({
        name: req.body.name,
        parameters,
      })
      .where(
        and(
          eq(exercisesTable.user, user.id),
          eq(exercisesTable.id, parseInt(id, 10))
        )
      );

    res.redirect(`/exercises/${id}`);
  }
);

authenticatedRouter.post(
  "/exercises/:id/delete",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;
    const id = req.params.id;

    await db
      .delete(exercisesTable)
      .where(
        and(
          eq(exercisesTable.user, user.id),
          eq(exercisesTable.id, parseInt(id, 10))
        )
      );

    res.redirect("/exercises");
  }
);

app.use(authenticatedRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
