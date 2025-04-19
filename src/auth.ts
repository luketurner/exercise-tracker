import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db"; // your drizzle instance
import * as schema from "./db/schema";
import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Response } from "express";
import type { RequestWithSession } from "./router";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});

export const getSessionMiddleware = async (
  req: RequestWithSession,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (sessionData) {
      req.session = sessionData.session;
      req.user = (
        await db
          .select()
          .from(schema.user)
          .where(eq(schema.user.id, sessionData.user.id))
      )?.[0];
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireSessionOrRedirect = async (
  req: RequestWithSession,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || !req.session) {
      res.redirect("/");
    }
    next();
  } catch (error) {
    next(error);
  }
};
