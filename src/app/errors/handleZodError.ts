import { StatusCodes } from "http-status-codes";
import z from "zod";
import { TErrorResponse, TErrorSources } from "./ErrorInterface";

export const handleZodError = (err: z.ZodError): TErrorResponse => {
  const statusCode = StatusCodes.BAD_REQUEST;
  const message = "Zod Validation Error";
  const errorSources: TErrorSources[] = [];

  err.issues.forEach((issue) => {
    errorSources.push({
      path: issue.path.join(" => "),
      message: issue.message,
    });
  });

  return {
    success: false,
    message,
    errors: errorSources,
    statusCode,
  };
};
