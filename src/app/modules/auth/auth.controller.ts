import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { betterAuthHeaderForward } from "../../helper/HeaderForawrd";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuthService } from "./auth.service";

const getMe = catchAsync(async (req: Request, res: Response) => {
  const response = await AuthService.getMe(req);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User retrieved successfully",
    data: response,
  });
});

const registerPatient = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await AuthService.registerPatient(payload);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Patient registered successfully",
    data: result,
  });
});

const loginPatient = catchAsync(async (req: Request, res: Response) => {
  const response = await AuthService.loginPatient(req.body);
  betterAuthHeaderForward(response, res);
  const data = await response.json();
  sendResponse(res, {
    statusCode: response.status,
    success: true,
    message: "Patient logged in successfully",
    data: data,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const userId = req.user?.id;
  payload.userId = userId!;
  const result = await AuthService.changePassword(payload, req);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

const logOut = catchAsync(async (req: Request, res: Response) => {
  const response = await AuthService.logOut(req);
  betterAuthHeaderForward(response, res);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const response = await AuthService.verifyEmail(email, otp);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Email verified successfully",
    data: response,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const response = await AuthService.forgotPassword(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "OTP sent to email successfully",
    data: response,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const response = await AuthService.resetPassword(email, otp, newPassword);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password reset successfully",
    data: response,
  });
});

export const AuthController = {
  registerPatient,
  loginPatient,
  changePassword,
  logOut,
  verifyEmail,
  getMe,
  forgotPassword,
  resetPassword,
};
