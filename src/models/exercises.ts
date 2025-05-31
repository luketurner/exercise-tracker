import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import { exercisesTable } from "../db/schema";

export async function getExercisesForUser(userId: string) {
  return await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.user, userId))
    .orderBy(asc(exercisesTable.name));
}

export async function getExercisesForUserExport(userId: string) {
  const exercises = await getExercisesForUser(userId);
  return exercises.map((e) => ({
    id: e.id,
    name: e.name,
    parameters: e.parameters,
  }));
}

export async function getExercise(id: number, userId: string) {
  return (
    await db
      .select()
      .from(exercisesTable)
      .where(and(eq(exercisesTable.user, userId), eq(exercisesTable.id, id)))
  )?.[0];
}

export async function updateExerciseLastUsed(id: number, date: Date) {
  return await db
    .update(exercisesTable)
    .set({
      lastUsedAt: date,
    })
    .where(eq(exercisesTable.id, id));
}
