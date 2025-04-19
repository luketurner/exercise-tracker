import { Router } from "express";
import type { Response } from "express";
import { controllerMethod } from "../util";
import type { RequestWithSession } from "../router";

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
