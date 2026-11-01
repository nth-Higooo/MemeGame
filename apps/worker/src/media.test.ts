import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_UPLOAD_BYTES, inspectImageSignature, uploadLimit } from "./media";

describe("image upload validation", () => {
  it("detects a GIF from its signature and dimensions", () => {
    const bytes = new Uint8Array([71, 73, 70, 56, 57, 97, 2, 0, 3, 0]);
    expect(inspectImageSignature(bytes)).toEqual({
      contentType: "image/gif",
      extension: "gif",
      width: 2,
      height: 3,
    });
  });

  it("rejects executable data with a misleading extension", () => {
    expect(inspectImageSignature(new TextEncoder().encode("MZ executable"))).toBeNull();
  });

  it("uses a safe configurable upload limit", () => {
    expect(uploadLimit()).toBe(DEFAULT_MAX_UPLOAD_BYTES);
    expect(uploadLimit("2048")).toBe(2048);
    expect(uploadLimit("invalid")).toBe(DEFAULT_MAX_UPLOAD_BYTES);
  });
});
