import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { StatusCodes } from "http-status-codes";
import ApiError from "../app/errors/ApiError";
import { envConfig } from "./env";

cloudinary.config({
  cloud_name: envConfig.CLOUDINARY.CLOUD_NAME,
  api_key: envConfig.CLOUDINARY.API_KEY,
  api_secret: envConfig.CLOUDINARY.API_SECRET,
});

export const uploadFileToCloudinary = async (
  buffer: Buffer,
  fileName: string,
): Promise<UploadApiResponse> => {
  if (!buffer || !fileName) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "File buffer and file name are required for upload",
    );
  }
  const timestamp = Date.now();
  const extension = fileName.split(".").pop()?.toLocaleLowerCase();
  const filenameWithoutExt = fileName
    .substring(0, fileName.lastIndexOf("."))
    .replace(/\s+/g, "-")
    // eslint-disable-next-line no-useless-escape
    .replace(/[^a-zA-Z0-9\-]/g, "");
  const finalFilename = `${filenameWithoutExt}-${timestamp}.${extension}`;
  const folderName = extension === "pdf" ? "pdfs" : "images";

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `healthcare/${folderName}`,
          public_id: finalFilename,
          allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            return reject(
              new ApiError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                "Failed to upload file to Cloudinary",
              ),
            );
          }
          resolve(result as UploadApiResponse);
        },
      )
      .end(buffer);
  });
};

export const deleteFileFromCloudinary = async (url: string) => {
  try {
    const regex = /\/v\d+\/(.+?)(?:\.[a-zA-Z0-9]+)+$/;
    const match = url.match(regex);
    if (match && match[1]) {
      const publicId = match[1];
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
      console.log(`File with public ID ${publicId} deleted successfully.`);
    }
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to delete file from Cloudinary",
    );
  }
};
export const cloudinaryUpload = cloudinary;
