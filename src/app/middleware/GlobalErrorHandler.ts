/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { APIError } from "better-auth/api";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import z from "zod";
import { deleteFileFromCloudinary } from "../../config/cloudinary.config";
import { envConfig } from "../../config/env";
import { logger } from "../../config/logger";
import { Prisma } from "../../generated/prisma/client";
import ApiError from "../errors/ApiError";
import { TErrorResponse, TErrorSources } from "../errors/ErrorInterface";
import { handleZodError } from "../errors/handleZodError";

const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error(`[Error Handler] ${err?.message || "Unknown error"}`, {
    error: err,
    url: req.url,
    method: req.method,
  });

  if (req.file) {
    await deleteFileFromCloudinary(req.file.path);
  }

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const imageUrls = req.files.map((file) => file.path);
    await Promise.all(
      imageUrls.map(async (url) => {
        await deleteFileFromCloudinary(url);
      }),
    );
  }

  let errorSources: TErrorSources[] = [];
  let statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR;
  let message: string = "Internal Server Error";
  let stack: string | undefined = undefined;

  if (err instanceof z.ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errors];
    stack = err.stack;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    stack = err.stack;

    if (err.code === "P2002") {
      const targets = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[])
        : [];

      statusCode = StatusCodes.CONFLICT;
      message = "Duplicate value found";
      errorSources = [
        {
          path: targets.join(", ") || "",
          message: targets.length
            ? `${targets.join(", ")} already exists`
            : "Unique constraint failed",
        },
      ];
    } else if (err.code === "P2025") {
      statusCode = StatusCodes.NOT_FOUND;
      message = "Requested record was not found";
      errorSources = [
        {
          path: "",
          message: "The requested resource no longer exists",
        },
      ];
    } else if (err.code === "P2003") {
      statusCode = StatusCodes.BAD_REQUEST;
      message = "Invalid relation reference";
      errorSources = [
        {
          path: String(err.meta?.field_name || ""),
          message: "Foreign key constraint failed",
        },
      ];
    } else {
      statusCode = StatusCodes.BAD_REQUEST;
      message = "Database request failed";
      errorSources = [
        {
          path: "",
          message: err.message,
        },
      ];
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid database query payload";
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    message = "Database connection initialization failed";
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message = "Database engine panic occurred";
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: "Unexpected database engine failure",
      },
    ];
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message = "Unknown database error occurred";
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof APIError) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "", // better-auth errors
        message: err.message,
      },
    ];
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof Error) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  const errorResponse: TErrorResponse = {
    success: false,
    message: message,
    errors: errorSources,
    error:
      envConfig.NODE_ENV === "development"
        ? { statusCode: err.statusCode, message: err.message }
        : undefined,
    stack: envConfig.NODE_ENV === "development" ? stack : undefined,
  };

  res.status(statusCode).json(errorResponse);
};
export default globalErrorHandler;
