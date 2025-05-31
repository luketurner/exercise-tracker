import type { Response } from "express";
import { Router } from "express";
import type { RequestWithSession } from "../router";
import { controllerMethod } from "../util";

export const homeRouter = Router();

homeRouter.get(
  "/",
  controllerMethod(async (req: RequestWithSession, res: Response) => {
    const { user } = req;

    if (user) {
      return res.redirect("/today");
    }

    res.render("index", {
      ...req.viewBag,
      title: "Set",
      message: "Hello world!",
      user,
    });
  })
);
