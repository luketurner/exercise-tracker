import { and, eq, asc } from "drizzle-orm";
import { db } from "../db";
import { setsTable } from "../db/schema";
import { getExercise } from "./exercises";

export async function getSetsForDay(date: string, userId: string) {
  const sets = await db.query.setsTable.findMany({
    where: and(eq(setsTable.user, userId), eq(setsTable.date, date)),
    orderBy: asc(setsTable.order),
  });
  return await Promise.all(
    sets.map(async (set) => {
      const exercise = await getExercise(set.exercise, userId);
      return {
        ...set,
        exercise,
      };
    })
  );
}
