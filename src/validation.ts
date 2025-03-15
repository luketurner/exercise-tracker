import { z } from "zod";
import { allParameters, allUnits } from "./models/exercises";
import { type Request } from "express";

export function validateRequest<TParams, TQuery, TBody>(
  request: Request,
  paramsSchema: z.Schema<TParams>,
  querySchema: z.Schema<TQuery>,
  bodySchema: z.Schema<TBody>
) {
  return {
    params: paramsSchema.parse(request.params),
    query: querySchema.parse(request.query),
    body: bodySchema.parse(request.body),
  };
}

export const allParametersInputSchema = allParameters().reduce(
  (m, p) => ({ ...m, [p.id]: z.string().optional() }),
  {}
);

export const allParametersDeclarationSchema = allParameters().reduce(
  (m, p) => ({ ...m, [p.id]: z.boolean() }),
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
