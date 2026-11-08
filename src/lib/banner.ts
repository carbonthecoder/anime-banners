import manifestData from "@/data/banner_manifest.json";
import sharp from "sharp";

export interface BannerItem {
  id: string;
  path: string;
  category: string;
  title: string;
  cdn_url: string;
  raw_url: string;
}

export interface BannerManifest {
  total: number;
  categories: { name: string; count: number }[];
  items: BannerItem[];
}

export const manifest = manifestData as BannerManifest;

// In-memory LRU cache for fetched source images (max 100 images ~ 50MB RAM)
const memoryCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 120;

function cacheSet(key: string, value: Buffer) {
  if (memoryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, value);
}

// Preset mapping
export const BANNER_PRESETS = {
  github: { width: 1844, height: 999, label: "GitHub Profile Banner (1844×999)" },
  "github-compact": { width: 1200, height: 400, label: "GitHub Compact (1200×400 • 3:1)" },
  twitter: { width: 1500, height: 500, label: "Twitter / X Header (1500×500 • 3:1)" },
  discord: { width: 1920, height: 1080, label: "Discord Banner (1920×1080 • 16:9)" },
} as const;

export type PresetKey = keyof typeof BANNER_PRESETS;

export interface BannerOptions {
  width?: number;
  height?: number;
  preset?: PresetKey | string;
  crop?: "attention" | "entropy" | "center" | "top";
  badge?: boolean;
  dim?: boolean;
  vignette?: boolean;
  blur?: number;
  format?: "jpeg" | "webp" | "png";
  quality?: number;
}

// Normalize language query to match manifest categories
export function matchCategories(query: string): string[] {
  const parts = query.toLowerCase().split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return [];

  const aliasMap: Record<string, string> = {
    js: "Javascript",
    javascript: "Javascript",
    ts: "Typescript",
    typescript: "Typescript",
    cpp: "C++",
    "c++": "C++",
    cs: "C#",
    csharp: "C#",
    py: "Python",
    python: "Python",
    rs: "Rust",
    rust: "Rust",
    golang: "Go",
    go: "Go",
    rb: "Ruby",
    ruby: "Ruby",
    sh: "Bash",
    bash: "Bash",
    shell: "Bash",
    linux: "Linux",
    docker: "Docker",
    math: "Math",
    sicp: "SICP",
  };

  const matched = new Set<string>();
  for (const part of parts) {
    if (aliasMap[part]) {
      matched.add(aliasMap[part].toLowerCase());
    } else {
      matched.add(part);
    }
  }

  return manifest.categories
    .filter((c) => matched.has(c.name.toLowerCase()))
    .map((c) => c.name);
}

// Filter items by language or keyword
export function filterItems(options: { lang?: string; query?: string }): BannerItem[] {
  let list = manifest.items;

  if (options.lang) {
    const matchedCats = matchCategories(options.lang);
    if (matchedCats.length > 0) {
      const catSet = new Set(matchedCats.map((c) => c.toLowerCase()));
      list = list.filter((item) => catSet.has(item.category.toLowerCase()));
    }
  }

  if (options.query) {
    const q = options.query.toLowerCase();
    list = list.filter(
      (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }

  return list.length > 0 ? list : manifest.items;
}

// Deterministic simple hash for seeds
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Select an item based on ID, Seed, or Random selection
export function selectItem(options: { id?: string; seed?: string; lang?: string }): {
  item: BannerItem;
  isSeeded: boolean;
} {
  if (options.id) {
    const found = manifest.items.find((it) => it.id === options.id);
    if (found) return { item: found, isSeeded: true };
  }

  const pool = filterItems({ lang: options.lang });

  if (options.seed !== undefined && options.seed !== "") {
    const num = parseInt(options.seed, 10);
    const index = isNaN(num) ? hashString(options.seed) % pool.length : Math.abs(num) % pool.length;
    return { item: pool[index], isSeeded: true };
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return { item: pool[randomIndex], isSeeded: false };
}

// Fetch source image with retry and fallback
export async function fetchSourceImage(item: BannerItem): Promise<Buffer> {
  const cached = memoryCache.get(item.path);
  if (cached) return cached;

  const urls = [item.cdn_url, item.raw_url];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Anime-Banner-Bot/1.0" },
        cache: "force-cache",
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        cacheSet(item.path, buf);
        return buf;
      }
    } catch {
      // try next url
    }
  }

  throw new Error(`Failed to fetch source image for: ${item.path}`);
}

