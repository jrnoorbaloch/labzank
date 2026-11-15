/** Supabase Storage helpers for portraits, covers, recitations and book PDFs. */
import { supabase } from "@/lib/db/client";

export type Bucket = "images" | "audio" | "books";

export const LIMITS: Record<Bucket, { bytes: number; accept: string; label: string }> = {
  images: { bytes: 5 * 1024 * 1024, accept: "image/jpeg,image/png,image/webp,image/avif", label: "JPG, PNG, WebP or AVIF · up to 5 MB" },
  audio: { bytes: 50 * 1024 * 1024, accept: "audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/x-m4a,.m4a,.mp3", label: "MP3, M4A, OGG or WAV · up to 50 MB" },
  books: { bytes: 100 * 1024 * 1024, accept: "application/pdf", label: "PDF · up to 100 MB · private" },
};

/** Public URL for a file in a public bucket (images, audio). */
export function mediaUrl(bucket: Exclude<Bucket, "books">, path?: string | null): string | undefined {
  if (!path || !supabase) return undefined;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const safeName = (n: string) => {
  const dot = n.lastIndexOf(".");
  const ext = dot > 0 ? n.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (dot > 0 ? n.slice(0, dot) : n).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
  return ext ? `${base}.${ext}` : base;
};

export async function uploadMedia(bucket: Bucket, folder: string, file: File): Promise<string> {
  if (!supabase) throw new Error("Not connected to Supabase.");
  const lim = LIMITS[bucket];
  if (file.size > lim.bytes) throw new Error(`File is too large (${(file.size / 1048576).toFixed(1)} MB). ${lim.label}.`);
  const okType = lim.accept.split(",").some((a) => (a.startsWith(".") ? file.name.toLowerCase().endsWith(a) : file.type === a));
  if (!okType) throw new Error(`Unsupported file type (${file.type || file.name}). ${lim.label}.`);
  const path = `${folder}/${Date.now().toString(36)}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeMedia(bucket: Bucket, paths: string[]) {
  if (!supabase || !paths.length) return;
  await supabase.storage.from(bucket).remove(paths);
}

/** Short-lived link to a private PDF. Fails unless the book is published and downloadable (or the user is staff). */
export async function bookPdfUrl(path: string, download = false): Promise<string> {
  if (!supabase) throw new Error("Not connected to Supabase.");
  const { data, error } = await supabase.storage.from("books").createSignedUrl(path, 60 * 10, download ? { download: true } : undefined);
  if (error || !data) throw new Error(error?.message ?? "Not available");
  return data.signedUrl;
}
