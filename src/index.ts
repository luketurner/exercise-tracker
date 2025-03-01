import { toNodeHandler } from "better-auth/node";
import { auth, getSessionMiddleware, requireSessionOrRedirect } from "./auth";
import type { NextFunction, Request, Response } from "express";
import type { Session } from "better-auth";
import {
  exercisesTable,
  setsTable,
  user as userTable,
  type ParameterDefinition,
  type ParameterValue,
  type User,
} from "./db/schema";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";
import {
  allIntensities,
  allParameters,
  allUnits,
  convertUnit,
  defaultUnit,
  getExercise,
  getExercisesForUser,
} from "./models/exercises";
import { getSetsForDay, getSetsForExercise } from "./models/sets";
import { relativeDate, toDateString } from "./util";
import multer from "multer";

export interface RequestWithSession extends Request {
  user?: User;
  session?: Session;
  viewBag?: Record<string, any>;
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
app.use(multer().none());

app.use((req: RequestWithSession, res: Response, next: NextFunction) => {
  req.viewBag = {
    allParameters: allParameters(),
    allUnits: allUnits(),
    allIntensities: allIntensities(),
    defaultUnit,
    convertUnit,
  };

  next();
});

app.set("view engine", "pug");

app.use(getSessionMiddleware);

app.get("/", async (req: RequestWithSession, res: Response) => {
  const { user } = req;

  if (user) {
    return res.redirect("/today");
  }

  res.render("index", {
    ...req.viewBag,
    title: "Exercise Tracker",
    message: "Hello world!",
    user,
  });
});

const authenticatedRouter = express.Router();

authenticatedRouter.use(requireSessionOrRedirect);

authenticatedRouter.get(
  "/:date(today|\\d{4}-\\d{2}-\\d{2})",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    if (Array.isArray(req.query.editingSet)) {
      return res.status(400).send("Cannot edit multiple sets at once");
    }

    const editingSet =
      typeof req.query.editingSet === "string"
        ? parseInt(req.query.editingSet, 10)
        : undefined;

    const isToday = req.params.date === "today";
    const date =
      req.params.date === "today" ? new Date() : new Date(req.params.date);

    const dateString = toDateString(date);
    const today = toDateString(new Date());

    const yesterdayString = toDateString(relativeDate(date, -1));
    const tomorrowString = toDateString(relativeDate(date, 1));

    if (dateString === today && !isToday) {
      res.redirect("/today");
    }

    const exercises = await getExercisesForUser(user.id);
    const sets = await getSetsForDay(dateString, user.id);

    const nextSetOrder = (sets[sets.length - 1]?.order ?? 0) + 1;

    res.render("today", {
      ...req.viewBag,
      title: dateString,
      user,
      exercises,
      date: dateString,
      today,
      sets,
      nextSetOrder,
      editingSet,
      isToday,
      yesterday: yesterdayString,
      tomorrow: tomorrowString,
    });
  }
);

authenticatedRouter.post(
  "/sets",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const { exercise: exerciseId, date, order } = req.body;

    const exercise = await getExercise(parseInt(exerciseId, 10), user.id);

    const parameters: Record<string, ParameterValue> = {};

    for (const parameter of exercise.parameters ?? []) {
      const value = req.body[parameter.id];
      switch (parameter.dataType) {
        case "distance":
          parameters[parameter.id] = {
            value,
            unit: defaultUnit(parameter.dataType, user) as any,
          };
          break;
        case "duration":
          parameters[parameter.id] = {
            minutes: value,
          };
          break;
        case "weight":
          parameters[parameter.id] = {
            value,
            unit: defaultUnit(parameter.dataType, user) as any,
          };
          break;
        default:
          parameters[parameter.id] = value;
          break;
      }
    }

    await db.insert(setsTable).values({
      user: user.id,
      exercise: exerciseId,
      date,
      order,
      parameters,
    });

    res.sendStatus(200);
  }
);

authenticatedRouter.post(
  "/sets/:id",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const id = req.params.id;

    const { exercise: exerciseId } = req.body;

    const exercise = await getExercise(parseInt(exerciseId, 10), user.id);

    const parameters: Record<string, ParameterValue> = {};

    for (const parameter of exercise.parameters ?? []) {
      const value = req.body[parameter.id];
      switch (parameter.dataType) {
        case "distance":
          parameters[parameter.id] = {
            value,
            unit: defaultUnit(parameter.dataType, user) as any,
          };
          break;
        case "duration":
          parameters[parameter.id] = {
            minutes: value,
          };
          break;
        case "weight":
          parameters[parameter.id] = {
            value,
            unit: defaultUnit(parameter.dataType, user) as any,
          };
          break;
        default:
          parameters[parameter.id] = value;
          break;
      }
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

    res.sendStatus(200);
  }
);

authenticatedRouter.post(
  "/sets/:id/delete",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;
    const id = req.params.id;

    const deletedSets = await db
      .delete(setsTable)
      .where(
        and(eq(setsTable.user, user.id), eq(setsTable.id, parseInt(id, 10)))
      )
      .returning();
    res.redirect(`/${deletedSets?.[0]?.date}`);
  }
);

authenticatedRouter.get(
  "/exercises",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const exercises = await getExercisesForUser(user.id);

    res.render("exercises", {
      ...req.viewBag,
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
      parameters: [],
    });

    res.redirect("/exercises");
  }
);

authenticatedRouter.get(
  "/exercises/:id",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;
    const id = parseInt(req.params.id, 10);

    const exercise = await getExercise(id, user.id);

    if (!exercise) {
      return res.sendStatus(404);
    }

    res.render("exercise", {
      ...req.viewBag,
      title: `Exercise: ${exercise.name}`,
      user,
      exercise,
    });
  }
);

authenticatedRouter.get(
  "/exercises/:id/historical",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;
    const id = parseInt(req.params.id, 10);
    const lookback =
      req.query.lookback === "all"
        ? "all"
        : typeof req.query.lookback === "string"
        ? parseInt(req.query.lookback, 10)
        : 365;

    const exercise = await getExercise(id, user.id);

    if (!exercise) {
      return res.sendStatus(404);
    }

    const historicalSets = await getSetsForExercise(
      id,
      user.id,
      lookback === "all"
        ? undefined
        : toDateString(relativeDate(new Date(), -lookback))
    );

    res.render("historical", {
      ...req.viewBag,
      title: `Historical data: ${exercise.name}`,
      user,
      exercise,
      historicalSets,
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

authenticatedRouter.get(
  "/settings",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const units = allUnits();

    res.render("settings", {
      ...req.viewBag,
      title: "Settings",
      weightUnits: units.filter((unit) => unit.type === "weight"),
      distanceUnits: units.filter((unit) => unit.type === "distance"),
      user,
    });
  }
);

authenticatedRouter.post(
  "/settings",
  async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    await db
      .update(userTable)
      .set({
        preferredUnits: {
          weight: req.body.preferredUnits.weight,
          distance: req.body.preferredUnits.distance,
        },
      })
      .where(eq(userTable.id, user.id));

    res.redirect("/settings");
  }
);

app.use(authenticatedRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
