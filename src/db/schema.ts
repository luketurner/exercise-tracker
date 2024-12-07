import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("exercises", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
});
