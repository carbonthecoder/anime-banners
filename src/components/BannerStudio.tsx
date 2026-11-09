"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Pin,
  Sparkles,
  Search,
  BookOpen,
  Github,
  Monitor,
  Smartphone,
  SlidersHorizontal,
  Sun,
  Moon,
  Share2,
  Cpu,
  Heart,
  Undo2,
  Crop,
  ChevronDown,
} from "lucide-react";
import { marked } from "marked";
import manifestData from "@/data/banner_manifest.json";

interface Category {
  name: string;
  count: number;
}

interface BannerItem {
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

interface GitHubProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
}

const PRESETS = [
  { id: "github", label: "GitHub Banner", width: 1844, height: 999, ratio: "1.85:1" },
  { id: "adaptive", label: "Adaptive (Original)", width: 0, height: 0, ratio: "Auto" },
  { id: "github-compact", label: "GitHub Compact", width: 1200, height: 400, ratio: "3:1" },
  { id: "twitter", label: "Twitter / X", width: 1500, height: 500, ratio: "3:1" },
  { id: "discord", label: "Discord Profile", width: 600, height: 240, ratio: "5:2" },
];

const POPULAR_TOPICS = [
  "Rust",
  "Python",
  "Go",
  "TypeScript",
  "JavaScript",
  "C++",
  "Linux",
  "Docker",
  "Kotlin",
  "Java",
  "Bash",
  "SQL",
  "Git",
  "SICP",
  "Haskell",
  "Swift",
  "Math",
  "C#",
];

