import { fileURLToPath } from "bun";
import type { Response } from "express";
import { dirname, join } from "path";
import { readdir } from "node:fs/promises";
import { basename, extname } from "node:path";
import { fromError, isZodErrorLike } from "zod-validation-error";
import type { RequestWithSession } from "./router";
import { routeMetric } from "./metrics";

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
  return async function (req: RequestWithSession, resp: Response) {
    try {
      await controller(req, resp);
    } catch (e) {
      const isZodError = isZodErrorLike(e);
      if (!isZodError) console.error("Unknown error", e);
      resp.status(isZodError ? 400 : 500);

      if (req.headers["content-type"] === "application/json") {
        resp.send({
          errorMessage: isZodError
            ? fromError(e).toString()
            : "An unknown error has occured.",
        });
      } else {
        resp.render("error", {
          ...req.viewBag,
          user: req.user,
          errorMessage: isZodError ? fromError(e) : null,
        });
      }
    } finally {
      routeMetric.observe(
        {
          method: req.method,
          url: req.originalUrl,
          statusCode: resp.statusCode,
          hasSession: req.session ? 1 : 0,
          isError: resp.statusCode >= 400 ? 1 : 0,
        },
        1
      );
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
