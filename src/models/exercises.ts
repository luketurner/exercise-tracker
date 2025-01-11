import { eq, and } from "drizzle-orm";
import { exercisesTable } from "../db/schema";
import { db } from "../db";

export async function getExercisesForUser(userId: string) {
  return await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.user, userId));
}

export async function getExercise(id: number, userId: string) {
  return (
    await db
      .select()
      .from(exercisesTable)
      .where(and(eq(exercisesTable.user, userId), eq(exercisesTable.id, id)))
  )?.[0];
}
