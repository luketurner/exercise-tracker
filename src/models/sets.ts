import { and, eq, asc, gte, desc, lt } from "drizzle-orm";
import { db } from "../db";
import {
  setsTable,
  type Distance,
  type Duration,
  type Exercise,
  type ExerciseSet,
  type Intensity,
  type IntensityValue,
  type Numeric,
  type ParameterDefinition,
  type ParameterValue,
  type User,
  type Weight,
} from "../db/schema";
import {
  allIntensities,
  convertUnit,
  defaultUnit,
  getExercise,
} from "./exercises";

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
  inputParameters: Record<string, string>,
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
          minutes: numericValue,
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
        if (!isValidIntensity(value)) {
          throw new Error(`Invalid intensity: ${value}`);
        }
        parameters[parameter.id] = {
          value,
        };
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

export function getRawValue(
  value: ParameterValue | undefined,
  param: ParameterDefinition,
  user: User
): number | IntensityValue | undefined {
  if (!value) return undefined;
  switch (param.dataType) {
    case "duration":
      return (value as Duration)?.minutes;
    case "number":
      return (value as Numeric)?.value;
    case "distance":
    case "weight":
      const v1 = value as Weight;
      return Number(
        convertUnit(v1.value, v1.unit, defaultUnit(param.dataType, user)!)
      );
    case "intensity":
      return (value as Intensity).value;
    // return (
    //   1 +
    //   allIntensities().findIndex((i) => i.id === (value as Intensity).value)
    // );
    default:
      return undefined;
  }
}

export function displayRawValueForTable(
  value: number | string | undefined,
  param: ParameterDefinition,
  user: User
) {
  const displayValue = typeof value === "number" ? value.toFixed(1) : value;
  const displayUnit = defaultUnit(param.dataType, user);
  return displayValue && displayUnit
    ? displayValue + " " + displayUnit
    : displayValue
    ? displayValue
    : "-";
}

export function displayStringForTable(
  value: ParameterValue,
  param: ParameterDefinition,
  user: User
) {
  const display = displayString(value, param, user);
  return displayRawValueForTable(display.value, param, user);
}

export function displayString(
  value: ParameterValue,
  param: ParameterDefinition,
  user: User
): { value?: string; unit?: string } {
  if (!value && value !== 0) return {};
  switch (param.dataType) {
    case "distance":
      return {
        value: convertUnit(
          (value as Distance).value,
          (value as Distance).unit,
          defaultUnit(param.dataType, user)!
        ),
        unit: defaultUnit(param.dataType, user)!,
      };
    case "weight":
      return {
        value: convertUnit(
          (value as Weight).value,
          (value as Weight).unit,
          defaultUnit(param.dataType, user)!
        ),
        unit: defaultUnit(param.dataType, user)!,
      };
    case "duration":
      return {
        value: (value as Duration).minutes?.toString(),
        unit: "min",
      };
    case "intensity":
      const display =
        (
          allIntensities().find((i) => i.id === (value as Intensity).value) ||
          {}
        ).name || "";
      return { value: display, unit: undefined };
    case "number":
      return { value: (value as Numeric).value?.toString(), unit: undefined };
    default:
      throw new Error("Invalid dataType");
  }
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
