import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Fallback URL prevents prisma generate from hanging when DATABASE_URL is not set
    url: process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/placeholder",
  },
});
