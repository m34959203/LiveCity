import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1, "MAPBOX_TOKEN is required"),
  NEXT_PUBLIC_DEFAULT_LAT: z.coerce.number().default(47.7833),
  NEXT_PUBLIC_DEFAULT_LNG: z.coerce.number().default(67.7144),
  NEXT_PUBLIC_DEFAULT_ZOOM: z.coerce.number().default(13),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten());
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = validateEnv();
