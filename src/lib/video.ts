/** Turn a YouTube / Vimeo / direct video link into an embeddable player URL and a thumbnail. */
export type VideoSource =
  | { kind: "youtube"; id: string; embed: string; thumb: string }
  | { kind: "vimeo"; id: string; embed: string; thumb?: undefined }
  | { kind: "file"; src: string; embed?: undefined; thumb?: undefined }
  | { kind: "unknown"; href: string; embed?: undefined; thumb?: undefined };

export function parseVideo(url: string): VideoSource {
  let u: URL;
  try { u = new URL(url); } catch { return { kind: "unknown", href: url }; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com"))
    id = u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1] ?? null;
  if (id && /^[\w-]{6,20}$/.test(id))
    // privacy-enhanced mode: no tracking cookies until the visitor presses play
    return { kind: "youtube", id, embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  if (host.endsWith("vimeo.com")) {
    const v = u.pathname.match(/\/(\d{5,})/)?.[1];
    if (v) return { kind: "vimeo", id: v, embed: `https://player.vimeo.com/video/${v}?autoplay=1&dnt=1` };
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u.pathname)) return { kind: "file", src: url };
  return { kind: "unknown", href: url };
}
