import path from "path";

export interface UploadServiceDeps {
  uploadToCloud?: (file: { path: string; originalname: string; mimetype: string }, destination: string) => Promise<string>;
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
