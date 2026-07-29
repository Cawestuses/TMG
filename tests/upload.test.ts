import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedImageUpload, resolveUploadUrl } from "../src/lib/uploadService";

test("falls back to a local upload URL when cloud upload fails", async () => {
  const file = { filename: "1700000000000-photo.png", originalname: "photo.png" };

  const url = await resolveUploadUrl(file, {
    uploadToCloud: async () => {
      throw new Error("storage unavailable");
    },
  });

  assert.equal(url, "/uploads/1700000000000-photo.png");
});

test("uses the cloud URL when cloud upload succeeds", async () => {
  const file = { filename: "1700000000001-photo.png", originalname: "photo.png" };

  const url = await resolveUploadUrl(file, {
    uploadToCloud: async () => "https://cdn.example.com/uploaded/photo.png",
  });

  assert.equal(url, "https://cdn.example.com/uploaded/photo.png");
});

test("returns a provided remote URL without uploading a file", async () => {
  const url = await resolveUploadUrl(
    { filename: "avatar.png", originalname: "avatar.png" },
    {},
    "https://cdn.example.com/avatars/staff.png"
  );

  assert.equal(url, "https://cdn.example.com/avatars/staff.png");
});

test("downloads a remote image URL when a downloader is provided", async () => {
  const url = await resolveUploadUrl(
    { filename: "avatar.png", originalname: "avatar.png" },
    {
      downloadRemoteUrl: async (remoteUrl) => {
        assert.equal(remoteUrl, "https://cdn.example.com/avatars/staff.webp");
        return "/uploads/downloaded-staff.webp";
      },
    },
    "https://cdn.example.com/avatars/staff.webp"
  );

  assert.equal(url, "/uploads/downloaded-staff.webp");
});

test("allows common image extensions even when mimetype is missing", () => {
  assert.equal(isAllowedImageUpload({ originalname: "photo.jpg", mimetype: "" }), true);
  assert.equal(isAllowedImageUpload({ originalname: "photo.jpeg", mimetype: "application/octet-stream" }), true);
  assert.equal(isAllowedImageUpload({ originalname: "photo.webp", mimetype: "" }), true);
  assert.equal(isAllowedImageUpload({ originalname: "archive.exe", mimetype: "" }), false);
});
