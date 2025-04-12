import { toNodeHandler } from "better-auth/node";
import { auth, getSessionMiddleware, requireSessionOrRedirect } from "./auth";
import type { NextFunction, Request, Response } from "express";
import type { Session } from "better-auth";
import {
  exercisesTable,
  setsTable,
  user as userTable,
  type ExerciseSet,
  type ParameterDefinition,
  type ParameterValue,
  type User,
} from "./db/schema";
import { db } from "./db";
import { eq, and, sql, gt, lte, gte, lt } from "drizzle-orm";
import {
  allIntensities,
  allParameters,
  allUnits,
  convertUnit,
  defaultUnit,
  displayString,
  displayStringForTable,
  getExercise,
  getExercisesForUser,
  getExercisesForUserExport,
} from "./models/exercises";
import {
  buildSetParameters,
  getLatestDaySetsForExercise,
  getSetById,
  getSetsForDay,
  getSetsForExercise,
  getSetsForUserExport,
} from "./models/sets";
import {
  allManualPages,
  controllerMethod,
  getManualPath,
  relativeDate,
  toDateString,
} from "./util";
import multer from "multer";
import { z } from "zod";
import {
  allDistanceUnitsEnumSchema,
  allParametersDeclarationSchema,
  allParametersInputSchema,
  allWeightUnitsEnumSchema,
  dateSchema,
  nameSchema,
  numericStringSchema,
  validateRequest,
} from "./validation";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { readFile } from "node:fs/promises";
import remarkGfm from "remark-gfm";

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
app.use(express.json());
app.use(multer().none());

app.use((req: RequestWithSession, res: Response, next: NextFunction) => {
  req.viewBag = {
    allParameters: allParameters(),
    allUnits: allUnits(),
    allIntensities: allIntensities(),
    defaultUnit,
    convertUnit,
    displayString,
    displayStringForTable,
  };

  next();
});

app.set("view engine", "pug");

app.use(getSessionMiddleware);

app.get(
  "/",
  controllerMethod(async (req: RequestWithSession, res: Response) => {
    const { user } = req;

    if (user) {
      return res.redirect("/today");
    }

    res.render("index", {
      ...req.viewBag,
      title: "Set",
      message: "Hello world!",
      user,
    });
  })
);

app.get(
  "/manual",
  controllerMethod(async (req: RequestWithSession, res: Response) => {
    res.redirect("/manual/intro");
  })
);

app.get(
  "/manual/:page",
  controllerMethod(async (req: RequestWithSession, res: Response) => {
    const { user } = req;

    const {
      params: { page },
    } = validateRequest(
      req,
      z.object({
        params: z.object({
          page: z.enum(allManualPages as [string, ...string[]]),
        }),
      })
    );

    const content = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(await readFile(getManualPath(page), { encoding: "utf-8" }));

    res.render("manual", {
      ...req.viewBag,
      title:
        "Manual: " +
        page
          .split("-")
          .map((s) => `${s[0].toUpperCase()}${s.substring(1)}`)
          .join(" "),
      content,
      user,
    });
  })
);

const authenticatedRouter = express.Router();

authenticatedRouter.use(requireSessionOrRedirect);

authenticatedRouter.get(
  "/:date(today|\\d{4}-\\d{2}-\\d{2})",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const { params } = validateRequest(
      req,
      z.object({
        params: z.object({
          date: z.string().regex(/^today|\d{4}-\d{2}-\d{2}$/),
        }),
      })
    );

    const isToday = params.date === "today";
    const date = params.date === "today" ? new Date() : new Date(params.date);

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

    const historicalSets: Record<string, ExerciseSet[]> = {};
    for (const exercise of exercises) {
      historicalSets[exercise.id] = await getLatestDaySetsForExercise(
        exercise.id,
        user.id,
        dateString
      );
    }

    res.render("today", {
      ...req.viewBag,
      title: dateString,
      user,
      exercises,
      date: dateString,
      today,
      sets,
      nextSetOrder,
      isToday,
      yesterday: yesterdayString,
      tomorrow: tomorrowString,
      historicalSets,
    });
  })
);

