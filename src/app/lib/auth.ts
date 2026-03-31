import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { StatusCodes } from "http-status-codes";
import { envConfig } from "../../config/env";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { sendEmail } from "./mailService";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: envConfig.BETTER_AUTH_URL!,
  secret: envConfig.BETTER_AUTH_SECRET!,
  trustedOrigins: [envConfig.FRONTEND_URL!],
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },

  // social providers can be enabled like this
  socialProviders: {
    google: {
      prompt: "select_account consent",
      accessType: "offline",
      clientId: envConfig.GOOGLE_CLIENT_ID,
      clientSecret: envConfig.GOOGLE_CLIENT_SECRET,
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
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const { email } = ctx.body;
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (user && user.status === UserStatus.SUSPENDED) {
          throw new APIError("BAD_REQUEST", {
            message: "Your account is Suspended. Please contact support.",
            statusCode: StatusCodes.BAD_REQUEST,
          });
        } else if (user && user.emailVerified === false) {
          throw new APIError("BAD_REQUEST", {
            message: "Please verify your email before signing in.",
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
