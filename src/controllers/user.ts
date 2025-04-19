import { Router } from "express";
import type { Response } from "express";
import { controllerMethod } from "../util";
import type { RequestWithGuaranteedSession } from "../router";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { getExercisesForUserExport } from "../models/exercises";
import { getSetsForUserExport } from "../models/sets";
import { user as userTable } from "../db/schema";

export const userRouter = Router();

userRouter.post(
  "/user/delete",
  controllerMethod(async (req: RequestWithGuaranteedSession, res: Response) => {
    const { user } = req;

    await db.delete(userTable).where(eq(userTable.id, user.id));

    res.redirect("/");
  })
);

userRouter.get(
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
