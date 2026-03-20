import { Response } from "express";
interface IResPonseData<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const sendResponse = <T>(res: Response, jsonData: IResPonseData<T>) => {
  const { statusCode, success, message, data, meta } = jsonData;

  res.status(statusCode).json({ success, message, data, meta });
};

export default sendResponse;
