import manifestData from "@/data/banner_manifest.json";
import sharp from "sharp";

export interface BannerItem {
  id: string;
  path: string;
  category: string;
  title: string;
  cdn_url: string;
  raw_url: string;
  width?: number;
  height?: number;
  aspect_ratio?: number;
  orientation?: "wide" | "square" | "portrait";
}

export interface BannerManifest {
  total: number;
  categories: { name: string; count: number }[];
  stats?: { total: number; wide: number; square: number; portrait: number };
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

// In-memory LRU cache for final rendered banner buffers (sub-2ms warm hits)
const processedBannerCache = new Map<string, { buffer: Buffer; contentType: string }>();
const MAX_PROCESSED_CACHE = 150;

function processedCacheSet(key: string, value: { buffer: Buffer; contentType: string }) {
  if (processedBannerCache.size >= MAX_PROCESSED_CACHE) {
    const firstKey = processedBannerCache.keys().next().value;
    if (firstKey) processedBannerCache.delete(firstKey);
  }
  processedBannerCache.set(key, value);
}

// Preset mapping
export const BANNER_PRESETS = {
  github: { width: 1844, height: 999, label: "GitHub Banner (1844×999 • 1.85:1)" },
  "github-compact": { width: 1200, height: 400, label: "GitHub Compact (1200×400 • 3:1)" },
  twitter: { width: 1500, height: 500, label: "Twitter / X (1500×500 • 3:1)" },
  discord: { width: 680, height: 240, label: "Discord Profile (680×240 • 2.83:1)" },
  "discord-server": { width: 960, height: 540, label: "Discord Server (960×540 • 16:9)" },
  square: { width: 1000, height: 1000, label: "Square Cover (1000×1000 • 1:1)" },
  portrait: { width: 800, height: 1000, label: "Portrait Cover (800×1000 • 4:5)" },
} as const;

export type PresetKey = keyof typeof BANNER_PRESETS;

export interface BannerOptions {
  width?: number;
  height?: number;
  preset?: PresetKey | string;
  ratio?: "wide" | "square" | "portrait" | "all";
  crop?: "attention" | "entropy" | "center" | "top";
  badge?: boolean;
  user?: string;
  pool?: string;
  favs?: string;
  tint?: boolean;
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
    kt: "Kotlin",
    kotlin: "Kotlin",
    java: "Java",
    sql: "SQL",
    git: "Git",
    html: "HTML",
    css: "CSS",
    php: "PHP",
    swift: "Swift",
    haskell: "Haskell",
    nix: "Nix",
    vim: "Vim",
    neovim: "Vim",
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

// Filter items by language, keyword, pool, favs list, or aspect ratio
export function filterItems(options: {
  lang?: string;
  pool?: string;
  favs?: string;
  query?: string;
  ratio?: string;
}): BannerItem[] {
  let list = manifest.items;

  // Filter strictly by favs IDs if provided
  if (options.favs) {
    const favIds = new Set(
      options.favs.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    );
    if (favIds.size > 0) {
      const favList = list.filter((item) => favIds.has(item.id.toLowerCase()));
      if (favList.length > 0) list = favList;
    }
  }

  // Filter by aspect ratio orientation (wide, square, portrait)
  if (options.ratio && options.ratio !== "all") {
    const targetOrientation = options.ratio.toLowerCase().trim();
    const ratioList = list.filter((item) => item.orientation === targetOrientation);
    if (ratioList.length > 0) {
      list = ratioList;
    }
  }

  const targetCategory = options.pool || options.lang;

  if (targetCategory) {
    const matchedCats = matchCategories(targetCategory);
    if (matchedCats.length > 0) {
      const catSet = new Set(matchedCats.map((c) => c.toLowerCase()));
      const catList = list.filter((item) => catSet.has(item.category.toLowerCase()));
      if (catList.length > 0) list = catList;
    }
  }

  if (options.query) {
    const q = options.query.toLowerCase();
    const queryList = list.filter(
      (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
    if (queryList.length > 0) list = queryList;
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
export function selectItem(options: {
  id?: string;
  seed?: string;
  lang?: string;
  pool?: string;
  favs?: string;
  ratio?: string;
}): {
  item: BannerItem;
  isSeeded: boolean;
} {
  if (options.id) {
    const found = manifest.items.find((it) => it.id === options.id);
    if (found) return { item: found, isSeeded: true };
  }

  const pool = filterItems({
    lang: options.lang,
    pool: options.pool,
    favs: options.favs,
    ratio: options.ratio,
  });

  if (options.seed !== undefined && options.seed !== "") {
    const num = parseInt(options.seed, 10);
    const index = isNaN(num) ? hashString(options.seed) % pool.length : Math.abs(num) % pool.length;
    return { item: pool[index], isSeeded: true };
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return { item: pool[randomIndex], isSeeded: false };
}

// Fetch source image with fast multi-mirror fallback and 3.5s timeout
export async function fetchSourceImage(item: BannerItem): Promise<Buffer> {
  const cached = memoryCache.get(item.path);
  if (cached) return cached;

  const urls = [
    `https://fastly.jsdelivr.net/gh/cat-milk/Anime-Girls-Holding-Programming-Books@master/${item.path}`,
    item.cdn_url,
    item.raw_url,
    `https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/${item.path}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Anime-Banner-Bot/1.0" },
        cache: "force-cache",
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        cacheSet(item.path, buf);
        return buf;
      }
    } catch {
      // try next mirror
    }
  }

  // Graceful fallback to any cached buffer or default fallback
  if (memoryCache.size > 0) {
    const fallbackBuf = memoryCache.values().next().value;
    if (fallbackBuf) return fallbackBuf;
  }

  // Final fallback to default item
  if (item.id !== manifest.items[0].id) {
    return fetchSourceImage(manifest.items[0]);
  }

  throw new Error(`Failed to fetch source image for: ${item.path}`);
}

// Process and crop banner with Sharp
export async function processBanner(
  sourceBuffer: Buffer,
  item: BannerItem,
  options: BannerOptions
): Promise<{ buffer: Buffer; contentType: string }> {
  // Determine width & height based on item aspect ratio & orientation
  const itemRatio = item.aspect_ratio || (item.width && item.height ? item.width / item.height : 1.78);
  const isPortrait = item.orientation === "portrait" || itemRatio < 0.85;
  const isSquare = item.orientation === "square" || (itemRatio >= 0.85 && itemRatio < 1.25);

  let width: number;
  let height: number;

  if (options.width && options.height) {
    width = options.width;
    height = options.height;
  } else if (options.preset && options.preset in BANNER_PRESETS) {
    const p = BANNER_PRESETS[options.preset as PresetKey];
    width = p.width;
    height = p.height;
  } else if (isPortrait || options.ratio === "portrait") {
    // Preserve natural proportions so portrait illustrations (character & book) are NEVER sliced
    height = 1000;
    width = Math.round(1000 * itemRatio);
  } else if (isSquare || options.ratio === "square") {
    // Square proportion
    height = 1000;
    width = Math.round(1000 * itemRatio);
  } else {
    // Standard wide banner
    width = 1844;
    height = 999;
  }

  // Constrain dimensions to sane boundaries
  width = Math.min(Math.max(200, width), 3840);
  height = Math.min(Math.max(100, height), 2160);

  // Fast In-Memory Cache Check (<2ms response)
  const cacheKey = `${item.id}:${width}:${height}:${options.crop || "attention"}:${options.tint ? 1 : 0}:${options.dim ? 1 : 0}:${options.vignette ? 1 : 0}:${options.badge ? 1 : 0}:${options.user || ""}:${options.format || "jpeg"}:${options.quality || 85}`;
  const cached = processedBannerCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Crop strategy
  let position: sharp.ResizeOptions["position"] = sharp.strategy.attention;
  if (options.crop === "entropy") position = sharp.strategy.entropy;
  if (options.crop === "center") position = "center";
  if (options.crop === "top") position = "top";

  // Full edge-to-edge banner cover (sharp attention preserves character & book)
  let pipeline = sharp(sourceBuffer).resize(width, height, {
    fit: "cover",
    position,
  });

  if (options.blur && options.blur > 0) {
    const sigma = Math.min(Math.max(0.3, options.blur), 20);
    pipeline = pipeline.blur(sigma);
  }

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

  // Cozy dark tint (calms intense white highlights for dark mode)
  if (options.tint) {
    const tintSvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0d0e12" fill-opacity="0.18" />
      </svg>
    `);
    composites.push({ input: tintSvg, blend: "over" });
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

  // Corner glass badge with Dusk Rose accent (#f472b6)
  if (options.badge) {
    const escapedCat = item.category.replace(/[<>&"]/g, "");
    const escapedTitle = item.title.replace(/[<>&"]/g, "").slice(0, 36);
    const escapedUser = (options.user || "").trim().replace(/[<>&"]/g, "").slice(0, 24);

    const badgeWidth = Math.min(Math.max(280, Math.floor(width * 0.3)), 460);
    const badgeHeight = Math.floor(badgeWidth * 0.22);
    const fontSizeMain = Math.floor(badgeHeight * 0.32);
    const fontSizeSub = Math.floor(badgeHeight * 0.22);

    const line1 = escapedUser ? `@${escapedUser} · ${escapedCat}` : escapedCat;
    const line2 = escapedTitle;

    const badgeSvg = Buffer.from(`
      <svg width="${badgeWidth}" height="${badgeHeight}" viewBox="0 0 ${badgeWidth} ${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${badgeWidth}" height="${badgeHeight}" rx="${Math.floor(badgeHeight * 0.3)}" fill="rgba(13, 14, 18, 0.85)" stroke="rgba(244, 114, 182, 0.3)" stroke-width="1.5" />
        <circle cx="${Math.floor(badgeHeight * 0.45)}" cy="${Math.floor(badgeHeight * 0.5)}" r="${Math.floor(badgeHeight * 0.16)}" fill="#f472b6" />
        <text x="${Math.floor(badgeHeight * 0.8)}" y="${Math.floor(badgeHeight * 0.46)}" fill="#fdf2f8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="${fontSizeMain}" font-weight="700">${line1}</text>
        <text x="${Math.floor(badgeHeight * 0.8)}" y="${Math.floor(badgeHeight * 0.78)}" fill="rgba(244, 244, 246, 0.7)" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="${fontSizeSub}">${line2}</text>
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

  const result = { buffer: outputBuffer, contentType };
  processedCacheSet(cacheKey, result);
  return result;
}
