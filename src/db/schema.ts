import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  varchar,
  interval,
  check,
  date,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

export interface ParameterDefinition {
  name: string;
  id: string;
  dataType: "weight" | "distance" | "intensity" | "number" | "duration";
}

export interface Weight {
  value: number;
  unit: "pound" | "kg";
}

export interface Distance {
  value: number;
  unit: "mile" | "km";
}

export interface Duration {
  seconds?: number;
  minutes?: number;
  hours?: number;
}

export type Intensity = "low" | "medium" | "high";

export type ParameterValue = Weight | Intensity | Duration | Distance | number;

export type User = typeof user.$inferSelect;

export const exercisesTable = pgTable("exercises", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  user: text("userId")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  parameters: jsonb().$type<ParameterDefinition[]>(),
});

export const setsTable = pgTable(
  "sets",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user: text("userId")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    exercise: integer("exerciseId")
      .notNull()
      .references(() => exercisesTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    date: date().notNull(),
    order: integer().notNull(),
    parameters: jsonb().$type<Record<string, ParameterValue>>(),
  },
  (table) => [
    {
      uniqueOrder: unique("unique_order_per_day").on(
        table.user,
        table.date,
        table.order
      ),
    },
  ]
);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  preferredUnits: jsonb().$type<Record<"weight" | "distance", string>>(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});