export default function BannerStudio() {
  // Preset, Dimensions & Aspect Ratio Filters
  const [preset, setPreset] = useState("github");
  const [ratioFilter, setRatioFilter] = useState<"all" | "wide" | "square" | "portrait">("all");
  const [catalogRatio, setCatalogRatio] = useState<"all" | "wide" | "square" | "portrait">("all");
  const [activeImageAspect, setActiveImageAspect] = useState<number | null>(null);
  const [customW, setCustomW] = useState(1844);
  const [customH, setCustomH] = useState(999);
  const [portraitLayout, setPortraitLayout] = useState<"side" | "top">("side");
  const [crop, setCrop] = useState<"attention" | "center" | "entropy" | "top">("attention");
  const [ghUserNotFound, setGhUserNotFound] = useState(false);

  // Rotation Pool, Favorites & Visual Overlays
  const [selectedPool, setSelectedPool] = useState<string[]>([]);
  const [rollFavsInSnippet, setRollFavsInSnippet] = useState(false);
  const [tint, setTint] = useState(false);
  const [dim, setDim] = useState(false);
  const [vignette, setVignette] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // Favorites stored in LocalStorage
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("anime_banner_favs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("anime_banner_favs", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // App & View State
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [isLoading, setIsLoading] = useState(true);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "github-desktop" | "github-mobile" | "catalog">("canvas");
  const [githubTheme, setGithubTheme] = useState<"dark" | "light">("dark");

  // GitHub User Profile & Real README Fetcher
  const [ghInput, setGhInput] = useState("");
  const [ghProfile, setGhProfile] = useState<GitHubProfile>({
    login: "username",
    name: "Developer",
    avatar_url: "https://avatars.githubusercontent.com/u/9919?s=200&v=4",
    bio: "Developer building things on GitHub.",
    followers: 42,
    following: 12,
    public_repos: 18,
  });
  const [realReadme, setRealReadme] = useState<string>("");
  const [isFetchingGh, setIsFetchingGh] = useState(false);
  const [autoDetectedLangs, setAutoDetectedLangs] = useState<string[]>([]);

  // Catalog State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatalogCat, setSelectedCatalogCat] = useState("All");
  const [catalogPage, setCatalogPage] = useState(1);
  const itemsPerPage = 16;

  // Touch Swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Manifest Data
  const allItems: BannerItem[] = useMemo(() => manifestData.items as BannerItem[], []);
  const allCategories: Category[] = useMemo(() => manifestData.categories as Category[], []);

  // Synchronous, instant rotation pool from manifest (<0.001ms)
  const activePool = useMemo(() => {
    let list = allItems;

    if (rollFavsInSnippet && favorites.length > 0) {
      const favSet = new Set(favorites.map((f) => f.toLowerCase()));
      const favList = list.filter((i) => favSet.has(i.id.toLowerCase()));
      if (favList.length > 0) list = favList;
    }

    if (ratioFilter !== "all") {
      const rList = list.filter((i) => i.orientation === ratioFilter);
      if (rList.length > 0) list = rList;
    }

    if (selectedPool.length > 0) {
      const topicSet = new Set(selectedPool.map((t) => t.toLowerCase()));
      const tList = list.filter((i) => topicSet.has(i.category.toLowerCase()));
      if (tList.length > 0) list = tList;
    }

    return list.length > 0 ? list : allItems;
  }, [allItems, rollFavsInSnippet, favorites, ratioFilter, selectedPool]);

  // Synchronous, instant active item selection (0.001ms)
  const activeItem = useMemo(() => {
    if (pinnedId) {
      const found = allItems.find((i) => i.id === pinnedId);
      if (found) return found;
    }
    const index = Math.abs(seed) % activePool.length;
    return activePool[index] || allItems[0];
  }, [pinnedId, seed, activePool, allItems]);

  // Instant metadata derived synchronously from activeItem
  const currentMeta = useMemo(() => ({
    id: activeItem.id,
    category: activeItem.category,
    title: activeItem.title,
    source: activeItem.path,
    orientation: activeItem.orientation,
    aspect: activeItem.aspect_ratio || null,
  }), [activeItem]);

  // Ultra-fast CDN mirror URL with automatic fallback (properly encodes special characters like # and +)
  const primaryImageUrl = useMemo(() => {
    const safePath = activeItem.path.split("/").map(encodeURIComponent).join("/");
    return `https://fastly.jsdelivr.net/gh/cat-milk/Anime-Girls-Holding-Programming-Books@master/${safePath}`;
  }, [activeItem.path]);

  const [activeImgSrc, setActiveImgSrc] = useState(primaryImageUrl);

  useEffect(() => {
    setActiveImgSrc(primaryImageUrl);
    setIsLoading(true);
  }, [primaryImageUrl]);

  const handleImageError = useCallback(() => {
    if (activeImgSrc.includes("fastly.jsdelivr.net")) {
      setActiveImgSrc(activeItem.cdn_url);
    } else if (activeImgSrc.includes("cdn.jsdelivr.net")) {
      setActiveImgSrc(activeItem.raw_url);
    } else {
      setIsLoading(false);
    }
  }, [activeImgSrc, activeItem]);

  // Preload next 3 covers in pool for 0ms instantaneous flipping
  useEffect(() => {
    const nextIndices = [1, 2, 3].map((offset) => (Math.abs(seed) + offset) % activePool.length);
    nextIndices.forEach((idx) => {
      const item = activePool[idx];
      if (item) {
        const pre = new Image();
        const safePath = item.path.split("/").map(encodeURIComponent).join("/");
        pre.src = `https://fastly.jsdelivr.net/gh/cat-milk/Anime-Girls-Holding-Programming-Books@master/${safePath}`;
      }
    });
  }, [seed, activePool]);

  // Preload catalog covers into browser cache
  useEffect(() => {
    const preloadBatch = allItems.slice(0, 40);
    preloadBatch.forEach((item) => {
      const img = new Image();
      img.src = item.cdn_url;
    });
  }, [allItems]);

  // Read URL query params on initial mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);

    const qPreset = urlParams.get("preset");
    if (qPreset && PRESETS.some((p) => p.id === qPreset)) {
      setPreset(qPreset);
    }

    const qW = urlParams.get("w");
    const qH = urlParams.get("h");
    if (qW && qH) {
      setCustomW(parseInt(qW, 10) || 1844);
      setCustomH(parseInt(qH, 10) || 999);
      setPreset("custom");
    }

    const qRatio = urlParams.get("ratio");
    if (qRatio && ["all", "wide", "square", "portrait"].includes(qRatio)) {
      setRatioFilter(qRatio as "all" | "wide" | "square" | "portrait");
    }

    const qCrop = urlParams.get("crop");
    if (qCrop && ["attention", "entropy", "center", "top"].includes(qCrop)) {
      setCrop(qCrop as "attention" | "entropy" | "center" | "top");
    }

    const qPool = urlParams.get("pool");
    if (qPool) {
      setSelectedPool(qPool.split(",").filter(Boolean));
    }

    const qId = urlParams.get("id");
    if (qId) {
      setPinnedId(qId);
    }

    if (urlParams.get("tint") === "true") setTint(true);
    if (urlParams.get("vignette") === "true") setVignette(true);
  }, []);

  // Sync state changes with shareable browser URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();

    if (preset === "custom") {
      params.set("w", customW.toString());
      params.set("h", customH.toString());
    } else if (preset !== "github") {
      params.set("preset", preset);
    }

    if (ratioFilter !== "all") {
      params.set("ratio", ratioFilter);
    }

    if (pinnedId) {
      params.set("id", pinnedId);
    } else if (selectedPool.length > 0) {
      params.set("pool", selectedPool.join(","));
    }

    if (crop !== "attention") {
      params.set("crop", crop);
    }

    if (tint) params.set("tint", "true");
    if (vignette) params.set("vignette", "true");

    const qs = params.toString();
    const newPath = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", newPath);
  }, [preset, customW, customH, ratioFilter, pinnedId, selectedPool, crop, tint, vignette]);

  // Fetch real GitHub Profile and actual README
  const fetchGitHubUser = useCallback(async (username: string) => {
    const cleanUser = username.trim().replace(/^@/, "");
    if (!cleanUser) return;
    setIsFetchingGh(true);
    setRealReadme("");
    setAutoDetectedLangs([]);
    setGhUserNotFound(false);

    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`);
      if (res.ok) {
        const data = await res.json();
        setGhUserNotFound(false);
        setGhProfile({
          login: data.login,
          name: data.name || data.login,
          avatar_url: data.avatar_url || `https://avatars.githubusercontent.com/${cleanUser}`,
          bio: data.bio || "",
          followers: data.followers || 0,
          following: data.following || 0,
          public_repos: data.public_repos || 0,
        });
      } else {
        setGhUserNotFound(true);
        setGhProfile({
          login: cleanUser,
          name: cleanUser,
          avatar_url: `https://avatars.githubusercontent.com/${cleanUser}`,
          bio: "",
          followers: 0,
          following: 0,
          public_repos: 0,
        });
      }

      // Fetch User's Real README.md
      let readmeText = "";
      try {
        const readmeRes = await fetch(
          `https://raw.githubusercontent.com/${encodeURIComponent(cleanUser)}/${encodeURIComponent(cleanUser)}/main/README.md`
        );
        if (readmeRes.ok) {
          readmeText = await readmeRes.text();
        } else {
          const masterRes = await fetch(
            `https://raw.githubusercontent.com/${encodeURIComponent(cleanUser)}/${encodeURIComponent(cleanUser)}/master/README.md`
          );
          if (masterRes.ok) readmeText = await masterRes.text();
        }
      } catch {
        // Fallback
      }

      if (readmeText) {
        const cleanedReadme = readmeText
          .replace(/<a[^>]*>\s*<img[^>]*banner[^>]*>\s*<\/a>/gi, "")
          .replace(/!\[[^\]]*\]\([^)]*banner[^)]*\)/gi, "")
          .trim();
        setRealReadme(cleanedReadme);
      } else {
        setRealReadme("");
      }

      // Auto-Detect User Tech Stack from Repositories
      try {
        const reposRes = await fetch(
          `https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=30`
        );
        if (reposRes.ok) {
          const repos = await reposRes.json();
          const langCounts: Record<string, number> = {};
          repos.forEach((r: { language?: string }) => {
            if (r.language) {
              langCounts[r.language] = (langCounts[r.language] || 0) + 1;
            }
          });

          const detected = Object.keys(langCounts)
            .filter((l) => POPULAR_TOPICS.some((t) => t.toLowerCase() === l.toLowerCase()))
            .slice(0, 4);

          if (detected.length > 0) {
            setAutoDetectedLangs(detected);
          }
        }
      } catch {
        // Continue gracefully
      }
    } catch {
      setGhUserNotFound(true);
      setGhProfile((prev) => ({
        ...prev,
        login: cleanUser,
        name: cleanUser,
        avatar_url: `https://avatars.githubusercontent.com/${cleanUser}`,
        bio: "",
      }));
      setRealReadme("");
    } finally {
      setIsFetchingGh(false);
    }
  }, []);

  // Parse Real README markdown into clean rendered HTML
  const renderedReadmeHtml = useMemo(() => {
    if (!realReadme) return "";
    try {
      return marked.parse(realReadme, { async: false, breaks: true, gfm: true }) as string;
    } catch {
      return "";
    }
  }, [realReadme]);


  // Studio live preview API URL (includes seed for live interactive rerolling)
  const bannerApiUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (preset === "custom") {
      params.set("w", customW.toString());
      params.set("h", customH.toString());
    } else if (preset !== "github") {
      params.set("preset", preset);
    }

    if (pinnedId) {
      params.set("id", pinnedId);
    } else {
      params.set("seed", seed.toString());

      if (selectedPool.length > 0) {
        params.set("pool", selectedPool.join(","));
      }

      if (ratioFilter !== "all") {
        params.set("ratio", ratioFilter);
      }
    }

    if (crop !== "attention") {
      params.set("crop", crop);
    }

    if (tint) params.set("tint", "true");
    if (dim) params.set("dim", "true");
    if (vignette) params.set("vignette", "true");

    const qs = params.toString();
    return `/api/banner${qs ? `?${qs}` : ""}`;
  }, [preset, customW, customH, pinnedId, seed, selectedPool, ratioFilter, crop, tint, dim, vignette]);

  // Clean, short embed URL for README and API Endpoint (NO seed parameter!)
  const cleanEmbedUrl = useMemo(() => {
    const origin = "https://banners.carbon.is-a.dev";
    const params = new URLSearchParams();

    if (preset === "custom") {
      params.set("w", customW.toString());
      params.set("h", customH.toString());
    } else if (preset !== "github") {
      params.set("preset", preset);
    }

    if (pinnedId) {
      params.set("id", pinnedId);
    } else {
      if (rollFavsInSnippet && favorites.length > 0) {
        params.set("favs", favorites.join(","));
      } else if (selectedPool.length > 0) {
        params.set("pool", selectedPool.join(","));
      }

      if (ratioFilter !== "all") {
        params.set("ratio", ratioFilter);
      }
    }

    if (crop !== "attention") {
      params.set("crop", crop);
    }

    if (tint) params.set("tint", "true");
    if (dim) params.set("dim", "true");
    if (vignette) params.set("vignette", "true");

    const qs = params.toString();
    return `${origin}/api/banner${qs ? `?${qs}` : ""}`;
  }, [preset, customW, customH, pinnedId, rollFavsInSnippet, favorites, selectedPool, ratioFilter, crop, tint, dim, vignette]);

  const reroll = useCallback(() => {
    setPinnedId(null);
    setActiveImageAspect(null);
    setSeed(Math.floor(Math.random() * 1000000));
  }, []);

  const resetAllToDefault = useCallback(() => {
    setCrop("attention");
    setPreset("github");
    setRatioFilter("all");
    setCustomW(1844);
    setCustomH(999);
    setTint(false);
    setDim(false);
    setVignette(false);
    setActiveImageAspect(null);
  }, []);

  const toggleTopicInPool = (topic: string) => {
    setSelectedPool((prev) => {
      if (prev.includes(topic)) {
        return prev.filter((t) => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(type);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const copyShareableLink = () => {
    copyToClipboard(window.location.href, "share");
  };

  // Touch swipes: only reroll on genuine horizontal swipe, ignoring vertical page scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      reroll();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Catalog filtering by ratio, category & query
  const filteredCatalog = useMemo(() => {
    return allItems.filter((item) => {
      const matchRatio = catalogRatio === "all" ? true : item.orientation === catalogRatio;
      const matchCat =
        selectedCatalogCat === "All"
          ? true
          : selectedCatalogCat === "Favorites"
          ? favorites.includes(item.id)
          : item.category.toLowerCase() === selectedCatalogCat.toLowerCase();
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRatio && matchCat && matchQuery;
    });
  }, [allItems, catalogRatio, selectedCatalogCat, searchQuery, favorites]);

  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage);
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * itemsPerPage;
    return filteredCatalog.slice(start, start + itemsPerPage);
  }, [filteredCatalog, catalogPage]);

  // Exact adaptive aspect ratio matching active preset dimensions or image natural orientation
  const currentAspect = useMemo(() => {
    if (preset === "custom") {
      return customW / customH;
    }
    // For portrait covers, keep the natural portrait ratio so manga illustrations are never sliced horizontally
    if (activeItem?.orientation === "portrait" || ratioFilter === "portrait") {
      return activeItem?.aspect_ratio || activeImageAspect || 0.8;
    }
    const matchedPreset = PRESETS.find((p) => p.id === preset);
    if (matchedPreset && matchedPreset.id !== "adaptive" && matchedPreset.width > 0 && matchedPreset.height > 0) {
      return matchedPreset.width / matchedPreset.height;
    }
    if (activeItem?.aspect_ratio) {
      return activeItem.aspect_ratio;
    }
    if (activeImageAspect) {
      return activeImageAspect;
    }
    if (ratioFilter === "square") return 1.0;
    return 1844 / 999;
  }, [preset, customW, customH, activeItem, activeImageAspect, ratioFilter]);

  // Check if active cover is portrait
  const isPortraitCover = useMemo(() => {
    return (
      ratioFilter === "portrait" ||
      activeItem?.orientation === "portrait" ||
      currentAspect < 0.95
    );
  }, [ratioFilter, activeItem?.orientation, currentAspect]);

  // Clean Markdown & HTML Snippets (Approach A for portrait covers: align="right")
  const userHandle = ghProfile.login || "username";
  const markdownSnippet = useMemo(() => {
    if (isPortraitCover && portraitLayout === "side") {
      return `<a href="https://github.com/${userHandle}">\n  <img src="${cleanEmbedUrl}" align="right" width="240" alt="Anime Programming Cover" />\n</a>`;
    }
    return `[![Banner](${cleanEmbedUrl})](https://github.com/${userHandle})`;
  }, [isPortraitCover, portraitLayout, cleanEmbedUrl, userHandle]);

  const htmlSnippet = useMemo(() => {
    if (isPortraitCover && portraitLayout === "side") {
      return `<a href="https://github.com/${userHandle}">\n  <img src="${cleanEmbedUrl}" align="right" width="240" alt="Anime Programming Cover" />\n</a>`;
    }
    return `<a href="https://github.com/${userHandle}">\n  <img src="${cleanEmbedUrl}" width="100%" alt="Anime Programming Banner" />\n</a>`;
  }, [isPortraitCover, portraitLayout, cleanEmbedUrl, userHandle]);

  const isCustomizedFromDefault =
    crop !== "attention" ||
    preset !== "adaptive" ||
    ratioFilter !== "all" ||
    tint ||
    dim ||
    vignette;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
      {/* Top Header */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#232632] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6]"></span>
            <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#e8e9ed]">
              banners.carbon
            </h1>
            <span className="rounded-full bg-pink-500/10 px-2.5 py-0.5 font-mono text-[11px] text-pink-400 border border-pink-500/20">
              853 covers
            </span>
            {favorites.length > 0 && (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <Heart className="h-2.5 w-2.5 fill-rose-400" />
                {favorites.length} saved
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-[#8b90a0]">
            853 manga programming books. A fresh cover on every profile visit.
          </p>
        </div>

        {/* View Mode Navigation */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#15171e] p-1 border border-[#232632]">
          <button
            onClick={() => setViewMode("canvas")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              viewMode === "canvas"
                ? "bg-[#232632] text-[#e8e9ed] font-medium"
                : "text-[#8b90a0] hover:text-[#e8e9ed]"
            }`}
          >
            <span>Banner</span>
          </button>
          <button
            onClick={() => setViewMode("github-desktop")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              viewMode === "github-desktop"
                ? "bg-pink-500/15 text-pink-300 font-medium border border-pink-500/30"
                : "text-[#8b90a0] hover:text-[#e8e9ed]"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>GitHub Profile</span>
          </button>
          <button
            onClick={() => setViewMode("github-mobile")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              viewMode === "github-mobile"
                ? "bg-pink-500/15 text-pink-300 font-medium border border-pink-500/30"
                : "text-[#8b90a0] hover:text-[#e8e9ed]"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mobile GitHub</span>
          </button>
          <button
            onClick={() => setViewMode("catalog")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              viewMode === "catalog"
                ? "bg-[#232632] text-[#e8e9ed] font-medium"
                : "text-[#8b90a0] hover:text-[#e8e9ed]"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Catalog</span>
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      {viewMode === "catalog" ? (
        /* Fast Catalog Explorer */
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b90a0]" />
              <input
                type="text"
                placeholder="Search by topic, language, or title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCatalogPage(1);
                }}
                className="w-full rounded-xl bg-[#15171e] pl-9 pr-4 py-2 font-mono text-xs text-[#e8e9ed] border border-[#232632] focus:outline-none focus:border-pink-500/60"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => {
                  setSelectedCatalogCat("All");
                  setCatalogPage(1);
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                  selectedCatalogCat === "All"
                    ? "bg-pink-500 text-white font-medium"
                    : "bg-[#15171e] text-[#8b90a0] border border-[#232632] hover:text-[#e8e9ed]"
                }`}
              >
                All (853)
              </button>

              {/* Favorites Tab */}
              <button
                onClick={() => {
                  setSelectedCatalogCat("Favorites");
                  setCatalogPage(1);
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  selectedCatalogCat === "Favorites"
                    ? "bg-rose-500 text-white font-semibold"
                    : "bg-[#15171e] text-rose-300/80 border border-rose-500/30 hover:text-white"
                }`}
              >
                <Heart className={`h-3 w-3 ${selectedCatalogCat === "Favorites" ? "fill-white" : "fill-rose-400"}`} />
                <span>Favorites ({favorites.length})</span>
              </button>

              {allCategories.slice(0, 10).map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    setSelectedCatalogCat(cat.name);
                    setCatalogPage(1);
                  }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                    selectedCatalogCat === cat.name
                      ? "bg-pink-500 text-white font-medium"
                      : "bg-[#15171e] text-[#8b90a0] border border-[#232632] hover:text-[#e8e9ed]"
                  }`}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Filter Tabs (Wide, Square, Portrait, All) */}
          <div className="flex items-center gap-2 overflow-x-auto p-1 rounded-xl bg-[#15171e] border border-[#232632] w-fit">
            <span className="font-mono text-xs text-[#8b90a0] px-2 flex items-center gap-1 shrink-0">
              <Crop className="h-3 w-3 text-pink-400" />
              Ratio Type:
            </span>
            {(
              [
                { id: "all", label: "All Types", count: 853 },
                { id: "wide", label: "Wide Banners", count: 432 },
                { id: "square", label: "Square Covers", count: 211 },
                { id: "portrait", label: "Portrait Covers", count: 210 },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setCatalogRatio(r.id);
                  setCatalogPage(1);
                }}
                className={`whitespace-nowrap px-3 py-1 rounded-lg font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  catalogRatio === r.id
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold shadow-sm"
                    : "text-[#8b90a0] hover:text-[#e8e9ed] hover:bg-[#232632]/50"
                }`}
              >
                <span>{r.label}</span>
                <span className={`text-[10px] ${catalogRatio === r.id ? "text-white/80" : "text-[#55596b]"}`}>
                  ({r.count})
                </span>
              </button>
            ))}
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="rounded-2xl border border-[#232632] bg-[#15171e] p-12 text-center font-mono">
              <Heart className="mx-auto h-8 w-8 text-[#8b90a0] mb-2" />
              <p className="text-sm text-[#e8e9ed]">No covers match this selection.</p>
              {selectedCatalogCat === "Favorites" && (
                <p className="text-xs text-[#8b90a0] mt-1">
                  Click the heart icon on any cover to add it to your favorites list.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {paginatedCatalog.map((item) => {
                const isFav = favorites.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setPinnedId(item.id);
                      setViewMode("canvas");
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#232632] bg-[#15171e] hover:border-pink-500/50 transition-all hover:scale-[1.01]"
                  >
                    {/* Ratio Badge */}
                    <span className="absolute top-2 left-2 z-10 rounded-md bg-black/75 backdrop-blur-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#8b90a0] border border-white/10 group-hover:text-pink-300">
                      {item.orientation || "wide"}
                    </span>

                    {/* Favorite Button on Card */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      className={`absolute top-2 right-2 z-10 rounded-full p-1.5 backdrop-blur-md transition-all cursor-pointer ${
                        isFav
                          ? "bg-rose-500/90 text-white shadow-md shadow-rose-500/30"
                          : "bg-black/60 text-[#8b90a0] hover:text-white opacity-80 group-hover:opacity-100"
                      }`}
                      title={isFav ? "Remove favorite" : "Save favorite"}
                    >
                      <Heart className={`h-3 w-3 ${isFav ? "fill-white text-white" : ""}`} />
                    </button>

                    <div className="aspect-[4/3] overflow-hidden bg-black/40 flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.cdn_url}
                        alt={item.title}
                        loading="eager"
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-pink-400 font-bold">{item.category}</span>
                        <span className="font-mono text-[9px] text-[#55596b]">{item.aspect_ratio ? `${item.aspect_ratio}:1` : ""}</span>
                      </div>
                      <div className="font-mono text-xs text-[#e8e9ed] truncate">{item.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#232632] pt-4 font-mono text-xs">
            <span className="text-[#8b90a0]">
              Page {catalogPage} of {Math.max(1, totalPages)} ({filteredCatalog.length} covers)
            </span>
            <div className="flex gap-2">
              <button
                disabled={catalogPage <= 1}
                onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#232632] bg-[#15171e] px-3 py-1 text-[#e8e9ed] disabled:opacity-30 cursor-pointer"
              >
                Prev
              </button>
              <button
                disabled={catalogPage >= totalPages}
                onClick={() => setCatalogPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-[#232632] bg-[#15171e] px-3 py-1 text-[#e8e9ed] disabled:opacity-30 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Studio Stage */
        <div className="space-y-6">
          {/* GitHub Profile Search Bar: ONLY visible in Profile Preview tabs */}
          {(viewMode === "github-desktop" || viewMode === "github-mobile") && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-[#15171e] border border-[#232632] p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-pink-400" />
                <span className="font-mono text-xs text-[#e8e9ed] font-medium">Search GitHub User:</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b90a0]">@</span>
                  <input
                    type="text"
                    value={ghInput}
                    onChange={(e) => setGhInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fetchGitHubUser(ghInput);
                    }}
                    placeholder="eg - carbonthecoder"
                    className="rounded-lg bg-[#0d0e12] pl-6 pr-3 py-1 font-mono text-xs text-[#e8e9ed] border border-[#232632] focus:outline-none focus:border-pink-500/60 w-44 sm:w-52"
                  />
                </div>
                <button
                  onClick={() => fetchGitHubUser(ghInput)}
                  disabled={isFetchingGh}
                  className="rounded-lg bg-[#232632] px-3 py-1 font-mono text-xs text-[#e8e9ed] hover:bg-pink-500 hover:text-white transition-colors cursor-pointer"
                >
                  {isFetchingGh ? "..." : "Fetch"}
                </button>
                {ghUserNotFound && (
                  <span className="font-mono text-xs text-rose-400 font-semibold flex items-center gap-1 ml-1">
                    <span>⚠️</span>
                    <span>User not available</span>
                  </span>
                )}
              </div>

              {/* Theme Toggle for GitHub Mockup (Dark vs Light Mode) */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#8b90a0]">Theme:</span>
                <button
                  onClick={() => setGithubTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0d0e12] px-2.5 py-1 font-mono text-xs text-[#e8e9ed] border border-[#232632] hover:border-pink-500/40 cursor-pointer"
                >
                  {githubTheme === "dark" ? (
                    <>
                      <Moon className="h-3 w-3 text-pink-400" />
                      <span>Dark (#0d1117)</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-3 w-3 text-amber-400" />
                      <span>Light</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Viewport Stages */}
          {viewMode === "canvas" ? (
            /* Clean Adaptive Banner Canvas in Exact Aspect Ratio */
            <div className="relative overflow-hidden rounded-2xl border border-[#232632] bg-[#0d0e12] shadow-2xl p-2 sm:p-4">
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{
                  aspectRatio: `${currentAspect}`,
                  maxHeight: "560px",
                  maxWidth: currentAspect < 1.0 ? `${Math.round(560 * currentAspect)}px` : "100%",
                }}
                className="relative mx-auto w-full overflow-hidden bg-[#0d0e12] flex items-center justify-center select-none rounded-xl transition-all duration-300"
              >
                {/* Shiny Left-to-Right Shimmer Sweep while loading */}
                {isLoading && (
                  <div className="absolute inset-0 z-10 overflow-hidden bg-[#15171e]">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={activeImgSrc}
                  src={activeImgSrc}
                  alt={currentMeta.title}
                  className={`h-full w-full transition-opacity duration-200 ${
                    preset === "adaptive" || isPortraitCover
                      ? "object-contain"
                      : `object-cover ${crop === "top" ? "object-top" : "object-center"}`
                  }`}
                  onLoad={(e) => {
                    setIsLoading(false);
                    if (e.currentTarget.naturalWidth && e.currentTarget.naturalHeight) {
                      setActiveImageAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight);
                    }
                  }}
                  onError={handleImageError}
                />

                {/* Instant 120 FPS Hardware-Accelerated CSS Visual Overlays */}
                {tint && <div className="absolute inset-0 bg-[#0d0e12]/20 pointer-events-none" />}
                {dim && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                )}
                {vignette && (
                  <div className="absolute inset-0 pointer-events-none [background:radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.85)_100%)]" />
                )}

                <div className="absolute top-3 right-3 sm:hidden rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 font-mono text-[10px] text-pink-300 border border-white/10">
                  Swipe to shuffle
                </div>
              </div>

              {/* Banner Footer Info: Category, Title, Orientation & Direct Source Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#232632] bg-[#15171e] px-4 py-3 mt-2 rounded-xl">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-pink-400">{currentMeta.category}</span>
                    <span className="text-[#8b90a0]">·</span>
                    <span className="font-mono text-xs text-[#e8e9ed] font-medium truncate">{currentMeta.title}</span>
                    {currentMeta.orientation && (
                      <span className="rounded bg-[#232632] px-1.5 py-0.5 font-mono text-[10px] text-pink-300 capitalize border border-pink-500/20">
                        {currentMeta.orientation} {currentMeta.aspect ? `(${currentMeta.aspect}:1)` : ""}
                      </span>
                    )}
                  </div>
                  {currentMeta.source && (
                    <a
                      href={`https://github.com/cat-milk/Anime-Girls-Holding-Programming-Books/blob/master/${encodeURI(currentMeta.source)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-[#8b90a0] hover:text-pink-400 hover:underline flex items-center gap-1.5 truncate transition-colors"
                      title="View source image on GitHub"
                    >
                      <Github className="h-3 w-3 shrink-0" />
                      <span className="truncate">{currentMeta.source}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Favorite Button */}
                  <button
                    onClick={() => {
                      if (currentMeta.id) toggleFavorite(currentMeta.id);
                    }}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs border transition-colors cursor-pointer ${
                      favorites.includes(currentMeta.id)
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-[#0d0e12] text-[#8b90a0] border-[#232632] hover:text-[#e8e9ed]"
                    }`}
                    title={favorites.includes(currentMeta.id) ? "Remove from Favorites" : "Save to Favorites"}
                  >
                    <Heart className={`h-3 w-3 ${favorites.includes(currentMeta.id) ? "fill-rose-400 text-rose-400" : ""}`} />
                    <span>{favorites.includes(currentMeta.id) ? "Saved" : "Fav"}</span>
                  </button>

                  {/* Pin Button */}
                  <button
                    onClick={() => {
                      if (pinnedId) {
                        setPinnedId(null);
                      } else if (currentMeta.id) {
                        setPinnedId(currentMeta.id);
                      }
                    }}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs border transition-colors cursor-pointer ${
                      pinnedId
                        ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                        : "bg-[#0d0e12] text-[#8b90a0] border-[#232632] hover:text-[#e8e9ed]"
                    }`}
                    title="Lock this cover so it stays permanently rather than rotating"
                  >
                    <Pin className={`h-3 w-3 ${pinnedId ? "rotate-45 text-pink-400" : ""}`} />
                    <span>{pinnedId ? "Pinned" : "Pin"}</span>
                  </button>

                  <a
                    href={bannerApiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-[#0d0e12] px-2.5 py-1 font-mono text-xs text-[#8b90a0] border border-[#232632] hover:text-[#e8e9ed]"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="hidden sm:inline">Open</span>
                  </a>
                </div>
              </div>
            </div>
          ) : viewMode === "github-desktop" ? (
            /* Real GitHub Desktop Profile Mockup */
            <div
              className={`rounded-2xl border transition-colors font-sans overflow-hidden shadow-2xl ${
                githubTheme === "dark"
                  ? "border-[#30363d] bg-[#0d1117] text-[#f0f6fc]"
                  : "border-[#d0d7de] bg-[#ffffff] text-[#1f2328]"
              }`}
            >
              {/* GitHub Top Nav Bar */}
              <div
                className={`border-b px-4 py-3 flex items-center justify-between text-xs ${
                  githubTheme === "dark" ? "border-[#30363d] bg-[#161b22]" : "border-[#d0d7de] bg-[#f6f8fa]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5" />
                  <span className="font-semibold">{ghProfile.login}</span>
                </div>
                <div className="flex items-center gap-4 text-[#8d96a0] font-medium hidden sm:flex">
                  <span className="border-b-2 border-[#f78166] pb-1 font-semibold flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Overview
                  </span>
                  <span>Repositories ({ghProfile.public_repos})</span>
                  <span>Projects</span>
                  <span>Packages</span>
                  <span>Stars</span>
                </div>
              </div>

              {/* Profile Grid: Left User Rail + Right README Box */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ghProfile.avatar_url}
                    alt={ghProfile.login}
                    className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border border-zinc-700/40 object-cover shadow-md mb-3"
                  />
                  <h2 className="text-xl font-bold leading-tight">{ghProfile.name}</h2>
                  <div className="text-sm font-light text-[#8d96a0] mb-3">@{ghProfile.login}</div>
                  <p className="text-xs mb-4 leading-relaxed max-w-xs">{ghProfile.bio}</p>

                  <div className="w-full flex items-center justify-center md:justify-start gap-3 text-xs text-[#8d96a0] border-t border-zinc-700/20 pt-3">
                    <span>
                      <strong>{ghProfile.followers}</strong> followers
                    </span>
                    <span>·</span>
                    <span>
                      <strong>{ghProfile.following}</strong> following
                    </span>
                  </div>
                </div>

                <div className="md:col-span-8">
                  <div
                    className={`rounded-lg border overflow-hidden ${
                      githubTheme === "dark"
                        ? "border-[#30363d] bg-[#0d1117]"
                        : "border-[#d0d7de] bg-[#ffffff]"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between border-b px-4 py-2 text-xs ${
                        githubTheme === "dark"
                          ? "border-[#30363d] bg-[#161b22] text-[#8d96a0]"
                          : "border-[#d0d7de] bg-[#f6f8fa] text-[#656d76]"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <BookOpen className="h-3.5 w-3.5 text-pink-400" />
                        <span>{ghProfile.login} / README.md</span>
                      </div>
                      <div className="rounded border border-zinc-700/30 px-2 py-0.5 text-[11px]">
                        Real Profile
                      </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4">
                      {/* Notice if user is not available or does NOT have a profile README */}
                      {ghUserNotFound ? (
                        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 space-y-1 font-mono">
                          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                            <span>⚠️</span>
                            <span>User not available: @{ghProfile.login}</span>
                          </div>
                          <p className="text-[11px] text-[#8b90a0]">
                            This username could not be found on GitHub. Check the spelling or enter another handle.
                          </p>
                        </div>
                      ) : !realReadme && (
                        <div className="rounded-xl border border-dashed border-[#30363d] bg-black/30 p-3.5 space-y-2.5 font-mono">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 text-sm">⚠️</span>
                              <span className="text-xs text-[#e8e9ed] font-medium">
                                @{ghProfile.login} doesn&apos;t have a profile README.md yet.
                              </span>
                            </div>
                            <a
                              href={`https://github.com/new?name=${encodeURIComponent(ghProfile.login)}&public=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-lg bg-pink-500/15 text-pink-300 border border-pink-500/30 px-2.5 py-1 text-[11px] hover:bg-pink-500 hover:text-white transition-colors"
                            >
                              <span>Create @{ghProfile.login} Repo</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>

                          <details className="group text-xs text-[#8b90a0] cursor-pointer">
                            <summary className="flex items-center gap-1.5 text-pink-400 hover:underline select-none">
                              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                              <span>Click to expand setup procedure (3 simple steps)</span>
                            </summary>
                            <div className="mt-2.5 pl-3 border-l-2 border-pink-500/40 space-y-1.5 text-[11px] text-[#8b90a0] font-sans">
                              <p>
                                <strong className="text-white font-mono">1. Create Repo:</strong> Go to GitHub and create a public repository named exactly <code className="text-pink-300 font-mono">{ghProfile.login}</code>.
                              </p>
                              <p>
                                <strong className="text-white font-mono">2. Initialize README:</strong> Check &quot;Add a README file&quot; and click &quot;Create repository&quot;.
                              </p>
                              <p>
                                <strong className="text-white font-mono">3. Add Anime Banner:</strong> Paste the snippet below into line 1 of your <code className="text-pink-300 font-mono">README.md</code>, commit, and your banner will be live!
                              </p>
                            </div>
                          </details>
                        </div>
                      )}

                      {/* Approach A: Side-Floated Layout for Portrait Covers */}
                      {isPortraitCover && portraitLayout === "side" ? (
                        <div className="overflow-hidden">
                          {/* Floated right character cover */}
                          <div className="float-right ml-4 mb-4 rounded-xl border border-zinc-700/40 overflow-hidden shadow-lg bg-black/30 w-44 sm:w-52">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              key={`desktop-${activeImgSrc}`}
                              src={activeImgSrc}
                              alt="Anime Cover"
                              className="w-full h-auto object-contain"
                              onError={handleImageError}
                            />
                            <div className="p-2 bg-black/60 border-t border-zinc-800 text-[10px] text-zinc-400 font-mono truncate">
                              {currentMeta.title}
                            </div>
                          </div>

                          {/* Profile Content flowing alongside the floated cover */}
                          {renderedReadmeHtml && (
                            <div
                              className={`github-readme-body ${
                                githubTheme === "dark" ? "text-[#e6edf3]" : "text-[#1f2328]"
                              }`}
                              dangerouslySetInnerHTML={{ __html: renderedReadmeHtml }}
                            />
                          )}
                        </div>
                      ) : (
                        /* Top Full-Width Banner Layout for Wide or Centered */
                        <>
                          <div className="overflow-hidden rounded-md border border-zinc-700/40 shadow-sm flex items-center justify-center bg-black/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              key={`desktop-${activeImgSrc}`}
                              src={activeImgSrc}
                              alt="Anime Banner"
                              className="w-full h-auto max-h-[440px] object-contain"
                              onError={handleImageError}
                            />
                          </div>

                          {/* Real User's Profile README Content */}
                          {renderedReadmeHtml && (
                            <div
                              className={`github-readme-body border-t pt-4 ${
                                githubTheme === "dark" ? "border-[#30363d] text-[#e6edf3]" : "border-[#d0d7de] text-[#1f2328]"
                              }`}
                              dangerouslySetInnerHTML={{ __html: renderedReadmeHtml }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Real GitHub Mobile Mockup */
            <div
              className={`mx-auto max-w-sm rounded-3xl border-4 font-sans overflow-hidden shadow-2xl ${
                githubTheme === "dark"
                  ? "border-[#30363d] bg-[#0d1117] text-[#f0f6fc]"
                  : "border-[#d0d7de] bg-[#ffffff] text-[#1f2328]"
              }`}
            >
              <div
                className={`px-4 py-2 border-b flex items-center justify-between text-[11px] ${
                  githubTheme === "dark"
                    ? "bg-[#161b22] border-[#30363d] text-[#8d96a0]"
                    : "bg-[#f6f8fa] border-[#d0d7de] text-[#656d76]"
                }`}
              >
                <Github className="h-4 w-4" />
                <span className="font-mono font-bold">github.com/{ghProfile.login}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ghProfile.avatar_url}
                    alt={ghProfile.login}
                    className="h-14 w-14 rounded-full border border-zinc-700/40 object-cover"
                  />
                  <div>
                    <h2 className="text-base font-bold leading-tight">{ghProfile.name}</h2>
                    <div className="text-xs text-[#8d96a0]">@{ghProfile.login}</div>
                  </div>
                </div>

                <p className="text-xs leading-tight opacity-90">{ghProfile.bio}</p>

                <div
                  className={`rounded-lg border overflow-hidden mt-3 ${
                    githubTheme === "dark" ? "border-[#30363d] bg-[#0d1117]" : "border-[#d0d7de] bg-[#ffffff]"
                  }`}
                >
                  <div
                    className={`border-b px-3 py-1.5 flex items-center justify-between text-[11px] ${
                      githubTheme === "dark"
                        ? "border-[#30363d] bg-[#161b22] text-[#8d96a0]"
                        : "border-[#d0d7de] bg-[#f6f8fa] text-[#656d76]"
                    }`}
                  >
                    <span className="font-mono">{ghProfile.login} / README.md</span>
                    <BookOpen className="h-3 w-3 text-pink-400" />
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Notice if user is not available or has no profile README */}
                    {ghUserNotFound ? (
                      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 font-mono text-[10px] text-rose-400 font-medium flex items-center gap-1">
                        <span>⚠️</span>
                        <span>User not available: @{ghProfile.login}</span>
                      </div>
                    ) : !realReadme && (
                      <div className="rounded-lg border border-dashed border-[#30363d] bg-black/40 p-2.5 space-y-1.5 font-mono text-[10px]">
                        <div className="text-amber-400 font-medium flex items-center gap-1">
                          <span>⚠️</span>
                          <span>@{ghProfile.login} has no README.md</span>
                        </div>
                        <details className="text-[10px] text-[#8b90a0]">
                          <summary className="text-pink-400 cursor-pointer">How to create (3 steps)</summary>
                          <p className="mt-1 pl-2 border-l border-pink-500/40 text-[9px] leading-tight text-[#8b90a0]">
                            Create public repo <code className="text-pink-300">{ghProfile.login}</code> with README.md and paste snippet!
                          </p>
                        </details>
                      </div>
                    )}

                    <div className="overflow-hidden rounded-md border border-zinc-700/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={`mobile-${activeImgSrc}`}
                        src={activeImgSrc}
                        alt="Anime Banner"
                        className="w-full h-auto object-contain"
                        onError={handleImageError}
                      />
                    </div>
                    {renderedReadmeHtml && (
                      <div
                        className={`github-readme-body text-[11px] border-t pt-3 ${
                          githubTheme === "dark" ? "border-[#30363d] text-[#e6edf3]" : "border-[#d0d7de] text-[#1f2328]"
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderedReadmeHtml }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Control Bar: Reroll, Aspect Ratio Filter, Presets & Copy */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#15171e] border border-[#232632] p-3 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={reroll}
                className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 font-mono text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:bg-pink-600 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Reroll Banner</span>
              </button>

              {/* Aspect Ratio Filter (Wide, Square, Portrait, All) */}
              <div className="flex items-center gap-1 rounded-xl bg-[#0d0e12] p-1 border border-[#232632]">
                <span className="font-mono text-[11px] text-[#8b90a0] px-2 hidden sm:inline">Ratio:</span>
                {(
                  [
                    { id: "all", label: "All", count: 853 },
                    { id: "wide", label: "Wide", count: 432 },
                    { id: "square", label: "Square", count: 211 },
                    { id: "portrait", label: "Portrait", count: 210 },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRatioFilter(r.id);
                      setPinnedId(null);
                      setActiveImageAspect(null);
                      setSeed(Math.floor(Math.random() * 1000000));
                    }}
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                      ratioFilter === r.id
                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-sm"
                        : "text-[#8b90a0] hover:text-[#e8e9ed]"
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className={`text-[10px] ${ratioFilter === r.id ? "text-white/80" : "text-[#55596b]"}`}>
                      ({r.count})
                    </span>
                  </button>
                ))}
              </div>

              {/* Presets List */}
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#0d0e12] p-1 border border-[#232632]">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPreset(p.id);
                      if (p.id !== "custom" && p.id !== "adaptive") {
                        setCustomW(p.width);
                        setCustomH(p.height);
                      }
                    }}
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer ${
                      preset === p.id
                        ? "bg-[#232632] text-[#e8e9ed] font-medium"
                        : "text-[#8b90a0] hover:text-[#e8e9ed]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls: Dimensions, Crop & Multi-Language Rotation Pool */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Custom Dimensions & Attention Crop (Col 5) */}
            <div className="md:col-span-5 rounded-2xl border border-[#232632] bg-[#15171e] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#e8e9ed]">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-pink-400" />
                  <span>Custom Dimensions</span>
                </div>
                <div className="flex items-center gap-2">
                  {preset === "custom" ? (
                    <span className="rounded bg-pink-500/20 px-1.5 py-0.5 font-mono text-[10px] text-pink-300 border border-pink-500/40">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => setPreset("custom")}
                      className="font-mono text-[10px] text-[#8b90a0] hover:text-pink-400 transition-colors cursor-pointer"
                    >
                      Use Custom
                    </button>
                  )}
                  <span className="font-mono text-[11px] text-[#8b90a0]">
                    {customW} × {customH}
                  </span>
                </div>
              </div>

              {/* W & H Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className={`flex items-center gap-2 rounded-xl bg-[#0d0e12] px-3 py-2 border transition-colors ${
                  preset === "custom" ? "border-pink-500/50" : "border-[#232632]"
                }`}>
                  <span className="font-mono text-xs text-[#8b90a0]">W:</span>
                  <input
                    type="number"
                    min="200"
                    max="3840"
                    value={customW}
                    onChange={(e) => {
                      setCustomW(parseInt(e.target.value, 10) || 1920);
                      setPreset("custom");
                    }}
                    className="w-full bg-transparent font-mono text-xs text-[#e8e9ed] focus:outline-none"
                  />
                  <span className="font-mono text-[10px] text-[#8b90a0]">px</span>
                </div>

                <div className={`flex items-center gap-2 rounded-xl bg-[#0d0e12] px-3 py-2 border transition-colors ${
                  preset === "custom" ? "border-pink-500/50" : "border-[#232632]"
                }`}>
                  <span className="font-mono text-xs text-[#8b90a0]">H:</span>
                  <input
                    type="number"
                    min="100"
                    max="2160"
                    value={customH}
                    onChange={(e) => {
                      setCustomH(parseInt(e.target.value, 10) || 1080);
                      setPreset("custom");
                    }}
                    className="w-full bg-transparent font-mono text-xs text-[#e8e9ed] focus:outline-none"
                  />
                  <span className="font-mono text-[10px] text-[#8b90a0]">px</span>
                </div>
              </div>

              {/* Attention Crop Selector with Working Reset-to-Default */}
              <div className="rounded-xl bg-[#0d0e12] p-2.5 border border-[#232632] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#e8e9ed] font-medium">Attention Crop:</span>
                  <button
                    onClick={resetAllToDefault}
                    className="flex items-center gap-1 font-mono text-[10px] text-pink-400 hover:underline cursor-pointer"
                    title="Reset crop, ratio and dimensions to natural original proportions"
                  >
                    <Undo2 className="h-2.5 w-2.5" />
                    <span>Reset to default</span>
                  </button>
                </div>

                <div className="flex gap-1">
                  {(["attention", "entropy", "center", "top"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCrop(c)}
                      className={`flex-1 rounded py-1 font-mono text-[11px] transition-colors cursor-pointer text-center ${
                        crop === c
                          ? "bg-pink-500 text-white font-bold shadow-sm"
                          : "bg-[#15171e] text-[#8b90a0] hover:text-[#e8e9ed]"
                      }`}
                    >
                      {c === "attention" ? "attention (def)" : c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlays: Cozy Tint & Vignette */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#232632]">
                <label className="flex items-center justify-between rounded-xl bg-[#0d0e12] p-2.5 border border-[#232632] cursor-pointer">
                  <span className="font-mono text-xs text-[#e8e9ed]">Dark Tint</span>
                  <input
                    type="checkbox"
                    checked={tint}
                    onChange={(e) => setTint(e.target.checked)}
                    className="h-4 w-4 rounded accent-pink-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl bg-[#0d0e12] p-2.5 border border-[#232632] cursor-pointer">
                  <span className="font-mono text-xs text-[#e8e9ed]">Vignette</span>
                  <input
                    type="checkbox"
                    checked={vignette}
                    onChange={(e) => setVignette(e.target.checked)}
                    className="h-4 w-4 rounded accent-pink-500"
                  />
                </label>
              </div>
            </div>

            {/* Rotation Pool & Auto-Detect Stack (Col 7) */}
            <div className="md:col-span-7 rounded-2xl border border-[#232632] bg-[#15171e] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#e8e9ed]">
                  <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                  <span>Rotation Pool (Multi-Select)</span>
                </div>
                {selectedPool.length > 0 && (
                  <button
                    onClick={() => setSelectedPool([])}
                    className="font-mono text-[11px] text-pink-400 hover:underline cursor-pointer"
                  >
                    Clear pool ({selectedPool.length})
                  </button>
                )}
              </div>

              {/* Enter GitHub username to get stack input (Image 3) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl bg-[#0d0e12] p-2.5 border border-[#232632]">
                <div className="flex items-center gap-2 flex-1">
                  <Github className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                  <span className="font-mono text-xs text-[#8b90a0]">@</span>
                  <input
                    type="text"
                    placeholder="eg - carbonthecoder"
                    value={ghInput}
                    onChange={(e) => setGhInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fetchGitHubUser(ghInput);
                    }}
                    className="w-full bg-transparent font-mono text-xs text-[#e8e9ed] focus:outline-none placeholder:text-[#555a68]"
                  />
                </div>
                <button
                  onClick={() => fetchGitHubUser(ghInput)}
                  disabled={isFetchingGh}
                  className="rounded-lg bg-[#232632] hover:bg-pink-500 hover:text-white px-3 py-1 font-mono text-xs text-[#e8e9ed] transition-colors cursor-pointer shrink-0"
                >
                  {isFetchingGh ? "Detecting..." : "Get Stack"}
                </button>
              </div>

              {/* Auto-detected badge info with apply button */}
              {autoDetectedLangs.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-pink-500/10 border border-pink-500/25 p-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-pink-300">
                    <Cpu className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                    <span>
                      Detected stack: <strong className="text-white">{autoDetectedLangs.join(", ")}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPool(autoDetectedLangs)}
                    className="rounded-lg bg-pink-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-pink-600 transition-colors cursor-pointer"
                  >
                    Apply Stack to Pool
                  </button>
                </div>
              )}

              <p className="font-mono text-[11px] text-[#8b90a0]">
                Choose languages for your pool. If none selected, rolls across all 853 covers.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {POPULAR_TOPICS.map((topic) => {
                  const isActive = selectedPool.includes(topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopicInPool(topic)}
                      className={`rounded-lg px-2.5 py-1 font-mono text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-pink-500 text-white font-semibold"
                          : "bg-[#0d0e12] text-[#8b90a0] border border-[#232632] hover:text-[#e8e9ed]"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Setup Guide (Clean, Short link, and roll my favs snippet option) */}
          <div className="rounded-2xl border border-[#232632] bg-[#15171e] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232632] pb-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-[#e8e9ed]">How to add to your GitHub Profile</h3>
                <p className="font-mono text-xs text-[#8b90a0] mt-0.5">
                  Paste this snippet at line 1 in your profile repository <code className="text-pink-300">README.md</code>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isPortraitCover && (
                  <div className="flex items-center gap-1 rounded-lg bg-[#0d0e12] p-1 border border-[#232632]">
                    <span className="font-mono text-[10px] text-[#8b90a0] px-1.5 hidden sm:inline">Layout:</span>
                    <button
                      onClick={() => setPortraitLayout("side")}
                      className={`px-2 py-1 rounded font-mono text-[11px] transition-colors cursor-pointer ${
                        portraitLayout === "side"
                          ? "bg-pink-500 text-white font-semibold"
                          : "text-[#8b90a0] hover:text-[#e8e9ed]"
                      }`}
                      title="Floats the cover on the right side of your README intro text"
                    >
                      Side Card (align=&quot;right&quot;)
                    </button>
                    <button
                      onClick={() => setPortraitLayout("top")}
                      className={`px-2 py-1 rounded font-mono text-[11px] transition-colors cursor-pointer ${
                        portraitLayout === "top"
                          ? "bg-pink-500 text-white font-semibold"
                          : "text-[#8b90a0] hover:text-[#e8e9ed]"
                      }`}
                      title="Top banner"
                    >
                      Top
                    </button>
                  </div>
                )}

                {favorites.length > 0 && (
                  <label className="flex items-center gap-1.5 rounded-lg bg-[#0d0e12] px-2.5 py-1.5 font-mono text-xs border border-rose-500/30 text-rose-300 cursor-pointer hover:border-rose-500/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={rollFavsInSnippet}
                      onChange={(e) => setRollFavsInSnippet(e.target.checked)}
                      className="accent-rose-500 h-3.5 w-3.5 rounded"
                    />
                    <Heart className="h-3 w-3 fill-rose-400" />
                    <span>Roll My Favs ({favorites.length})</span>
                  </label>
                )}

                <button
                  onClick={() => copyToClipboard(markdownSnippet, "markdown")}
                  className="rounded-lg bg-pink-500 px-3 py-1.5 font-mono text-xs font-bold text-white hover:bg-pink-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {copiedFormat === "markdown" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedFormat === "markdown" ? "Copied Markdown!" : "Copy Markdown"}</span>
                </button>
                <button
                  onClick={() => copyToClipboard(htmlSnippet, "html")}
                  className="rounded-lg bg-[#232632] px-3 py-1.5 font-mono text-xs text-[#e8e9ed] hover:bg-[#2d3142] transition-colors cursor-pointer"
                >
                  {copiedFormat === "html" ? "Copied HTML!" : "HTML"}
                </button>
              </div>
            </div>

            <div className="relative rounded-xl bg-[#0d0e12] p-3.5 border border-[#232632]">
              <pre className="font-mono text-xs text-[#e8e9ed] overflow-x-auto whitespace-pre-wrap break-all">
                {markdownSnippet}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between font-mono text-xs text-[#8b90a0] pt-1">
              <div className="truncate">
                Raw Endpoint: <span className="text-pink-300 select-all">{cleanEmbedUrl}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={copyShareableLink}
                  className="text-pink-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Share2 className="h-3 w-3" />
                  <span>{copiedFormat === "share" ? "Copied Studio Link!" : "Share Studio Link"}</span>
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  onClick={() => copyToClipboard(cleanEmbedUrl, "raw")}
                  className="text-pink-400 hover:underline cursor-pointer"
                >
                  {copiedFormat === "raw" ? "Copied URL!" : "Copy Raw Image URL"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-[#232632] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-[#8b90a0]">
        <div>
          <span>dataset: </span>
          <a
            href="https://github.com/cat-milk/Anime-Girls-Holding-Programming-Books"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:underline"
          >
            cat-milk/Anime-Girls-Holding-Programming-Books
          </a>
        </div>
        <div className="text-[#555a68]">
          MIT License · 853 covers
        </div>
      </footer>
    </div>
  );
}
