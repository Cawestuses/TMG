import fs from "fs";
import path from "path";

export type DetectedImageType = "jpeg" | "png" | "webp";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const BLOCKED_MIMETYPES = new Set([
  "text/html",
  "image/svg+xml",
  "application/xhtml+xml",
  "application/javascript",
  "text/javascript",
]);

export interface UploadServiceDeps {
  uploadToCloud?: (file: { path: string; originalname: string; mimetype: string }, destination: string) => Promise<string>;
}

export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export function extensionForImageType(type: DetectedImageType): string {
  if (type === "jpeg") return ".jpg";
  if (type === "png") return ".png";
  return ".webp";
}

export function mimetypeForImageType(type: DetectedImageType): string {
  if (type === "jpeg") return "image/jpeg";
  if (type === "png") return "image/png";
  return "image/webp";
}

export function isAllowedImageUpload(file: { originalname?: string; mimetype?: string }) {
  const extension = typeof file.originalname === "string"
    ? path.extname(file.originalname).toLowerCase()
    : "";

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return false;
  }

  const mimetype = typeof file.mimetype === "string" ? file.mimetype.toLowerCase() : "";
  if (mimetype && BLOCKED_MIMETYPES.has(mimetype)) {
    return false;
  }

  return true;
}

export function validateUploadedImageFile(filePath: string): DetectedImageType | null {
  const header = Buffer.alloc(12);
  const fd = fs.openSync(filePath, "r");

  try {
    const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
    return detectImageType(header.subarray(0, bytesRead));
  } finally {
    fs.closeSync(fd);
  }
}

export async function resolveUploadUrl(
  file: { filename?: string; path?: string; mimetype?: string },
  deps: UploadServiceDeps = {}
): Promise<string> {
  const safeName = typeof file.filename === "string"
    ? path.basename(file.filename)
    : "upload";

  if (typeof deps.uploadToCloud === "function" && file.path) {
    try {
      const destination = `uploads/${safeName}`;
      return await deps.uploadToCloud(file as { path: string; originalname: string; mimetype: string }, destination);
    } catch (error) {
      console.warn("Cloud upload failed, falling back to local storage:", error);
    }
  }

  return `/uploads/${safeName}`;
}
