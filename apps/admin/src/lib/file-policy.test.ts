import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  validateFileMetadata,
  validateFileContentSignature,
  sanitizeFilename,
  MAX_SIZE_BYTES,
  EXTENSIONS_BY_CATEGORY,
} from "./file-policy";
import {
  makeFileKey as r2MakeFileKey,
  makeAssetKey,
  sanitizeFilenameForKey,
} from "./r2";

describe("validateFileMetadata", () => {
  it("accepts a valid JPEG image", () => {
    const r = validateFileMetadata({
      filename: "photo.jpg",
      clientContentType: "image/jpeg",
      size: 1024,
    });
    expect(r.ok).toBe(true);
    expect(r.category).toBe("image");
  });

  it("accepts PNG, WebP, GIF images", () => {
    for (const [ext, mime] of [
      ["png", "image/png"],
      ["webp", "image/webp"],
      ["gif", "image/gif"],
    ]) {
      const r = validateFileMetadata({
        filename: `file.${ext}`,
        clientContentType: mime,
        size: 1024,
      });
      expect(r.ok, ext).toBe(true);
      expect(r.category).toBe("image");
    }
  });

  it("accepts MP4 and WebM videos", () => {
    for (const [ext, mime] of [
      ["mp4", "video/mp4"],
      ["webm", "video/webm"],
    ]) {
      const r = validateFileMetadata({
        filename: `file.${ext}`,
        clientContentType: mime,
        size: 1024,
      });
      expect(r.ok, ext).toBe(true);
      expect(r.category).toBe("video");
    }
  });

  it("accepts PDF documents", () => {
    const r = validateFileMetadata({
      filename: "doc.pdf",
      clientContentType: "application/pdf",
      size: 1024,
    });
    expect(r.ok).toBe(true);
    expect(r.category).toBe("document");
  });

  it("rejects unsupported extensions", () => {
    const r = validateFileMetadata({
      filename: "script.exe",
      clientContentType: "application/octet-stream",
      size: 1024,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("not supported");
  });

  it("rejects files with no extension", () => {
    const r = validateFileMetadata({
      filename: "README",
      clientContentType: "text/plain",
      size: 1024,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty files", () => {
    const r = validateFileMetadata({
      filename: "empty.jpg",
      clientContentType: "image/jpeg",
      size: 0,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("empty");
  });

  it("rejects images over 15 MB", () => {
    const r = validateFileMetadata({
      filename: "big.jpg",
      clientContentType: "image/jpeg",
      size: 16 * 1024 * 1024,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("too large");
  });

  it("rejects videos over 100 MB", () => {
    const r = validateFileMetadata({
      filename: "big.mp4",
      clientContentType: "video/mp4",
      size: 101 * 1024 * 1024,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects documents over 20 MB", () => {
    const r = validateFileMetadata({
      filename: "big.pdf",
      clientContentType: "application/pdf",
      size: 21 * 1024 * 1024,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty filenames", () => {
    const r = validateFileMetadata({
      filename: "",
      clientContentType: "image/jpeg",
      size: 1024,
    });
    expect(r.ok).toBe(false);
  });

  it("SVG is not in the permitted image extensions", () => {
    expect(EXTENSIONS_BY_CATEGORY.image).not.toContain("svg");
    const r = validateFileMetadata({
      filename: "logo.svg",
      clientContentType: "image/svg+xml",
      size: 1024,
    });
    expect(r.ok).toBe(false);
  });
});
describe("sanitizeFilename", () => {
  it("takes the basename to block directory traversal", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("folder/../evil.txt")).toBe("evil.txt");
  });

  it("collapses runs of unsafe characters to a single underscore", () => {
    expect(sanitizeFilename("weird!@#name.jpg")).toBe("weird_name.jpg");
  });

  it("trims leading/trailing underscores", () => {
    expect(sanitizeFilename("___hello___")).toBe("hello");
  });

  it("returns 'file' for an empty name", () => {
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("validateFileContentSignature", () => {
  it("accepts a valid JPEG signature", () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(validateFileContentSignature(buf as unknown as ArrayBuffer, "jpg")).toBe(true);
    expect(validateFileContentSignature(buf as unknown as ArrayBuffer, "jpeg")).toBe(true);
  });

  it("accepts a valid PNG signature", () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(validateFileContentSignature(buf as unknown as ArrayBuffer, "png")).toBe(true);
  });

  it("accepts a valid PDF signature", () => {
    const buf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    expect(validateFileContentSignature(buf as unknown as ArrayBuffer, "pdf")).toBe(true);
  });

  it("accepts a valid WebP signature (RIFF....WEBP)", () => {
    const buf = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(validateFileContentSignature(buf as unknown as ArrayBuffer, "webp")).toBe(true);
  });

  it("rejects a mismatched signature", () => {
    const buf = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    expect(validateFileContentSignature(buf as unknown as ArrayBuffer, "jpg")).toBe(false);
  });

  it("allows extensions without a defined signature", () => {
    const buf = new Uint8Array([0x00, 0x00]);
    expect(validateFileContentSignature(buf as unknown as ArrayBuffer, "xyz")).toBe(true);
  });
});

describe("policy constants", () => {
  it("defines size limits by category", () => {
    expect(MAX_SIZE_BYTES.image).toBe(15 * 1024 * 1024);
    expect(MAX_SIZE_BYTES.video).toBe(100 * 1024 * 1024);
    expect(MAX_SIZE_BYTES.document).toBe(20 * 1024 * 1024);
  });

  it("does not list SVG as permitted", () => {
    for (const exts of Object.values(EXTENSIONS_BY_CATEGORY)) {
      expect(exts).not.toContain("svg");
    }
  });
});

describe("makeFileKey", () => {
  it("generates organization-prefixed unique keys", () => {
    const k1 = r2MakeFileKey("org_123", "photo.jpg");
    const k2 = r2MakeFileKey("org_123", "photo.jpg");
    expect(k1.startsWith("org_123/")).toBe(true);
    expect(k1).toMatch(/-photo\.jpg$/);
    expect(k1).not.toBe(k2);
  });

  it("sanitizes the filename portion", () => {
    const k = r2MakeFileKey("org_123", "../evil.txt");
    const afterOrg = k.slice(k.indexOf("/") + 1);
    expect(afterOrg).not.toContain("/");
    expect(afterOrg).toMatch(/evil\.txt$/);
  });
});

describe("sanitizeFilenameForKey", () => {
  it("sanitizes unsafe characters", () => {
    expect(sanitizeFilenameForKey("My Products!")).toBe("My_Products");
  });

  it("blocks path traversal", () => {
    expect(sanitizeFilenameForKey("../../etc")).toBe("etc");
  });

  it("defaults empty/reserved names to file", () => {
    expect(sanitizeFilenameForKey("")).toBe("file");
    expect(sanitizeFilenameForKey("CON")).toBe("file");
  });
});

describe("sanitizeFilenameForKey", () => {
  it("sanitizes unsafe characters", () => {
    expect(sanitizeFilenameForKey("IMG 2026.jpg")).toBe("IMG_2026.jpg");
  });

  it("blocks path traversal", () => {
    expect(sanitizeFilenameForKey("../../evil.png")).toBe("evil.png");
  });

  it("preserves extension", () => {
    expect(sanitizeFilenameForKey("SCENE_01.png")).toBe("SCENE_01.png");
  });
});

describe("makeAssetKey", () => {
  const checkExisting = vi.fn(async () => false);

  beforeEach(() => {
    checkExisting.mockReset();
    checkExisting.mockResolvedValue(false);
  });

  it("generates readable keys with assets root prefix", async () => {
    const key = await makeAssetKey({
      folder: "products",
      filename: "IMG_20261105_193751112.jpg",
      checkExisting,
    });
    expect(key).toBe("assets/products/IMG_20261105_193751112.jpg");
  });

  it("uses original filename without UUID prefix", async () => {
    const key = await makeAssetKey({
      folder: "storyboards",
      filename: "SCENE_01_STORYBOARD_REFERENCE.png",
      checkExisting,
    });
    expect(key.startsWith("assets/storyboards/")).toBe(true);
    expect(key).toBe("assets/storyboards/SCENE_01_STORYBOARD_REFERENCE.png");
  });

  it("sanitizes the folder name", async () => {
    const key = await makeAssetKey({
      folder: "My Folder!",
      filename: "file.jpg",
      checkExisting,
    });
    expect(key).toBe("assets/My_Folder/file.jpg");
  });

  it("rejects path traversal in filename", async () => {
    const key = await makeAssetKey({
      folder: "products",
      filename: "../../etc/passwd.jpg",
      checkExisting,
    });
    expect(key).not.toContain("..");
    expect(key.endsWith("passwd.jpg")).toBe(true);
  });

  it("defaults empty folder to uploads", async () => {
    const key = await makeAssetKey({
      folder: "",
      filename: "file.jpg",
      checkExisting,
    });
    expect(key).toBe("assets/uploads/file.jpg");
  });

  it("resolves duplicate filenames with suffixes", async () => {
    // First key exists, suffixed key does not.
    checkExisting
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const key = await makeAssetKey({
      folder: "products",
      filename: "image.jpg",
      checkExisting,
    });
    expect(key).toBe("assets/products/image-2.jpg");
  });

  it("does not overwrite existing objects", async () => {
    // First key exists, suffixed key does not.
    checkExisting
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const key = await makeAssetKey({
      folder: "products",
      filename: "image.jpg",
      checkExisting,
    });
    expect(key).toBe("assets/products/image-2.jpg");
  });
});

