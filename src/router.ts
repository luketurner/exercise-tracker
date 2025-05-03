import * as express from "express";
import type { User } from "./db/schema";
import type { Session } from "better-auth";
import { toNodeHandler } from "better-auth/node";
import { auth, getSessionMiddleware, requireSessionOrRedirect } from "./auth";
import {
  allIntensities,
  allParameters,
  allUnits,
  convertUnit,
  defaultUnit,
  displayRawValueForTable,
  displayString,
  displayStringForTable,
} from "./models/exercises";
import multer from "multer";
import { userRouter } from "./controllers/user";
import { homeRouter } from "./controllers/home";
import { exerciseRouter } from "./controllers/exercises";
import { setsRouter } from "./controllers/sets";
import { manualRouter } from "./controllers/manual";
import { settingsRouter } from "./controllers/settings";
import { getRawValue } from "./models/sets";

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
    };

    next();
  }
);

router.use(getSessionMiddleware);

router.use(homeRouter);
router.use(manualRouter);

const authenticatedRouter = express.Router();

authenticatedRouter.use(requireSessionOrRedirect);

authenticatedRouter.use(userRouter);
authenticatedRouter.use(exerciseRouter);
authenticatedRouter.use(setsRouter);
authenticatedRouter.use(settingsRouter);

router.use(authenticatedRouter);
