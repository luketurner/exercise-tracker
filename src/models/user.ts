import { db } from "../db";
import { user as userTable } from "../db/schema";

export async function countUsers() {
  return await db.$count(userTable);
}
