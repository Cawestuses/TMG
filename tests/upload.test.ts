import test from "node:test";
import assert from "node:assert/strict";
import {
  detectImageType,
  isAllowedImageUpload,
  resolveUploadUrl,
} from "../src/lib/uploadService";

test("falls back to a local upload URL when cloud upload fails", async () => {
  const file = { filename: "1700000000000-photo.png", path: "/tmp/photo.png" };

  const url = await resolveUploadUrl(file, {
    uploadToCloud: async () => {
      throw new Error("storage unavailable");
    },
  });

  assert.equal(url, "/uploads/1700000000000-photo.png");
});

test("uses the cloud URL when cloud upload succeeds", async () => {
  const file = { filename: "1700000000001-photo.png", path: "/tmp/photo.png" };

  const url = await resolveUploadUrl(file, {
    uploadToCloud: async () => "https://cdn.example.com/uploaded/photo.png",
  });

  assert.equal(url, "https://cdn.example.com/uploaded/photo.png");
});

test("detects JPEG, PNG, and WebP magic bytes", () => {
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "jpeg");
  assert.equal(
    detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "png"
  );
  assert.equal(
    detectImageType(Buffer.from("RIFFxxxxWEBP", "ascii")),
    "webp"
  );
  assert.equal(detectImageType(Buffer.from([0x3c, 0x73, 0x76, 0x67])), null);
});

test("allows only safe image extensions and rejects SVG", () => {
  assert.equal(isAllowedImageUpload({ originalname: "photo.jpg", mimetype: "" }), true);
  assert.equal(isAllowedImageUpload({ originalname: "photo.jpeg", mimetype: "application/octet-stream" }), true);
  assert.equal(isAllowedImageUpload({ originalname: "photo.webp", mimetype: "" }), true);
  assert.equal(isAllowedImageUpload({ originalname: "photo.svg", mimetype: "image/svg+xml" }), false);
  assert.equal(isAllowedImageUpload({ originalname: "archive.exe", mimetype: "" }), false);
});
