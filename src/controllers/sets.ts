import { and, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import type { Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { setsTable, type ExerciseSet, type ParameterValue } from "../db/schema";
import {
  getExercise,
  getExercisesForUser,
  updateExerciseLastUsed,
} from "../models/exercises";
import {
  buildSetParameters,
  getLatestDaySetsForExercise,
  getSetById,
  getSetsForDay,
} from "../models/sets";
import type { RequestWithGuaranteedSession } from "../router";
import { allParameters } from "../shared";
import { controllerMethod, relativeDate, toDateString } from "../util";
import {
  dateSchema,
  numericStringSchema,
  validateRequest,
} from "../validation";

export const setsRouter = Router();

setsRouter.get(
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

setsRouter.post(
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

    const [{ createdAt }] = await db
      .insert(setsTable)
      .values({
        user: user.id,
        exercise: exercise.id,
        date,
        order: parseInt(order, 10),
        parameters: {},
      })
      .returning({ createdAt: setsTable.createdAt });

    await updateExerciseLastUsed(exercise.id, createdAt);

    res.status(200).send({ status: "ok" });
  })
);

setsRouter.post(
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
          parameters: z.object(
            allParameters().reduce(
              (m, p) => ({
                ...m,
                [p.id]:
                  p.dataType === "duration"
                    ? z
                        .object({
                          minutes: z.string(),
                          seconds: z.string(),
                          hours: z.string(),
                        })
                        .optional()
                    : z.string().optional(),
              }),
              {}
            )
          ),
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

    const [{ createdAt }] = await db
      .update(setsTable)
      .set({
        exercise: exercise.id,
        parameters,
      })
      .where(
        and(eq(setsTable.user, user.id), eq(setsTable.id, parseInt(id, 10)))
      )
      .returning({ createdAt: setsTable.createdAt });
    await updateExerciseLastUsed(exercise.id, createdAt);

    res.status(200).send({ status: "ok" });
  })
);

setsRouter.delete(
  "/sets/:id",
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
      .delete(setsTable)
      .where(
        and(eq(setsTable.user, user.id), eq(setsTable.id, parseInt(id, 10)))
      )
      .returning();
    res.status(200).send({ status: "ok" });
  })
);

setsRouter.post(
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
