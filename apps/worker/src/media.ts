export const ALLOWED_IMAGE_TYPES = ["image/gif", "image/webp", "image/png", "image/jpeg"] as const;
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type ImageInfo = {
  contentType: (typeof ALLOWED_IMAGE_TYPES)[number];
  extension: "gif" | "webp" | "png" | "jpg";
  width: number | null;
  height: number | null;
};

function u16le(bytes: Uint8Array, offset: number) {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}
function u32be(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

export function inspectImageSignature(bytes: Uint8Array): ImageInfo | null {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes.length >= 10 && ["GIF87a", "GIF89a"].includes(ascii(0, 6))) {
    return {
      contentType: "image/gif",
      extension: "gif",
      width: u16le(bytes, 6),
      height: u16le(bytes, 8),
    };
  }
  if (
    bytes.length >= 24 &&
    bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])
  ) {
    return {
      contentType: "image/png",
      extension: "png",
      width: u32be(bytes, 16),
      height: u32be(bytes, 20),
    };
  }
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    let width: number | null = null;
    let height: number | null = null;
    if (bytes.length >= 30 && ascii(12, 4) === "VP8X") {
      width = 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16);
      height = 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16);
    }
    return { contentType: "image/webp", extension: "webp", width, height };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (
        marker !== undefined &&
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        return {
          contentType: "image/jpeg",
          extension: "jpg",
          height: (bytes[offset + 5]! << 8) + bytes[offset + 6]!,
          width: (bytes[offset + 7]! << 8) + bytes[offset + 8]!,
        };
      }
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const length = (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
      if (length < 2) break;
      offset += length + 2;
    }
    return { contentType: "image/jpeg", extension: "jpg", width: null, height: null };
  }
  return null;
}

export function uploadLimit(envValue?: string) {
  const parsed = Number(envValue);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES;
}
