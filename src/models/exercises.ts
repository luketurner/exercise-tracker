import { eq, and } from "drizzle-orm";
import {
  exercisesTable,
  type Distance,
  type Duration,
  type ParameterDefinition,
  type ParameterValue,
  type User,
  type Weight,
} from "../db/schema";
import { db } from "../db";

export async function getExercisesForUser(userId: string) {
  return await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.user, userId));
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

export function defaultUnit(
  dataType: ParameterDefinition["dataType"],
  user: User
): string {
  if (dataType === "weight") {
    return user.preferredUnits?.["weight"] ?? "pound";
  }
  if (dataType === "distance") {
    return user.preferredUnits?.["distance"] ?? "mile";
  }
  throw new Error(`${dataType} does not have units.`);
}

export function convertUnit(
  value: number,
  from: string,
  to: string,
  precision: number = 1
): string {
  if (from === to) {
    return Number(value).toFixed(precision);
  }
  if (from === "mile" && to === "km")
    return (value * 1.60934).toFixed(precision);
  if (from === "km" && to === "mile")
    return (value * 0.621371).toFixed(precision);
  if (from === "pound" && to === "kg")
    return (value * 0.453592).toFixed(precision);
  if (from === "kg" && to === "pound")
    return (value * 2.20462).toFixed(precision);
  throw new Error(`Cannot convert ${from} to ${to}.`);
}

export function allUnits() {
  return [
    { name: "Miles", id: "mile", type: "distance", short: "mi" },
    { name: "Pounds", id: "pound", type: "weight", short: "lb" },
    { name: "Kilometers", id: "km", type: "distance", short: "km" },
    { name: "Kilograms", id: "kg", type: "weight", short: "kg" },
  ] as const;
}

export function allParameters(): ParameterDefinition[] {
  return [
    {
      id: "reps",
      name: "Reps",
      dataType: "number",
    },
    {
      id: "weight",
      name: "Weight",
      dataType: "weight",
    },
    {
      id: "assisted",
      name: "Assisted",
      dataType: "weight",
    },
    {
      id: "distance",
      name: "Distance",
      dataType: "distance",
    },
    {
      id: "duration",
      name: "Duration",
      dataType: "duration",
    },
    {
      id: "intensity",
      name: "Intensity",
      dataType: "intensity",
    },
  ] as const;
}

export function allIntensities() {
  return [
    { id: "low", name: "Low" },
    { id: "medium", name: "Medium" },
    { id: "high", name: "High" },
  ] as const;
}

export function displayString(
  param: ParameterDefinition,
  value: ParameterValue,
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
        unit: defaultUnit(param.dataType, user),
      };
    case "weight":
      return {
        value: convertUnit(
          (value as Weight).value,
          (value as Weight).unit,
          defaultUnit(param.dataType, user)!
        ),
        unit: defaultUnit(param.dataType, user),
      };
    case "duration":
      return {
        value: (value as Duration).minutes?.toString(),
        unit: "min",
      };
    case "intensity":
      const display =
        (allIntensities().find((i) => i.id === value) || {}).name || "";
      return { value: display, unit: undefined };
    case "number":
      return { value: (value as number)?.toString(), unit: undefined };
    default:
      throw new Error("Invalid dataType");
  }
}
