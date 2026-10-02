import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type DB = NeonHttpDatabase<typeof schema>;

let cached: DB | undefined;

export function getDb(): DB {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.",
      );
    }
    cached = drizzle(neon(url), { schema });
  }
  return cached;
}

export { schema };
