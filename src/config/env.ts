import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

interface EnvConfig {
  NODE_ENV: "development" | "production";
  PORT: string;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  FRONTEND_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_CURRENCY: string;
  BOOKING_FEE_AMOUNT?: string;
  PREMIUM_LISTING_FEE_AMOUNT?: string;
  BOOKING_CANCELLATION_WINDOW_HOURS?: string;
  EMAIL_HOST: string;
  EMAIL_PORT: string | number;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  EMAIL_FROM: string;
  CLOUDINARY: {
    CLOUD_NAME: string;
    API_KEY: string;
    API_SECRET: string;
  };
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

const loadEnv = (): EnvConfig => {
  const requiredEnvVars = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "FRONTEND_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_CURRENCY",
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_USER",
    "EMAIL_PASS",
    "EMAIL_FROM",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    // Note: OPENAI_API_KEY and GEMINI_API_KEY are optional
    // At least one AI provider key should be available
  ];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      throw new Error(
        `Environment variable ${varName} is required but not defined.`,
      );
    }
  }

  // Check that at least one AI provider is configured
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn(
      "⚠️  WARNING: Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured. AI chat features will not work.",
    );
  }

  return {
    NODE_ENV: process.env.NODE_ENV as "development" | "production",
    PORT: process.env.PORT as string,
    DATABASE_URL: process.env.DATABASE_URL as string,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET as string,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL as string,
    FRONTEND_URL: process.env.FRONTEND_URL as string,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
    STRIPE_CURRENCY: process.env.STRIPE_CURRENCY as string,
    BOOKING_FEE_AMOUNT: process.env.BOOKING_FEE_AMOUNT,
    PREMIUM_LISTING_FEE_AMOUNT: process.env.PREMIUM_LISTING_FEE_AMOUNT,
    BOOKING_CANCELLATION_WINDOW_HOURS:
      process.env.BOOKING_CANCELLATION_WINDOW_HOURS,
    EMAIL_HOST: process.env.EMAIL_HOST as string,
    EMAIL_PORT: process.env.EMAIL_PORT as string | number,
    EMAIL_USER: process.env.EMAIL_USER as string,
    EMAIL_PASS: process.env.EMAIL_PASS as string,
    EMAIL_FROM: process.env.EMAIL_FROM as string,
    CLOUDINARY: {
      CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
      API_KEY: process.env.CLOUDINARY_API_KEY as string,
      API_SECRET: process.env.CLOUDINARY_API_SECRET as string,
    },
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };
};

export const envConfig = loadEnv();