authenticatedRouter.post(
  "/sets",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      body: { exercise: exerciseId, date, order },
    } = validateRequest(
      req,
      z.object({
        body: z.object({
          exercise: numericStringSchema,
          date: dateSchema,
          order: numericStringSchema,
        }),
      })
    );

    const exercise = await getExercise(parseInt(exerciseId, 10), user.id);
    if (!exercise) throw new Error(`Invalid exercise: ${exerciseId}`);

    await db.insert(setsTable).values({
      user: user.id,
      exercise: exercise.id,
      date,
      order: parseInt(order, 10),
      parameters: {},
    });

    res.status(200).send({ status: "ok" });
  })
);

authenticatedRouter.post(
  "/sets/:id",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      params: { id },
      body: { exercise: exerciseId, parameters: parametersInBody },
    } = validateRequest(
      req,
      z.object({
        params: z.object({ id: numericStringSchema }),
        body: z.object({
          exercise: z.union([numericStringSchema, z.number()]),
          parameters: z.object(allParametersInputSchema),
        }),
      })
    );

    const exercise = await getExercise(
      typeof exerciseId === "string" ? parseInt(exerciseId, 10) : exerciseId,
      user.id
    );
    if (!exercise) throw new Error(`Invalid exercise: ${exerciseId}`);

    const parameters: Record<string, ParameterValue> = buildSetParameters(
      parametersInBody,
      exercise,
      user
    );

    await db
      .update(setsTable)
      .set({
        exercise: exercise.id,
        parameters,
      })
      .where(
        and(eq(setsTable.user, user.id), eq(setsTable.id, parseInt(id, 10)))
      );

    res.status(200).send({ status: "ok" });
  })
);

authenticatedRouter.post(
  "/sets/:id/delete",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      params: { id },
    } = validateRequest(
      req,
      z.object({
        params: z.object({ id: numericStringSchema }),
      })
    );

    const deletedSets = await db
      .delete(setsTable)
      .where(
        and(eq(setsTable.user, user.id), eq(setsTable.id, parseInt(id, 10)))
      )
      .returning();
    res.redirect(`/${deletedSets?.[0]?.date}`);
  })
);

authenticatedRouter.post(
  "/sets/:id/move",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      params: { id },
      body,
    } = validateRequest(
      req,
      z.object({
        params: z.object({ id: numericStringSchema }),
        body: z.object({
          oldOrder: numericStringSchema,
          newOrder: numericStringSchema,
        }),
      })
    );

    const oldOrder = parseInt(body.oldOrder, 10);
    const newOrder = parseInt(body.newOrder, 10);

    const existingSet = await getSetById(parseInt(id, 10), user.id);

    if (oldOrder !== existingSet.order) {
      throw new Error("Cannot move set, please refresh the page.");
    }

    if (oldOrder === newOrder) {
      return res.sendStatus(200);
    }

    await db.transaction(async (tx) => {
      if (oldOrder < newOrder) {
        await tx
          .update(setsTable)
          .set({
            order: sql`${setsTable.order} - 1`,
          })
          .where(
            and(
              eq(setsTable.user, user.id),
              eq(setsTable.date, existingSet.date),
              gt(setsTable.order, oldOrder),
              lte(setsTable.order, newOrder)
            )
          );
      } else {
        await tx
          .update(setsTable)
          .set({
            order: sql`${setsTable.order} + 1`,
          })
          .where(
            and(
              eq(setsTable.user, user.id),
              eq(setsTable.date, existingSet.date),
              gte(setsTable.order, newOrder),
              lt(setsTable.order, oldOrder)
            )
          );
      }

      await tx
        .update(setsTable)
        .set({
          order: newOrder,
        })
        .where(
          and(eq(setsTable.user, user.id), eq(setsTable.id, parseInt(id, 10)))
        );
    });
    res.sendStatus(200);
  })
);

authenticatedRouter.get(
  "/exercises",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const exercises = await getExercisesForUser(user.id);

    res.render("exercises", {
      ...req.viewBag,
      title: "Exercises",
      user,
      exercises,
    });
  })
);

