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
  { id: "github-compact", label: "GitHub Compact", width: 1200, height: 400, ratio: "3:1" },
  { id: "twitter", label: "Twitter / X", width: 1500, height: 500, ratio: "3:1" },
  { id: "discord", label: "Discord Profile", width: 680, height: 240, ratio: "2.83:1" },
  { id: "discord-server", label: "Discord Server", width: 960, height: 540, ratio: "16:9" },
  { id: "custom", label: "Custom Size", width: 1600, height: 800, ratio: "Custom" },
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
  // Preset & Dimensions
  const [preset, setPreset] = useState("github");
  const [customW, setCustomW] = useState(1844);
  const [customH, setCustomH] = useState(999);
  const [crop, setCrop] = useState<"attention" | "center" | "entropy" | "top">("attention");

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
  const [ghInput, setGhInput] = useState("carbonthecoder");
  const [ghProfile, setGhProfile] = useState<GitHubProfile>({
    login: "carbonthecoder",
    name: "Carbon",
    avatar_url: "https://avatars.githubusercontent.com/carbonthecoder",
    bio: "10000 | obsessed with building things from scratch.",
    followers: 128,
    following: 42,
    public_repos: 18,
  });
  const [realReadme, setRealReadme] = useState<string>("");
  const [isFetchingGh, setIsFetchingGh] = useState(false);
  const [autoDetectedLangs, setAutoDetectedLangs] = useState<string[]>([]);

  // Active banner metadata
  const [currentMeta, setCurrentMeta] = useState<{
    id: string;
    category: string;
    title: string;
    source: string;
  }>({
    id: "rust-shikanoko-the-rust-programming-language",
    category: "Rust",
    title: "Shikanoko The Rust Programming Language",
    source: "Rust/Shikanoko-The-Rust-Programming-Language.png",
  });

  // Catalog State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatalogCat, setSelectedCatalogCat] = useState("All");
  const [catalogPage, setCatalogPage] = useState(1);
  const itemsPerPage = 16;

  // Touch Swipe
  const touchStartX = useRef<number | null>(null);

  // Manifest Data
  const allItems: BannerItem[] = useMemo(() => manifestData.items as BannerItem[], []);
  const allCategories: Category[] = useMemo(() => manifestData.categories as Category[], []);

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
  }, [preset, customW, customH, pinnedId, selectedPool, crop, tint, vignette]);

  // Fetch real GitHub Profile and actual README
  const fetchGitHubUser = useCallback(async (username: string) => {
    const cleanUser = username.trim().replace(/^@/, "");
    if (!cleanUser) return;
    setIsFetchingGh(true);
    setRealReadme("");
    setAutoDetectedLangs([]);

    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`);
      if (res.ok) {
        const data = await res.json();
        setGhProfile({
          login: data.login,
          name: data.name || data.login,
          avatar_url: data.avatar_url || `https://avatars.githubusercontent.com/${cleanUser}`,
          bio: data.bio || "Developer building things on GitHub.",
          followers: data.followers || 0,
          following: data.following || 0,
          public_repos: data.public_repos || 0,
        });
      } else {
        setGhProfile({
          login: cleanUser,
          name: cleanUser,
          avatar_url: `https://avatars.githubusercontent.com/${cleanUser}`,
          bio: "Developer on GitHub.",
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
      setGhProfile((prev) => ({
        ...prev,
        login: cleanUser,
        name: cleanUser,
        avatar_url: `https://avatars.githubusercontent.com/${cleanUser}`,
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

  // Fetch initial profile README on load
  useEffect(() => {
    fetchGitHubUser("carbonthecoder");
  }, [fetchGitHubUser]);

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
    }

    if (crop !== "attention") {
      params.set("crop", crop);
    }

    if (tint) params.set("tint", "true");
    if (dim) params.set("dim", "true");
    if (vignette) params.set("vignette", "true");

    const qs = params.toString();
    return `/api/banner${qs ? `?${qs}` : ""}`;
  }, [preset, customW, customH, pinnedId, seed, selectedPool, crop, tint, dim, vignette]);

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
    }

    if (crop !== "attention") {
      params.set("crop", crop);
    }

    if (tint) params.set("tint", "true");
    if (dim) params.set("dim", "true");
    if (vignette) params.set("vignette", "true");

    const qs = params.toString();
    return `${origin}/api/banner${qs ? `?${qs}` : ""}`;
  }, [preset, customW, customH, pinnedId, rollFavsInSnippet, favorites, selectedPool, crop, tint, dim, vignette]);

  // Sync metadata from response headers
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    fetch(bannerApiUrl, { method: "HEAD" })
      .then((res) => {
        if (!isCancelled && res.ok) {
          const id = res.headers.get("x-banner-id") || "";
          const cat = res.headers.get("x-banner-category") || "General";
          const title = decodeURIComponent(res.headers.get("x-banner-title") || "");
          const source = res.headers.get("x-banner-source") || "";

          setCurrentMeta({ id, category: cat, title, source });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [bannerApiUrl]);

  const reroll = useCallback(() => {
    setPinnedId(null);
    setSeed(Math.floor(Math.random() * 1000000));
  }, []);

  const resetAllToDefault = useCallback(() => {
    setCrop("attention");
    setPreset("github");
    setCustomW(1844);
    setCustomH(999);
    setTint(false);
    setDim(false);
    setVignette(false);
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

  // Touch swipes
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 45) {
      reroll();
    }
    touchStartX.current = null;
  };

  // Catalog filtering
  const filteredCatalog = useMemo(() => {
    return allItems.filter((item) => {
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
      return matchCat && matchQuery;
    });
  }, [allItems, selectedCatalogCat, searchQuery, favorites]);

  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage);
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * itemsPerPage;
    return filteredCatalog.slice(start, start + itemsPerPage);
  }, [filteredCatalog, catalogPage]);

  // Exact Aspect Ratio matching active preset dimensions
  const activeAspectRatio = useMemo(() => {
    return `${customW} / ${customH}`;
  }, [customW, customH]);

  // Clean Markdown & HTML Snippets
  const userHandle = ghProfile.login || "carbonthecoder";
  const markdownSnippet = `[![Banner](${cleanEmbedUrl})](https://github.com/${userHandle})`;
  const htmlSnippet = `<a href="https://github.com/${userHandle}">\n  <img src="${cleanEmbedUrl}" width="100%" alt="Anime Programming Banner" />\n</a>`;

  const isCustomizedFromDefault =
    crop !== "attention" ||
    preset !== "github" ||
    customW !== 1844 ||
    customH !== 999 ||
    tint ||
    dim ||
    vignette;

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-4 sm:py-6"
      style={{ zoom: "0.82" }}
    >
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
        <section className="space-y-6">
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

                    <div className="aspect-[16/10] overflow-hidden bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.cdn_url}
                        alt={item.title}
                        loading="eager"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-2.5">
                      <div className="font-mono text-[10px] text-pink-400 font-bold">{item.category}</div>
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
                    placeholder="username"
                    className="rounded-lg bg-[#0d0e12] pl-6 pr-3 py-1 font-mono text-xs text-[#e8e9ed] border border-[#232632] focus:outline-none focus:border-pink-500/60 w-36 sm:w-44"
                  />
                </div>
                <button
                  onClick={() => fetchGitHubUser(ghInput)}
                  disabled={isFetchingGh}
                  className="rounded-lg bg-[#232632] px-3 py-1 font-mono text-xs text-[#e8e9ed] hover:bg-pink-500 hover:text-white transition-colors cursor-pointer"
                >
                  {isFetchingGh ? "..." : "Fetch"}
                </button>
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
            /* Clean Full-Bleed Banner Canvas in Exact Aspect Ratio */
            <div className="relative overflow-hidden rounded-2xl border border-[#232632] bg-[#0d0e12] shadow-2xl">
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ aspectRatio: activeAspectRatio }}
                className="relative w-full overflow-hidden bg-[#0d0e12] flex items-center justify-center select-none"
              >
                {/* Shiny Left-to-Right Shimmer Sweep while loading */}
                {isLoading && (
                  <div className="absolute inset-0 z-10 overflow-hidden bg-[#15171e]">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={bannerApiUrl}
                  src={bannerApiUrl}
                  alt={currentMeta.title}
                  className="h-full w-full object-cover transition-opacity duration-200"
                  onLoad={() => setIsLoading(false)}
                />

                <div className="absolute top-3 right-3 sm:hidden rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 font-mono text-[10px] text-pink-300 border border-white/10">
                  Swipe to shuffle
                </div>
              </div>

              {/* Banner Footer Info: Category, Title & Direct Source Link (Image 5) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#232632] bg-[#15171e] px-4 py-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-pink-400">{currentMeta.category}</span>
                    <span className="text-[#8b90a0]">·</span>
                    <span className="font-mono text-xs text-[#e8e9ed] font-medium truncate">{currentMeta.title}</span>
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
                    <Pin className="h-3 w-3" />
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
                      {/* Live Banner at the top of the README */}
                      <div className="overflow-hidden rounded-md border border-zinc-700/40 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          key={`desktop-${bannerApiUrl}`}
                          src={bannerApiUrl}
                          alt="Anime Banner"
                          className="w-full h-auto object-cover"
                        />
                      </div>

                      {/* Real User's Profile README Content */}
                      {renderedReadmeHtml ? (
                        <div
                          className={`github-readme-body border-t pt-4 ${
                            githubTheme === "dark" ? "border-[#30363d] text-[#e6edf3]" : "border-[#d0d7de] text-[#1f2328]"
                          }`}
                          dangerouslySetInnerHTML={{ __html: renderedReadmeHtml }}
                        />
                      ) : (
                        <div className="border-t border-zinc-700/20 pt-4 space-y-2">
                          <h3 className="text-base font-semibold">Hi, I&apos;m {ghProfile.name} 👋</h3>
                          <p className="text-xs text-[#8d96a0]">
                            Welcome to my profile. This banner updates with fresh covers from{" "}
                            <span className="text-pink-400 font-mono">Anime-Girls-Holding-Programming-Books</span>.
                          </p>
                        </div>
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
                    <div className="overflow-hidden rounded-md border border-zinc-700/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={`mobile-${bannerApiUrl}`}
                        src={bannerApiUrl}
                        alt="Anime Banner"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    {renderedReadmeHtml ? (
                      <div
                        className={`github-readme-body text-[11px] border-t pt-3 ${
                          githubTheme === "dark" ? "border-[#30363d] text-[#e6edf3]" : "border-[#d0d7de] text-[#1f2328]"
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderedReadmeHtml }}
                      />
                    ) : (
                      <div className="space-y-1 border-t border-zinc-700/20 pt-3">
                        <div className="text-xs font-semibold">Hi, I&apos;m {ghProfile.name} 👋</div>
                        <div className="text-[11px] text-[#8d96a0]">Real README preview for mobile visitors.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#15171e] border border-[#232632] p-3 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={reroll}
                className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 font-mono text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:bg-pink-600 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Reroll Banner</span>
              </button>

              {/* Presets List */}
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#0d0e12] p-1 border border-[#232632]">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPreset(p.id);
                      if (p.id !== "custom") {
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

            <div className="flex items-center gap-2">
              <button
                onClick={copyShareableLink}
                className="flex items-center gap-1.5 rounded-xl bg-[#0d0e12] border border-[#232632] px-3 py-2 font-mono text-xs text-[#e8e9ed] hover:border-pink-500/50 transition-colors cursor-pointer"
                title="Copy shareable link with current filters"
              >
                {copiedFormat === "share" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5 text-pink-400" />}
                <span>{copiedFormat === "share" ? "Link Copied!" : "Share Link"}</span>
              </button>

              <button
                onClick={() => copyToClipboard(markdownSnippet, "markdown")}
                className="flex items-center gap-1.5 rounded-xl bg-pink-500 px-3.5 py-2 font-mono text-xs font-bold text-white hover:bg-pink-600 transition-colors cursor-pointer shadow-sm"
              >
                {copiedFormat === "markdown" ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedFormat === "markdown" ? "Copied!" : "Copy Markdown"}</span>
              </button>
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
                <span className="font-mono text-[11px] text-[#8b90a0]">
                  {customW} × {customH}
                </span>
              </div>

              {/* W & H Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-[#0d0e12] px-3 py-2 border border-[#232632]">
                  <span className="font-mono text-xs text-[#8b90a0]">W:</span>
                  <input
                    type="number"
                    min="200"
                    max="3840"
                    value={customW}
                    onChange={(e) => {
                      setCustomW(parseInt(e.target.value, 10) || 1844);
                      setPreset("custom");
                    }}
                    className="w-full bg-transparent font-mono text-xs text-[#e8e9ed] focus:outline-none"
                  />
                  <span className="font-mono text-[10px] text-[#8b90a0]">px</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-[#0d0e12] px-3 py-2 border border-[#232632]">
                  <span className="font-mono text-xs text-[#8b90a0]">H:</span>
                  <input
                    type="number"
                    min="100"
                    max="2160"
                    value={customH}
                    onChange={(e) => {
                      setCustomH(parseInt(e.target.value, 10) || 999);
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
                  {isCustomizedFromDefault && (
                    <button
                      onClick={resetAllToDefault}
                      className="flex items-center gap-1 font-mono text-[10px] text-pink-400 hover:underline cursor-pointer"
                      title="Reset crop and dimensions to default GitHub banner"
                    >
                      <Undo2 className="h-2.5 w-2.5" />
                      <span>Reset to default</span>
                    </button>
                  )}
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
                    placeholder="Enter GitHub username to get your stack..."
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
              <button
                onClick={() => copyToClipboard(cleanEmbedUrl, "raw")}
                className="text-pink-400 hover:underline text-left sm:text-right cursor-pointer shrink-0"
              >
                {copiedFormat === "raw" ? "Copied URL!" : "Copy Raw Image URL"}
              </button>
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
