import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Le CLI Prisma ne charge pas automatiquement .env.local (contrairement à Next.js)
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
