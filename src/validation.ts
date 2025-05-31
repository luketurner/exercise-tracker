import { z } from "zod";
import { allParameters, allUnits } from "./models/exercises";
import { type Request } from "express";
import { z } from "zod";
import { allUnits } from "./shared";

export function validateRequest<TRequest>(
  request: Request,
  schema: z.Schema<TRequest>
) {
  const requestToValidate = {
    params: request.params,
    query: request.query,
    body: request.body,
  };
  return schema.parse(requestToValidate);
}

export const allParametersInputSchema = allParameters().reduce(
  (m, p) => ({ ...m, [p.id]: z.string().optional() }),
  {}
);

export const nameSchema = z.string().max(64);

export const numericStringSchema = z
  .string()
  .regex(/^\d+$/, "should be a number");

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "should be a date");

export const allWeightUnitsEnumSchema = z.enum(
  allUnits()
    .filter((u) => u.type === "weight")
    .map((u) => u.id) as [string, ...string[]]
);

export const allDistanceUnitsEnumSchema = z.enum(
  allUnits()
    .filter((u) => u.type === "distance")
    .map((u) => u.id) as [string, ...string[]]
);
