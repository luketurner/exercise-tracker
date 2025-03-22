import { and, eq, asc, gte, desc, lt } from "drizzle-orm";
import { db } from "../db";
import { setsTable } from "../db/schema";
import { getExercise } from "./exercises";

export async function getSetById(setId: number, userId: string) {
  return (
    await db
      .select()
      .from(setsTable)
      .where(and(eq(setsTable.user, userId), eq(setsTable.id, setId)))
  )[0];
}

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

export async function getSetsForExercise(
  exerciseId: number,
  userId: string,
  startingDate?: string
) {
  const sets = await db.query.setsTable.findMany({
    where: and(
      eq(setsTable.user, userId),
      eq(setsTable.exercise, exerciseId),
      startingDate ? gte(setsTable.date, startingDate) : undefined
    ),
    orderBy: [asc(setsTable.date), asc(setsTable.order)],
  });
  return sets;
}

export async function getLatestDaySetsForExercise(
  exerciseId: number,
  userId: string,
  endDate: string
) {
  const latestDay = (
    await db
      .select({ date: setsTable.date })
      .from(setsTable)
      .where(
        and(
          eq(setsTable.user, userId),
          eq(setsTable.exercise, exerciseId),
          lt(setsTable.date, endDate)
        )
      )
      .orderBy(desc(setsTable.date))
      .limit(1)
  )[0];

  if (!latestDay) {
    return [];
  }

  const sets = await db.query.setsTable.findMany({
    where: and(
      eq(setsTable.user, userId),
      eq(setsTable.exercise, exerciseId),
      eq(setsTable.date, latestDay.date)
    ),
    orderBy: [asc(setsTable.order)],
  });
  return sets;
}

export async function getSetsForUserExport(userId: string) {
  return await db
    .select({
      id: setsTable.id,
      exerciseId: setsTable.exercise,
      date: setsTable.date,
      order: setsTable.order,
      parameters: setsTable.parameters,
    })
    .from(setsTable)
    .where(eq(setsTable.user, userId))
    .orderBy(asc(setsTable.date), asc(setsTable.order));
}
