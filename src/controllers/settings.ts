import { Router } from "express";
import type { Response } from "express";
import { controllerMethod } from "../util";
import type { RequestWithGuaranteedSession } from "../router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { user as userTable } from "../db/schema";
import { allUnits, defaultUnit } from "../models/exercises";
import {
  validateRequest,
  allDistanceUnitsEnumSchema,
  allWeightUnitsEnumSchema,
} from "../validation";

export const settingsRouter = Router();

settingsRouter.get(
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

settingsRouter.post(
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

    res.status(200).send({ status: "ok" });
  })
);
