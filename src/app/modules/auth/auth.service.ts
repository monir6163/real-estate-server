import { fromNodeHeaders } from "better-auth/node";
import { Request } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../errors/ApiError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import {
  IChangePasswordPayload,
  ILoginPatient,
  IRegisterPatient,
} from "./auth.interface";

const getMe = async (req: Request) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session?.user || null;
};

const registerPatient = async (payload: IRegisterPatient) => {
  const { name, email, password } = payload;
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "User with this email already exists",
    );
  }
  const newUser = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });
  if (!newUser) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to register patient",
    );
  }
  try {
    // patient profile creation transaction pataient model
    const createdPatient = await prisma.$transaction(async (tx) => {
      const patientTx = await tx.patient.create({
        data: {
          userId: newUser?.user?.id,
          name: newUser?.user?.name || name,
          email: newUser?.user?.email || email,
        },
      });
      return patientTx;
    });
    return {
      ...newUser,
      patient: createdPatient,
    };
  } catch (error) {
    console.log("err", error);
    // Rollback user creation if patient profile creation fails
    await prisma.user.delete({
      where: { id: newUser.user?.id },
    });
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to create patient profile",
    );
  }
};

const loginPatient = async (payload: ILoginPatient) => {
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

  if (isUser.needPasswordChange) {
    await prisma.user.update({
      where: { id: isUser.id },
      data: { needPasswordChange: false },
    });
  }

  await prisma.session.deleteMany({
    where: {
      userId: isUser.id,
    },
  });

  return null;
};

export const AuthService = {
  registerPatient,
  loginPatient,
  changePassword,
  logOut,
  verifyEmail,
  getMe,
  forgotPassword,
  resetPassword,
};
