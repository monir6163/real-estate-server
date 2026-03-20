import { fromNodeHeaders } from "better-auth/node";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Role, UserStatus } from "../../generated/prisma/enums";
import ApiError from "../errors/ApiError";
import { auth } from "../lib/auth";

const checkAuth = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const headers = fromNodeHeaders(req.headers);

      const session = await auth.api.getSession({ headers });
      if (!session || !session.user) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "Unauthorized! Please log in to access this resource.",
        );
      }
      if (session.user.emailVerified === false) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "Please verify your email to access this resource.",
        );
      }
      if (session.user.status === UserStatus.BLOCKED) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "Your account has been blocked. Please contact support.",
        );
      }

      req.user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as Role,
        status: session.user.status as UserStatus,
        emailVerified: session.user.emailVerified as boolean,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
      };
      if (roles.length && !roles.includes(req?.user?.role)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "Access Forbidden! You don't have permission.",
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default checkAuth;
