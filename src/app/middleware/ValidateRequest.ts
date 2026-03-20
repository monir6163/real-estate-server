import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";

const validateRequest =
  (schema: ZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      return next();
    } catch (err) {
      next(err);
    }
  };

export default validateRequest;
