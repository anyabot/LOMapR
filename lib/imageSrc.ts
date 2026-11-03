import PUBLIC_IMAGES from './publicImages.json';

const PUBLIC_SET = new Set(PUBLIC_IMAGES as string[]);
const VARIANT = /^\/images\/(icons|tbaricon)\/(.+)\.png$/;

// `rel` is relative to public/, e.g. "images/icons/X.png".
export const hasPublicImage = (rel: string) => PUBLIC_SET.has(rel);

// Tile-sized WebP copy from scripts/gen-image-variants.js; anything else keeps its URL.
export function variant(src: string): string {
  const m = VARIANT.exec(src);
  return m && PUBLIC_SET.has(`images/${m[1]}/${m[2]}.png`) ? `/images/_w/${m[1]}/${m[2]}.webp` : src;
}

export const iconSrc = (name: string) => variant(`/images/icons/${name}.png`);
