import type { Response } from "express";
import { Router } from "express";
import { readFile } from "node:fs/promises";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { z } from "zod";
import type { RequestWithSession } from "../router";
import { allManualPages, controllerMethod, getManualPath } from "../util";
import { validateRequest } from "../validation";

export const manualRouter = Router();

manualRouter.get(
  "/manual",
  controllerMethod(async (req: RequestWithSession, res: Response) => {
    res.redirect("/manual/intro");
  })
);

manualRouter.get(
  "/manual/:page",
  controllerMethod(async (req: RequestWithSession, res: Response) => {
    const { user } = req;

    const {
      params: { page },
    } = validateRequest(
      req,
      z.object({
        params: z.object({
          page: z.enum(allManualPages as [string, ...string[]]),
        }),
      })
    );

    const content = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(await readFile(getManualPath(page), { encoding: "utf-8" }));

    res.render("manual", {
      ...req.viewBag,
      title:
        "Manual: " +
        page
          .split("-")
          .map((s) => `${s[0].toUpperCase()}${s.substring(1)}`)
          .join(" "),
      content,
      user,
    });
  })
);
