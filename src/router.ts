import type { Session } from "better-auth";
import { toNodeHandler } from "better-auth/node";
import * as express from "express";
import multer from "multer";
import { auth, getSessionMiddleware, requireSessionOrRedirect } from "./auth";
import { exerciseRouter } from "./controllers/exercises";
import { homeRouter } from "./controllers/home";
import { manualRouter } from "./controllers/manual";
import { setsRouter } from "./controllers/sets";
import { settingsRouter } from "./controllers/settings";
import { userRouter } from "./controllers/user";
import type { User } from "./db/schema";
import {
  allIntensities,
  allParameters,
  allUnits,
  convertUnit,
  defaultUnit,
  displayRawValueForTable,
  displayString,
  displayStringForTable,
  getRawValue,
} from "./shared";

export interface RequestWithSession extends express.Request {
  user?: User;
  session?: Session;
  viewBag?: Record<string, any>;
}

export interface RequestWithGuaranteedSession extends RequestWithSession {
  user: User;
  session: Session;
}

export const router = express.Router();

// Note -- make sure to use JSON middleware _after_ this
router.all("/api/auth/*", toNodeHandler(auth));

router.use(express.static("public"));
router.use(express.urlencoded({ extended: true }));
router.use(express.json());
router.use(multer().none());

router.use(getSessionMiddleware);

router.use(
  (
    req: RequestWithSession,
    res: express.Response,
    next: express.NextFunction
  ) => {
    req.viewBag = {
      allParameters: allParameters(),
      allUnits: allUnits(),
      allIntensities: allIntensities(),
      defaultUnit,
      convertUnit,
      displayString,
      displayStringForTable,
      getRawValue,
      displayRawValueForTable,
      currentPath: req.originalUrl.replace(/\?.*$/, ""),
      user: req.user ?? null,
    };

    next();
  }
);

router.use(homeRouter);
router.use(manualRouter);

const authenticatedRouter = express.Router();

authenticatedRouter.use(requireSessionOrRedirect);

authenticatedRouter.use(userRouter);
authenticatedRouter.use(exerciseRouter);
authenticatedRouter.use(setsRouter);
authenticatedRouter.use(settingsRouter);

router.use(authenticatedRouter);
