export interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  FRONTEND_URL: string;
  GEMINI_API_KEY: string;
}

export function getEnvConfig(): EnvConfig {
  return {
    DATABASE_URL: process.env.DATABASE_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "default-secret",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    JWT_REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET || "default-refresh-secret",
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    PORT: parseInt(process.env.PORT || "3333", 10),
    NODE_ENV: (process.env.NODE_ENV as EnvConfig["NODE_ENV"]) || "development",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  };
}
