import { fromNodeHeaders } from "better-auth/node";
import { Request } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../errors/ApiError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { IChangePasswordPayload, ILogin, IRegister } from "./auth.interface";

const getMe = async (req: Request) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session?.user || null;
};

const register = async (payload: IRegister) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, "Email already in use");
  }
  const user = await auth.api.signUpEmail({
    body: {
      email: payload.email,
      password: payload.password,
      name: payload.name,
    },
  });
  return user;
};

const login = async (payload: ILogin) => {
  const { email, password } = payload;

  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  if (!response.ok) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  return response;
};

const changePassword = async (
  payload: IChangePasswordPayload,
  req: Request,
) => {
  const { userId, currentPassword, newPassword } = payload;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  const result = await auth.api.changePassword({
    body: {
      newPassword: newPassword,
      currentPassword: currentPassword,
      revokeOtherSessions: true,
    },
    headers: fromNodeHeaders(req.headers),
  });
  if (!result) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to change password",
    );
  }
  return null;
};

const logOut = async (req: Request) => {
  const response = await auth.api.signOut({
    headers: fromNodeHeaders(req.headers),
    asResponse: true,
  });
  return response;
};

const verifyEmail = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });
  return null;
};

const forgotPassword = async (email: string) => {
  const isUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!isUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    },
  });

  return null;
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const isUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!isUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: isUser.id,
    },
  });

  return null;
};

const resendVerificationEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (user.emailVerified) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email is already verified");
  }

  await auth.api.sendVerificationEmail({
    body: {
      email,
    },
  });
  return null;
};

export const AuthService = {
  register,
  login,
  changePassword,
  logOut,
  verifyEmail,
  getMe,
  forgotPassword,
  resetPassword,
  resendVerificationEmail,
};
