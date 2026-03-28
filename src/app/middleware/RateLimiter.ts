import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "../errors/ApiError";

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  getIdentifier?: (req: Request) => string;
}

interface ClientData {
  count: number;
  lastRequestTime: number;
}

const rateLimiter = (options: RateLimiterOptions) => {
  const { windowMs, max, getIdentifier = (req) => `ip:${req.ip}` } = options;
  const clients = new Map<string, ClientData>();

  setInterval(() => {
    const currentTime = Date.now();
    for (const [key, data] of clients.entries()) {
      if (currentTime - data.lastRequestTime > windowMs) {
        clients.delete(key);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = getIdentifier(req);
    const currentTime = Date.now();

    const clientData = clients.get(identifier) || {
      count: 0,
      lastRequestTime: currentTime,
    };

    if (currentTime - clientData.lastRequestTime > windowMs) {
      clientData.count = 0;
      clientData.lastRequestTime = currentTime;
    }

    clientData.count += 1;
    clients.set(identifier, clientData);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - clientData.count));
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(clientData.lastRequestTime + windowMs).toISOString(),
    );

    if (clientData.count > max) {
      throw new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        "Too many requests, please try again later.",
      );
    }

    next();
  };
};

export default rateLimiter;
