/**
 * Shared upload validation helpers.
 * No admin file-upload routes exist yet; use these when adding any.
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateUploadFile(input: {
  mimeType?: string | null;
  sizeBytes?: number | null;
  allowedMimeTypes?: readonly string[];
  maxBytes?: number;
}): UploadValidationResult {
  const allowed = input.allowedMimeTypes ?? ALLOWED_IMAGE_MIME_TYPES;
  const maxBytes = input.maxBytes ?? MAX_UPLOAD_BYTES;
  const mime = (input.mimeType ?? "").toLowerCase();
  const size = input.sizeBytes ?? 0;

  if (!mime || !allowed.includes(mime)) {
    return { ok: false, error: "Unsupported file type." };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "Invalid file size." };
  }
  if (size > maxBytes) {
    return { ok: false, error: "File is too large." };
  }
  return { ok: true };
}
