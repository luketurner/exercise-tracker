import { fileURLToPath } from "bun";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import { dirname, join } from "path";
import { readdir } from "node:fs/promises";
import { basename, extname } from "node:path";

const pad = (value: number) => {
  if (value < 10) {
    return `0${value}`;
  }
  return value;
};

export const toDateString = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;

export const relativeDate = (date: Date, num: number) => {
  const newDate = new Date(date);
  newDate.setUTCDate(date.getUTCDate() + num);
  return newDate;
};

export function controllerMethod(controller: any) {
  return async function (req: Request, resp: Response) {
    try {
      await controller(req, resp);
    } catch (e) {
      if (e instanceof ZodError) {
        return resp.status(400).send(e.toString());
      }
      console.error("Unknown error", e);
      resp.status(500).send("Unknown error");
    }
  };
}

export function getManualDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "manual");
}

export function getManualPath(name: string): string {
  return join(getManualDir(), `${name}.md`);
}

export async function getAllManualPages() {
  return (await readdir(getManualDir())).map((f) => basename(f, extname(f)));
}

export const allManualPages = await getAllManualPages();