// Process and crop banner with Sharp
export async function processBanner(
  sourceBuffer: Buffer,
  item: BannerItem,
  options: BannerOptions
): Promise<{ buffer: Buffer; contentType: string }> {
  // Determine width & height
  let width = options.width || 1844;
  let height = options.height || 999;

  if (options.preset && options.preset in BANNER_PRESETS) {
    const p = BANNER_PRESETS[options.preset as PresetKey];
    width = p.width;
    height = p.height;
  }

  // Constrain dimensions to sane boundaries
  width = Math.min(Math.max(200, width), 3840);
  height = Math.min(Math.max(100, height), 2160);

  // Crop strategy
  let position: sharp.ResizeOptions["position"] = sharp.strategy.attention;
  if (options.crop === "entropy") position = sharp.strategy.entropy;
  if (options.crop === "center") position = "center";
  if (options.crop === "top") position = "top";

  let pipeline = sharp(sourceBuffer).resize(width, height, {
    fit: "cover",
    position,
  });

  if (options.blur && options.blur > 0) {
    const sigma = Math.min(Math.max(0.3, options.blur), 20);
    pipeline = pipeline.blur(sigma);
  }

  // Composite layers (vignette, dim, badge)
  const composites: sharp.OverlayOptions[] = [];

  // Dim gradient at bottom for text readability
  if (options.dim) {
    const dimSvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dimGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="45%" stop-color="#000000" stop-opacity="0" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.75" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#dimGrad)" />
      </svg>
    `);
    composites.push({ input: dimSvg, blend: "over" });
  }

  // Vignette effect
  if (options.vignette) {
    const vignetteSvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="vigGrad" cx="50%" cy="50%" r="65%">
            <stop offset="40%" stop-color="#000000" stop-opacity="0" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#vigGrad)" />
      </svg>
    `);
    composites.push({ input: vignetteSvg, blend: "multiply" });
  }

  // Corner glass badge
  if (options.badge) {
    const escapedCat = item.category.replace(/[<>&"]/g, "");
    const escapedTitle = item.title.replace(/[<>&"]/g, "").slice(0, 36);

    const badgeWidth = Math.min(Math.max(260, Math.floor(width * 0.28)), 420);
    const badgeHeight = Math.floor(badgeWidth * 0.22);
    const fontSizeCat = Math.floor(badgeHeight * 0.32);
    const fontSizeTitle = Math.floor(badgeHeight * 0.22);

    const badgeSvg = Buffer.from(`
      <svg width="${badgeWidth}" height="${badgeHeight}" viewBox="0 0 ${badgeWidth} ${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${badgeWidth}" height="${badgeHeight}" rx="${Math.floor(badgeHeight * 0.3)}" fill="rgba(8, 8, 12, 0.82)" stroke="rgba(255, 255, 255, 0.18)" stroke-width="1.5" />
        <circle cx="${Math.floor(badgeHeight * 0.45)}" cy="${Math.floor(badgeHeight * 0.5)}" r="${Math.floor(badgeHeight * 0.16)}" fill="#ec4899" />
        <text x="${Math.floor(badgeHeight * 0.8)}" y="${Math.floor(badgeHeight * 0.46)}" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="${fontSizeCat}" font-weight="700">${escapedCat}</text>
        <text x="${Math.floor(badgeHeight * 0.8)}" y="${Math.floor(badgeHeight * 0.78)}" fill="rgba(255, 255, 255, 0.65)" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="${fontSizeTitle}">${escapedTitle}</text>
      </svg>
    `);

    // Place badge in bottom-left with margin
    const margin = Math.floor(width * 0.025);
    composites.push({
      input: badgeSvg,
      top: height - badgeHeight - margin,
      left: margin,
      blend: "over",
    });
  }

  if (composites.length > 0) {
    pipeline = pipeline.composite(composites);
  }

  // Format & Quality
  const format = options.format || "jpeg";
  const quality = Math.min(Math.max(30, options.quality || 85), 100);

  let outputBuffer: Buffer;
  let contentType = "image/jpeg";

  if (format === "webp") {
    outputBuffer = await pipeline.webp({ quality }).toBuffer();
    contentType = "image/webp";
  } else if (format === "png") {
    outputBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    contentType = "image/png";
  } else {
    outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    contentType = "image/jpeg";
  }

  return { buffer: outputBuffer, contentType };
}
