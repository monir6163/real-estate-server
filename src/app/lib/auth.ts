import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP, lastLoginMethod } from "better-auth/plugins";
import { StatusCodes } from "http-status-codes";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { sendEmail } from "./mailService";
import { prisma } from "./prisma";

const FRONTEND_URL = process.env.FRONTEND_URL!.replace(/\/+$/, "");
const BACKEND_URL = process.env.BETTER_AUTH_URL!.replace(/\/+$/, "");

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: BACKEND_URL,
  trustedOrigins: [FRONTEND_URL, BACKEND_URL],
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },

  advanced: {
    cookies: {
      state: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          partitioned: true,
          path: "/",
        },
      },
      session_token: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          partitioned: true,
          path: "/",
        },
      },
    },
  },

  socialProviders: {
    google: {
      prompt: "select_account consent",
      accessType: "offline",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${FRONTEND_URL}/api/auth/callback/google`,
    },
  },
  // email verification can be enabled like this
  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          const user = await prisma.user.findUnique({
            where: { email },
          });
          if (user) {
            await sendEmail(
              email,
              "Verify your email",
              "otp",
              {
                name: user.name,
                otp,
              },
              [],
            );
          }
        } else if (type === "forget-password") {
          const user = await prisma.user.findUnique({
            where: { email },
          });
          if (user) {
            await sendEmail(
              email,
              "Reset your password",
              "otp",
              {
                name: user.name,
                otp,
              },
              [],
            );
          }
        }
      },
      expiresIn: 2 * 60, // 2 minutes
      otpLength: 6,
    }),
    lastLoginMethod({
      storeInDatabase: true,
    }),
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const { email } = ctx.body;
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (user && user.status === UserStatus.INACTIVE) {
          throw new APIError("BAD_REQUEST", {
            message: "Your account is inactive. Please contact support.",
            statusCode: StatusCodes.BAD_REQUEST,
          });
        } else if (user && user.emailVerified === false) {
          throw new APIError("BAD_REQUEST", {
            message: "Please verify your email before signing in.",
            statusCode: StatusCodes.BAD_REQUEST,
          });
        }
      }
      if (ctx.path === "/sign-in/google") {
        const { email } = ctx.body;
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (user && user.status === UserStatus.INACTIVE) {
          throw new APIError("BAD_REQUEST", {
            message: "Your account is inactive. Please contact support.",
            statusCode: StatusCodes.BAD_REQUEST,
          });
        }
      }
    }),
  },

  // additional fields can be added to the user model like this
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: Role.USER,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: UserStatus.ACTIVE,
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },
});
