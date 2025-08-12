import { defineConfig } from "drizzle-kit";
import { readConfig } from "./config"

export default defineConfig({
  schema: "lib/db/schema.ts",
  out: "src/lib/db",
  dialect: "postgresql",
  dbCredentials: {
    url: readConfig().dbUrl,
  },
});
