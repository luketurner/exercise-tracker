import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "../db";
import {
  setsTable,
  type Duration,
  type Exercise,
  type ExerciseSet,
  type Intensity,
  type IntensityValue,
  type ParameterValue,
  type User,
} from "../db/schema";
import { allIntensities, defaultUnit, getRawValue } from "../shared";
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

export function isValidIntensity(s: string): s is IntensityValue {
  return allIntensities()
    .map((i) => i.id)
    .includes(s as IntensityValue);
}

export function buildSetParameters(
  inputParameters: Record<string, string | Duration>,
  exercise: Exercise,
  user: User
) {
  const parameters: Record<string, ParameterValue> = {};

  for (const parameter of exercise.parameters ?? []) {
    const value = inputParameters[parameter.id];
    if (value === "" || value === null || value === undefined) continue;
    switch (parameter.dataType) {
      case "distance": {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          throw new Error(`Invalid distance: ${value}`);
        }
        parameters[parameter.id] = {
          value: numericValue,
          unit: defaultUnit(parameter.dataType, user) as any,
        };
        break;
      }
      case "duration": {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          throw new Error(`Invalid duration: ${value}`);
        }
        parameters[parameter.id] = {
          value: numericValue,
        };
        break;
      }
      case "weight": {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          throw new Error(`Invalid weight: ${value}`);
        }
        parameters[parameter.id] = {
          value: numericValue,
          unit: defaultUnit(parameter.dataType, user) as any,
        };
        break;
      }
      case "intensity":
        if (!isValidIntensity(value as string)) {
          throw new Error(`Invalid intensity: ${value}`);
        }
        parameters[parameter.id] = {
          value,
        } as Intensity;
        break;
      case "number": {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          throw new Error(`Invalid number: ${value}`);
        }
        parameters[parameter.id] = {
          value: numericValue,
        };
        break;
      }
      default:
        throw new Error(`Invalid parameter: ${parameter.id}`);
    }
  }

  return parameters;
}

export interface HistoricalParameterAnalysis {
  average?: number;
  min?: number;
  max?: number;
  totalChange?: number;
}

export type HistoricalAnalysis = Record<string, HistoricalParameterAnalysis>;

export function analyzeHistoricalSetData(
  exercise: Exercise,
  sets: ExerciseSet[],
  user: User
) {
  const analysis: HistoricalAnalysis = {};
  for (const param of exercise.parameters ?? []) {
    if (param.dataType === "intensity") {
      analysis[param.id] = {};
      continue;
    }

    const values = sets
      // .toSorted((s1, s2) => s1.date - s2.date)
      .map((set) => set.parameters?.[param.id])
      .map((v) => getRawValue(v, param, user) as number | undefined)
      .filter((v) => v !== undefined);

    if (values.length === 0) {
      analysis[param.id] = {};
      continue;
    }

    const average = values.reduce((avg, v) => avg + v, 0) / values.length;

    analysis[param.id] = {
      average,
      min: Math.min(...values),
      max: Math.max(...values),
      totalChange: values[values.length - 1] - values[0],
    };
  }
  return analysis;
}
