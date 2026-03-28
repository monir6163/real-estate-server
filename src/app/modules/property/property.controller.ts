import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PropertyService } from "./property.service";

const createProperty = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    thumbnail: req.file?.path,
    agentId: req.user?.id,
  };
  const result = await PropertyService.createProperty(payload);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Property created successfully",
    data: result,
  });
});

export const PropertyController = {
  createProperty,
};
