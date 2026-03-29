import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { IQueryParams } from "../../helper/query.interface";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PropertyService } from "./property.service";

const createProperty = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    thumbnail:
      req.files && !Array.isArray(req.files) && req.files.thumbnail
        ? (req.files.thumbnail as Express.Multer.File[])[0].path
        : undefined,
    images:
      req.files && !Array.isArray(req.files) && req.files.images
        ? (req.files.images as Express.Multer.File[]).map((file) => file.path)
        : [],
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

const getAllProperties = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyService.getAllProperties(
    req.query as IQueryParams,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Properties retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSingleProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PropertyService.getSingleProperty(id as string);
  if (!result) {
    return sendResponse(res, {
      statusCode: StatusCodes.NOT_FOUND,
      success: false,
      message: "Property not found",
    });
  }
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Property retrieved successfully",
    data: result,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const agentId = req.user?.id as string;
  const payload = {
    ...req.body,
    thumbnail:
      req.files && !Array.isArray(req.files) && req.files.thumbnail
        ? (req.files.thumbnail as Express.Multer.File[])[0].path
        : undefined,
    images:
      req.files && !Array.isArray(req.files) && req.files.images
        ? (req.files.images as Express.Multer.File[]).map((file) => file.path)
        : [],
  };
  const result = await PropertyService.updateProperty(
    id as string,
    agentId,
    payload,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

const updatePropertyStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const agentId = req.user?.id as string;
  const { status } = req.body;
  const result = await PropertyService.updatePropertyStatus(
    id as string,
    agentId,
    status,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Property status updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const agentId = req.user?.id as string;
  await PropertyService.deleteProperty(id as string, agentId);

  sendResponse(res, {
    statusCode: StatusCodes.NO_CONTENT,
    success: true,
    message: "Property deleted successfully",
  });
});

const isFeaturedProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PropertyService.isFeaturedProperty(id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Property featured status toggled successfully",
    data: result,
  });
});

export const PropertyController = {
  createProperty,
  getAllProperties,
  getSingleProperty,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
  isFeaturedProperty,
};
