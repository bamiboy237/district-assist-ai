import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://app:app@localhost:5432/district_assist"),
    DATABASE_SSL: booleanFromString,
    CLERK_SECRET_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().default("openai/gpt-5.b-luna"),
    AI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") return;
    if (!value.CLERK_SECRET_KEY)
      context.addIssue({
        code: "custom",
        path: ["CLERK_SECRET_KEY"],
        message: "CLERK_SECRET_KEY is required in production.",
      });
    if (!value.OPENAI_API_KEY)
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required in production.",
      });
    if (!value.DATABASE_URL)
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required in production.",
      });
    if (!value.CORS_ORIGIN)
      context.addIssue({
        code: "custom",
        path: ["CORS_ORIGIN"],
        message: "CORS_ORIGIN is required in production.",
      });
  });

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(): Environment {
  const result = environmentSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}

export const env = loadEnvironment();
