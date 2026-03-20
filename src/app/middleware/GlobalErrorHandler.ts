/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { APIError } from "better-auth/api";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import z from "zod";
import { deleteFileFromCloudinary } from "../../config/cloudinary.config";
import { envConfig } from "../../config/env";
import ApiError from "../errors/ApiError";
import { TErrorResponse, TErrorSources } from "../errors/ErrorInterface";
import { handleZodError } from "../errors/handleZodError";

const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (envConfig.NODE_ENV === "development") {
    console.log("Error from Global Error Handler", err);
  }

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
    error: envConfig.NODE_ENV === "development" ? err : undefined,
    stack: envConfig.NODE_ENV === "development" ? stack : undefined,
  };

  res.status(statusCode).json(errorResponse);
};
export default globalErrorHandler;
