import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";
import {
  extensionForImageType,
  isAllowedImageUpload,
  mimetypeForImageType,
  resolveUploadUrl,
  validateUploadedImageFile,
} from "../lib/uploadService";

export interface UploadRouteOptions {
  uploadDir: string;
  requireAuth: express.RequestHandler;
  uploadToCloud?: (file: { path: string; originalname: string; mimetype: string }, destination: string) => Promise<string>;
}

export function createUploadMiddleware(uploadDir: string) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, _file, cb) => cb(null, `${randomUUID()}.tmp`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (isAllowedImageUpload(file)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
      }
    },
  });
}

export function registerUploadRoute(app: express.Express, options: UploadRouteOptions) {
  const upload = createUploadMiddleware(options.uploadDir);

  app.post("/api/upload", options.requireAuth, (req, res) => {
    upload.single("image")(req, res, async (err: unknown) => {
      const file = req.file;

      if (err) {
        const message = err instanceof Error ? err.message : "Failed to upload image";
        return res.status(400).json({ error: message });
      }

      if (!file?.path) {
        return res.status(400).json({ error: "No image file provided (field 'image' expected)" });
      }

      try {
        const detectedType = validateUploadedImageFile(file.path);
        if (!detectedType) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: "Invalid image file. Only JPEG, PNG, and WebP are allowed." });
        }

        const finalName = `${randomUUID()}${extensionForImageType(detectedType)}`;
        const finalPath = path.join(options.uploadDir, finalName);
        fs.renameSync(file.path, finalPath);

        const uploadFile = {
          path: finalPath,
          filename: finalName,
          originalname: finalName,
          mimetype: mimetypeForImageType(detectedType),
        };

        const resolvedUrl = await resolveUploadUrl(uploadFile, {
          uploadToCloud: options.uploadToCloud,
        });

        return res.json({ url: resolvedUrl });
      } catch (error: unknown) {
        console.error("Upload failed:", error);
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        const message = error instanceof Error ? error.message : "Failed to process uploaded file";
        return res.status(500).json({ error: message });
      }
    });
  });
}
