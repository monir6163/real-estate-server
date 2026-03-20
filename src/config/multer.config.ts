import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinaryUpload } from "./cloudinary.config";

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryUpload,
  params: async (req, file) => {
    const originalname = file.originalname;
    const timestamp = Date.now();
    const extension = originalname.split(".").pop()?.toLocaleLowerCase();
    const filenameWithoutExt = originalname
      .substring(0, originalname.lastIndexOf("."))
      .replace(/\s+/g, "-")
      // eslint-disable-next-line no-useless-escape
      .replace(/[^a-zA-Z0-9\-]/g, "");
    const finalFilename = `${filenameWithoutExt}-${timestamp}.${extension}`;
    const folderName = extension === "pdf" ? "pdfs" : "images";
    return {
      folder: `healthcare/${folderName}`,
      public_id: finalFilename,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
      resource_type: "auto",
    };
  },
});

export const multerUpload = multer({ storage });
