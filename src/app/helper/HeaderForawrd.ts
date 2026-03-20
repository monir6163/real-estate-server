/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";

export const betterAuthHeaderForward = (response: any, res: Response) => {
  response?.headers?.forEach(
    (value: string | string[] | undefined, key: string) => {
      res.append(key, value);
    },
  );
};
