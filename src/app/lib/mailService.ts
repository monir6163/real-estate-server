/* eslint-disable @typescript-eslint/no-explicit-any */
import ejs from "ejs";
import { StatusCodes } from "http-status-codes";
import nodemailer from "nodemailer";
import path from "path";
import { envConfig } from "../../config/env";
import ApiError from "../errors/ApiError";

export const transporter = nodemailer.createTransport({
  host: envConfig.EMAIL_HOST,
  port: Number(envConfig.EMAIL_PORT),
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
  auth: {
    user: envConfig.EMAIL_USER,
    pass: envConfig.EMAIL_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  templateData: Record<string, any>,
  attachments?: {
    contentType: any;
    filename: string;
    content: Buffer | string;
  }[],
) => {
  try {
    const templatePath = path.resolve(
      process.cwd(),
      `src/app/templates/${templateName}.ejs`,
    );
    const html = await ejs.renderFile(templatePath, templateData);
    const info = await transporter.sendMail({
      from: envConfig.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments
        ? attachments?.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType,
          }))
        : undefined,
    });
    console.log("Email sent: %s", info.messageId);
  } catch (error: any) {
    console.log("Email sending Error", error?.message);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to send email",
    );
  }
};