authenticatedRouter.post(
  "/exercises",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      body: { name },
    } = validateRequest(
      req,
      z.object({
        body: z.object({
          name: nameSchema,
        }),
      })
    );

    const exercise = (
      await db
        .insert(exercisesTable)
        .values({
          name,
          user: user.id,
          parameters: [],
        })
        .returning()
    )[0];

    res.redirect(`/exercises/${exercise.id}`);
  })
);

authenticatedRouter.get(
  "/exercises/:id",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      params: { id },
    } = validateRequest(
      req,
      z.object({
        params: z.object({ id: numericStringSchema }),
      })
    );

    const exercise = await getExercise(parseInt(id, 10), user.id);

    if (!exercise) {
      return res.sendStatus(404);
    }

    res.render("exercise", {
      ...req.viewBag,
      title: `Exercise: ${exercise.name}`,
      user,
      exercise,
    });
  })
);

authenticatedRouter.get(
  "/exercises/:id/historical",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const { params, query } = validateRequest(
      req,
      z.object({
        params: z.object({ id: numericStringSchema }),
        query: z.object({
          lookback: z
            .string()
            .regex(/^all|\d+$/)
            .optional(),
        }),
      })
    );

    const id = parseInt(params.id, 10);

    const lookback =
      query.lookback === "all"
        ? "all"
        : typeof query.lookback === "string"
        ? parseInt(query.lookback, 10)
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
  })
);

authenticatedRouter.post(
  "/exercises/:id",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      params: { id },
      body,
    } = validateRequest(
      req,
      z.object({
        params: z.object({ id: numericStringSchema }),
        body: z.object({
          name: nameSchema,
          ...allParametersDeclarationSchema,
        }),
      })
    );

    const parameters: ParameterDefinition[] = [];

    for (const parameter of allParameters()) {
      if ((body as any)[parameter.id]) {
        parameters.push(parameter);
      }
    }

    await db
      .update(exercisesTable)
      .set({
        name: body.name,
        parameters,
      })
      .where(
        and(
          eq(exercisesTable.user, user.id),
          eq(exercisesTable.id, parseInt(id, 10))
        )
      );

    res.sendStatus(200);
  })
);

authenticatedRouter.post(
  "/exercises/:id/delete",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      params: { id },
    } = validateRequest(
      req,
      z.object({
        params: z.object({ id: numericStringSchema }),
      })
    );

    await db
      .delete(exercisesTable)
      .where(
        and(
          eq(exercisesTable.user, user.id),
          eq(exercisesTable.id, parseInt(id, 10))
        )
      );

    res.redirect("/exercises");
  })
);

authenticatedRouter.get(
  "/settings",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const units = allUnits();

    res.render("settings", {
      ...req.viewBag,
      title: "Settings",
      weightUnits: units.filter((unit) => unit.type === "weight"),
      distanceUnits: units.filter((unit) => unit.type === "distance"),
      user,
    });
  })
);

authenticatedRouter.post(
  "/settings",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      body: { preferredUnits },
    } = validateRequest(
      req,
      z.object({
        body: z.object({
          preferredUnits: z.object({
            weight: allWeightUnitsEnumSchema.optional(),
            distance: allDistanceUnitsEnumSchema.optional(),
          }),
        }),
      })
    );

    await db
      .update(userTable)
      .set({
        preferredUnits: {
          weight: preferredUnits.weight ?? defaultUnit("weight", user)!,
          distance: preferredUnits.distance ?? defaultUnit("distance", user)!,
        },
      })
      .where(eq(userTable.id, user.id));

    res.sendStatus(200);
  })
);

authenticatedRouter.post(
  "/user/delete",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    await db.delete(userTable).where(eq(userTable.id, user.id));

    res.redirect("/");
  })
);

authenticatedRouter.get(
  "/user/export",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const userData = { preferredUnits: user.preferredUnits };
    const exercises = await getExercisesForUserExport(user.id);
    const sets = await getSetsForUserExport(user.id);

    const exportData = {
      user: userData,
      exercises,
      sets,
    };

    res.set(
      "content-disposition",
      `attachment; filename="user_${user.id}_${Date.now()}.json"`
    );
    res.send(exportData);
  })
);

app.use(authenticatedRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
