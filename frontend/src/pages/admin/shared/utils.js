/**
 * Admin shared utilities for media and entity handling.
 */

export function splitMedia(urls) {
  const list = Array.isArray(urls) ? urls : (typeof urls === "string" && urls ? urls.split("\n").map((s) => s.trim()).filter(Boolean) : []);
  const images = [];
  const docs = [];
  list.forEach((url) => {
    if (!url) return;
    const clean = String(url).split("?")[0].toLowerCase();
    if (clean.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/)) {
      images.push(url);
    } else {
      docs.push(url);
    }
  });
  return { images, docs };
}

export function fileNameFromUrl(url) {
  try {
    const withoutQuery = String(url).split("?")[0];
    const parts = withoutQuery.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return url;
  }
}
