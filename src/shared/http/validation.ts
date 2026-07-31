import type { ZodType } from "zod";
import { AppError } from "../errors/app-error.js";

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  throw new AppError(
    400,
    "VALIDATION_ERROR",
    "The request contains invalid fields.",
    result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "body",
      message: issue.message,
    })),
  );
}

export function routeParam(
  params: Record<string, string | string[] | undefined>,
  name: string,
): string {
  const value = params[name];
  if (typeof value === "string") return value;
  return "";
}
