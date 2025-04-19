import { Router } from "express";
import type { Response } from "express";
import { controllerMethod, relativeDate, toDateString } from "../util";
import type { RequestWithGuaranteedSession } from "../router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { exercisesTable, type ParameterDefinition } from "../db/schema";
import {
  getExercisesForUser,
  getExercise,
  allParameters,
} from "../models/exercises";
import { getSetsForExercise } from "../models/sets";
import {
  validateRequest,
  numericStringSchema,
  nameSchema,
  allParametersDeclarationSchema,
} from "../validation";

export const exerciseRouter = Router();

exerciseRouter.get(
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

exerciseRouter.get(
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

exerciseRouter.get(
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

exerciseRouter.post(
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

exerciseRouter.post(
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

exerciseRouter.post(
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
