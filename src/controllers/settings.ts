import { eq } from "drizzle-orm";
import type { Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { user as userTable, type ColorScheme } from "../db/schema";
import type { RequestWithGuaranteedSession } from "../router";
import { allColorSchemes, allUnits, defaultUnit } from "../shared";
import { controllerMethod } from "../util";
import {
  allDistanceUnitsEnumSchema,
  allWeightUnitsEnumSchema,
  validateRequest,
} from "../validation";

export const settingsRouter = Router();

settingsRouter.get(
  "/settings",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      query: { back },
    } = validateRequest(
      req,
      z.object({
        query: z.object({
          back: z.string().optional(),
        }),
      })
    );

    const units = allUnits();

    res.render("settings", {
      ...req.viewBag,
      title: "Settings",
      weightUnits: units.filter((unit) => unit.type === "weight"),
      distanceUnits: units.filter((unit) => unit.type === "distance"),
      user,
      back: back || "/today",
    });
  })
);

settingsRouter.post(
  "/settings",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    const {
      body: { preferredUnits, preferredTheme },
    } = validateRequest(
      req,
      z.object({
        body: z.object({
          preferredUnits: z.object({
            weight: allWeightUnitsEnumSchema.optional(),
            distance: allDistanceUnitsEnumSchema.optional(),
          }),
          preferredTheme: z.enum(
            allColorSchemes().map((s) => s.id) as [string, ...string[]]
          ),
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
        preferredTheme: preferredTheme as ColorScheme | null,
      })
      .where(eq(userTable.id, user.id));

    res.status(200).send({ status: "ok" });
  })
);
