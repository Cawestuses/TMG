import path from "path";

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"]);

export interface UploadServiceDeps {
  uploadToCloud?: (file: { path: string; originalname: string; mimetype: string }, destination: string) => Promise<string>;
}

export function isAllowedImageUpload(file: { originalname?: string; mimetype?: string }) {
  const mimetype = typeof file.mimetype === "string" ? file.mimetype.toLowerCase() : "";
  const extension = typeof file.originalname === "string"
    ? path.extname(file.originalname).toLowerCase()
    : "";

  if (mimetype.startsWith("image/")) {
    return true;
  }

  return ALLOWED_IMAGE_EXTENSIONS.has(extension);
}

export async function resolveUploadUrl(
  file: { filename?: string; originalname?: string; path?: string; mimetype?: string },
  deps: UploadServiceDeps = {},
  remoteUrl?: string
): Promise<string> {
  const trimmedRemoteUrl = typeof remoteUrl === "string" ? remoteUrl.trim() : "";
  if (trimmedRemoteUrl) {
    return trimmedRemoteUrl;
  }

  const fallbackName = typeof file.filename === "string"
    ? path.basename(file.filename)
    : typeof file.originalname === "string"
      ? path.basename(file.originalname)
      : "upload";

  const safeName = fallbackName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (typeof deps.uploadToCloud === "function") {
    try {
      const destination = `uploads/${Date.now()}-${safeName}`;
      return await deps.uploadToCloud(file as any, destination);
    } catch (error) {
      console.warn("Cloud upload failed, falling back to local storage:", error);
    }
  }

  return `/uploads/${safeName}`;
}
