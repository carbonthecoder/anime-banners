"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  RotateCcw,
  Copy,
  Check,
  Download,
  ExternalLink,
  Pin,
  Sparkles,
  Search,
  BookOpen,
  Github,
  Monitor,
  Smartphone,
  User,
  SlidersHorizontal,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
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
  location: string | null;
  company: string | null;
  blog: string | null;
}

const PRESETS = [
  { id: "github", label: "GitHub Banner", width: 1844, height: 999, ratio: "1.85:1" },
  { id: "github-compact", label: "GitHub Compact", width: 1200, height: 400, ratio: "3:1" },
  { id: "twitter", label: "Twitter / X", width: 1500, height: 500, ratio: "3:1" },
  { id: "discord", label: "Discord", width: 1920, height: 1080, ratio: "16:9" },
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
  // Banner config
  const [preset, setPreset] = useState("github");
  const [selectedPool, setSelectedPool] = useState<string[]>([]);
  const [crop, setCrop] = useState<"attention" | "center" | "entropy" | "top">("attention");
  const [badge, setBadge] = useState(true);
  const [customUser, setCustomUser] = useState("carbonthecoder");
  const [tint, setTint] = useState(true);
  const [dim, setDim] = useState(false);
  const [vignette, setVignette] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // App & view state
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [isLoading, setIsLoading] = useState(true);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "github-desktop" | "github-mobile" | "catalog">("canvas");

  // GitHub user profile fetcher
  const [ghInput, setGhInput] = useState("carbonthecoder");
  const [ghProfile, setGhProfile] = useState<GitHubProfile>({
    login: "carbonthecoder",
    name: "Carbon",
    avatar_url: "https://avatars.githubusercontent.com/carbonthecoder",
    bio: "Building minimalist developer tools, creative systems, and fast web experiences.",
    followers: 128,
    following: 42,
    public_repos: 18,
    location: "Earth",
    company: null,
    blog: "https://carbon.is-a.dev",
  });
  const [isFetchingGh, setIsFetchingGh] = useState(false);

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

  // Catalog search & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatalogCat, setSelectedCatalogCat] = useState("All");
  const [catalogPage, setCatalogPage] = useState(1);
  const itemsPerPage = 16;

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);

  // Manifest access
  const allItems: BannerItem[] = useMemo(() => manifestData.items as BannerItem[], []);
  const allCategories: Category[] = useMemo(() => manifestData.categories as Category[], []);

  // Fetch GitHub Profile
  const fetchGitHubUser = useCallback(async (username: string) => {
    const cleanUser = username.trim().replace(/^@/, "");
    if (!cleanUser) return;
    setIsFetchingGh(true);
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
          location: data.location || null,
          company: data.company || null,
          blog: data.blog || null,
        });
        setCustomUser(cleanUser);
      } else {
        // Fallback for rate-limited requests
        setGhProfile((prev) => ({
          ...prev,
          login: cleanUser,
          name: cleanUser,
          avatar_url: `https://avatars.githubusercontent.com/${cleanUser}`,
        }));
        setCustomUser(cleanUser);
      }
    } catch {
      // Offline fallback
      setGhProfile((prev) => ({
        ...prev,
        login: cleanUser,
        name: cleanUser,
        avatar_url: `https://avatars.githubusercontent.com/${cleanUser}`,
      }));
      setCustomUser(cleanUser);
    } finally {
      setIsFetchingGh(false);
    }
  }, []);

  // Compute active banner API URL
  const bannerApiUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (preset !== "github") {
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

    if (badge) {
      params.set("badge", "true");
      if (customUser.trim()) {
        params.set("user", customUser.trim());
      }
    }

    if (tint) params.set("tint", "true");
    if (dim) params.set("dim", "true");
    if (vignette) params.set("vignette", "true");

    const qs = params.toString();
    return `/api/banner${qs ? `?${qs}` : ""}`;
  }, [preset, pinnedId, seed, selectedPool, crop, badge, customUser, tint, dim, vignette]);

  // Production full embed URL
  const fullProductionUrl = useMemo(() => {
    const origin = "https://banners.carbon.is-a.dev";
    return `${origin}${bannerApiUrl}`;
  }, [bannerApiUrl]);

  // Read response headers to sync metadata
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
      .catch(() => {
        // Fallback gracefully
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [bannerApiUrl]);

  // Keyboard navigation: Space or R to reroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === " " || e.key === "r" || e.key === "R") {
        e.preventDefault();
        reroll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reroll action
  const reroll = useCallback(() => {
    setPinnedId(null);
    setSeed(Math.floor(Math.random() * 1000000));
  }, []);

  // Pool toggle
  const toggleTopicInPool = (topic: string) => {
    setSelectedPool((prev) => {
      if (prev.includes(topic)) {
        return prev.filter((t) => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  // Copy helper
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(type);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    if (Math.abs(diff) > 45) {
      reroll();
    }
    touchStartX.current = null;
  };

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    return allItems.filter((item) => {
      const matchCat =
        selectedCatalogCat === "All" ||
        item.category.toLowerCase() === selectedCatalogCat.toLowerCase();
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [allItems, selectedCatalogCat, searchQuery]);

  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage);
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * itemsPerPage;
    return filteredCatalog.slice(start, start + itemsPerPage);
  }, [filteredCatalog, catalogPage]);

  // Markdown embed snippet
  const markdownSnippet = useMemo(() => {
    const handle = customUser.trim() || "carbonthecoder";
    return `<a href="https://github.com/${handle}">\n  <img src="${fullProductionUrl}" width="100%" alt="Anime Programming Banner" />\n</a>`;
  }, [customUser, fullProductionUrl]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {/* Top Header */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#232632] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6]"></span>
            <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#e8e9ed]">
              anime-banners
            </h1>
            <span className="rounded-full bg-pink-500/10 px-2.5 py-0.5 font-mono text-[11px] text-pink-400 border border-pink-500/20">
              853 books
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-[#8b90a0]">
            Dynamic GitHub profile banners cropped with intelligent edge attention.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#15171e] p-1 border border-[#232632]">
          <button
            onClick={() => setViewMode("canvas")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
              viewMode === "canvas"
                ? "bg-[#232632] text-[#e8e9ed] font-medium"
                : "text-[#8b90a0] hover:text-[#e8e9ed]"
            }`}
          >
            <span>Banner</span>
          </button>
          <button
            onClick={() => setViewMode("github-desktop")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
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

      {/* Main Content Area */}
      {viewMode === "catalog" ? (
        /* Catalog Explorer Tab */
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
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-mono text-xs transition-colors ${
                  selectedCatalogCat === "All"
                    ? "bg-pink-500 text-white font-medium"
                    : "bg-[#15171e] text-[#8b90a0] border border-[#232632] hover:text-[#e8e9ed]"
                }`}
              >
                All (853)
              </button>
              {allCategories.slice(0, 10).map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    setSelectedCatalogCat(cat.name);
                    setCatalogPage(1);
                  }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-mono text-xs transition-colors ${
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

          {/* Grid of covers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {paginatedCatalog.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setPinnedId(item.id);
                  setViewMode("canvas");
                }}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#232632] bg-[#15171e] hover:border-pink-500/50 transition-all hover:scale-[1.01]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.cdn_url}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-2.5">
                  <div className="font-mono text-[10px] text-pink-400 font-bold">{item.category}</div>
                  <div className="font-mono text-xs text-[#e8e9ed] truncate">{item.title}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[#232632] pt-4 font-mono text-xs">
            <span className="text-[#8b90a0]">
              Page {catalogPage} of {Math.max(1, totalPages)} ({filteredCatalog.length} covers)
            </span>
            <div className="flex gap-2">
              <button
                disabled={catalogPage <= 1}
                onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#232632] bg-[#15171e] px-3 py-1 text-[#e8e9ed] disabled:opacity-30"
              >
                Prev
              </button>
              <button
                disabled={catalogPage >= totalPages}
                onClick={() => setCatalogPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-[#232632] bg-[#15171e] px-3 py-1 text-[#e8e9ed] disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Studio Stage: Banner Canvas or Ditto GitHub Profile Mockup */
        <div className="space-y-6">
          {/* GitHub Username Input Bar (Visible when in profile mode or customizable) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-[#15171e] border border-[#232632] p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 text-pink-400" />
              <span className="font-mono text-xs text-[#e8e9ed] font-medium">GitHub Profile:</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b90a0]">@</span>
                <input
                  type="text"
                  value={ghInput}
                  onChange={(e) => setGhInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchGitHubUser(ghInput);
                  }}
                  className="rounded-lg bg-[#0d0e12] pl-6 pr-3 py-1 font-mono text-xs text-[#e8e9ed] border border-[#232632] focus:outline-none focus:border-pink-500/60 w-36 sm:w-44"
                />
              </div>
              <button
                onClick={() => fetchGitHubUser(ghInput)}
                disabled={isFetchingGh}
                className="rounded-lg bg-[#232632] px-3 py-1 font-mono text-xs text-[#e8e9ed] hover:bg-pink-500 hover:text-white transition-colors"
              >
                {isFetchingGh ? "..." : "Fetch"}
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-[#8b90a0]">
              <span>Badge Tag:</span>
              <span className="text-pink-300 font-bold">@{customUser}</span>
            </div>
          </div>

          {/* Stage Viewports */}
          {viewMode === "canvas" ? (
            /* Pure Banner Stage */
            <div className="relative overflow-hidden rounded-2xl border border-[#232632] bg-[#0d0e12] shadow-2xl">
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative aspect-[16/9] w-full overflow-hidden bg-black/60 flex items-center justify-center select-none"
              >
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0d0e12]/60 backdrop-blur-xs">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"></div>
                  </div>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={bannerApiUrl}
                  src={bannerApiUrl}
                  alt={currentMeta.title}
                  className="h-full w-full object-cover transition-opacity duration-300"
                  onLoad={() => setIsLoading(false)}
                />

                {/* Mobile Touch Hint Pill */}
                <div className="absolute top-3 right-3 sm:hidden rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 font-mono text-[10px] text-pink-300 border border-white/10">
                  Swipe to shuffle
                </div>
              </div>

              {/* Banner Footer Info */}
              <div className="flex items-center justify-between border-t border-[#232632] bg-[#15171e] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-pink-400">{currentMeta.category}</span>
                    <span className="text-[#8b90a0]">·</span>
                    <span className="font-mono text-xs text-[#e8e9ed] truncate">{currentMeta.title}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (currentMeta.id) setPinnedId(currentMeta.id);
                    }}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs border transition-colors ${
                      pinnedId
                        ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                        : "bg-[#0d0e12] text-[#8b90a0] border-[#232632] hover:text-[#e8e9ed]"
                    }`}
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
            /* Ditto Exact GitHub Desktop Profile Mockup */
            <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] text-[#f0f6fc] font-sans overflow-hidden shadow-2xl">
              {/* Fake GitHub Navigation Bar */}
              <div className="border-b border-[#30363d] bg-[#161b22] px-4 py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5 text-white" />
                  <span className="font-semibold text-[#f0f6fc]">{ghProfile.login}</span>
                </div>
                <div className="flex items-center gap-4 text-[#8d96a0] font-medium hidden sm:flex">
                  <span className="border-b-2 border-[#f78166] text-[#f0f6fc] pb-1 font-semibold flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-[#8d96a0]" /> Overview
                  </span>
                  <span>Repositories ({ghProfile.public_repos})</span>
                  <span>Projects</span>
                  <span>Packages</span>
                  <span>Stars</span>
                </div>
              </div>

              {/* Profile Body: Left Column Avatar + Right Column README */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Profile Card */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ghProfile.avatar_url}
                    alt={ghProfile.login}
                    className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border border-[#30363d] object-cover shadow-md mb-3"
                  />
                  <h2 className="text-xl font-bold text-[#f0f6fc] leading-tight">{ghProfile.name}</h2>
                  <div className="text-sm font-light text-[#8d96a0] mb-3">@{ghProfile.login}</div>
                  <p className="text-xs text-[#c9d1d9] mb-4 leading-relaxed max-w-xs">{ghProfile.bio}</p>

                  <div className="w-full flex items-center justify-center md:justify-start gap-3 text-xs text-[#8d96a0] border-t border-[#21262d] pt-3">
                    <span>
                      <strong className="text-[#f0f6fc]">{ghProfile.followers}</strong> followers
                    </span>
                    <span>·</span>
                    <span>
                      <strong className="text-[#f0f6fc]">{ghProfile.following}</strong> following
                    </span>
                  </div>
                </div>

                {/* Right Column: Exact GitHub README Card */}
                <div className="md:col-span-8">
                  <div className="rounded-lg border border-[#30363d] bg-[#0d1117] overflow-hidden">
                    {/* GitHub README Header */}
                    <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 py-2 text-xs text-[#8d96a0]">
                      <div className="flex items-center gap-2 font-mono">
                        <BookOpen className="h-3.5 w-3.5 text-pink-400" />
                        <span>{ghProfile.login} / README.md</span>
                      </div>
                      <div className="rounded border border-[#30363d] bg-[#21262d] px-2 py-0.5 text-[11px] text-[#c9d1d9]">
                        Preview
                      </div>
                    </div>

                    {/* README Markdown Contents */}
                    <div className="p-4 sm:p-6 space-y-4">
                      {/* The Anime Banner sitting at the top of the README */}
                      <div className="overflow-hidden rounded-md border border-[#30363d]/60 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          key={`desktop-${bannerApiUrl}`}
                          src={bannerApiUrl}
                          alt="Anime Banner"
                          className="w-full h-auto object-cover"
                        />
                      </div>

                      <div className="border-b border-[#21262d] pb-3">
                        <h3 className="text-lg font-semibold text-[#f0f6fc]">Hi, I&apos;m {ghProfile.name} 👋</h3>
                        <p className="mt-1 text-xs text-[#8d96a0] leading-relaxed">
                          Welcome to my profile. This banner rotates on every page load with covers from{" "}
                          <span className="text-pink-400 font-mono">Anime-Girls-Holding-Programming-Books</span>.
                        </p>
                      </div>

                      <div className="font-mono text-xs text-[#8d96a0] flex flex-wrap gap-2">
                        <span className="rounded bg-[#161b22] px-2 py-1 border border-[#30363d]">🚀 Active pool: {selectedPool.length > 0 ? selectedPool.join(", ") : "All 100 Topics"}</span>
                        <span className="rounded bg-[#161b22] px-2 py-1 border border-[#30363d]">⚡ Powered by Sharp Attention Crop</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Ditto Exact GitHub Mobile Web / App Mockup */
            <div className="mx-auto max-w-sm rounded-3xl border-4 border-[#30363d] bg-[#0d1117] text-[#f0f6fc] font-sans overflow-hidden shadow-2xl">
              {/* Mobile Notch Bar */}
              <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between text-[11px] text-[#8d96a0]">
                <Github className="h-4 w-4 text-white" />
                <span className="font-mono font-bold text-[#f0f6fc]">github.com/{ghProfile.login}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              </div>

              {/* Mobile Profile Card */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ghProfile.avatar_url}
                    alt={ghProfile.login}
                    className="h-14 w-14 rounded-full border border-[#30363d] object-cover"
                  />
                  <div>
                    <h2 className="text-base font-bold text-[#f0f6fc] leading-tight">{ghProfile.name}</h2>
                    <div className="text-xs text-[#8d96a0]">@{ghProfile.login}</div>
                  </div>
                </div>

                <p className="text-xs text-[#c9d1d9] leading-tight">{ghProfile.bio}</p>

                {/* Mobile README Card */}
                <div className="rounded-lg border border-[#30363d] bg-[#0d1117] overflow-hidden mt-3">
                  <div className="border-b border-[#30363d] bg-[#161b22] px-3 py-1.5 flex items-center justify-between text-[11px] text-[#8d96a0]">
                    <span className="font-mono">{ghProfile.login} / README.md</span>
                    <BookOpen className="h-3 w-3 text-pink-400" />
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="overflow-hidden rounded-md border border-[#30363d]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={`mobile-${bannerApiUrl}`}
                        src={bannerApiUrl}
                        alt="Anime Banner"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    <div className="text-xs font-semibold text-[#f0f6fc]">Hi there 👋</div>
                    <div className="text-[11px] text-[#8d96a0]">Welcome to my GitHub profile README!</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Control Bar (Reroll, Presets, Copy) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#15171e] border border-[#232632] p-3 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={reroll}
                className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 font-mono text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:bg-pink-600 active:scale-95 transition-all"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Reroll Banner</span>
                <span className="rounded bg-black/20 px-1 py-0.5 text-[10px] hidden sm:inline">R</span>
              </button>

              {/* Preset Selector */}
              <div className="flex items-center gap-1 rounded-xl bg-[#0d0e12] p-1 border border-[#232632]">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs transition-colors ${
                      preset === p.id
                        ? "bg-[#232632] text-[#e8e9ed] font-medium"
                        : "text-[#8b90a0] hover:text-[#e8e9ed]"
                    }`}
                  >
                    {p.label.replace("GitHub ", "")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(markdownSnippet, "markdown")}
                className="flex items-center gap-1.5 rounded-xl bg-[#232632] px-3.5 py-2 font-mono text-xs font-medium text-[#e8e9ed] hover:bg-pink-500 hover:text-white transition-colors"
              >
                {copiedFormat === "markdown" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedFormat === "markdown" ? "Copied Markdown!" : "Copy README Code"}</span>
              </button>
            </div>
          </div>

          {/* Controls: Multi-Language Rotation Pool & Visual Overlays */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Multi-Language Pool (Col 7) */}
            <div className="md:col-span-7 rounded-2xl border border-[#232632] bg-[#15171e] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#e8e9ed]">
                  <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                  <span>Rotation Pool (Multi-Select)</span>
                </div>
                {selectedPool.length > 0 && (
                  <button
                    onClick={() => setSelectedPool([])}
                    className="font-mono text-[11px] text-pink-400 hover:underline"
                  >
                    Clear pool ({selectedPool.length})
                  </button>
                )}
              </div>
              <p className="font-mono text-[11px] text-[#8b90a0]">
                Select languages you want in your rotation. Leave empty to roll from all 853 books.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {POPULAR_TOPICS.map((topic) => {
                  const isActive = selectedPool.includes(topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopicInPool(topic)}
                      className={`rounded-lg px-2.5 py-1 font-mono text-xs transition-all ${
                        isActive
                          ? "bg-pink-500 text-white font-semibold shadow-xs"
                          : "bg-[#0d0e12] text-[#8b90a0] border border-[#232632] hover:text-[#e8e9ed]"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Overlays & Custom Handle (Col 5) */}
            <div className="md:col-span-5 rounded-2xl border border-[#232632] bg-[#15171e] p-4 space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#e8e9ed]">
                <SlidersHorizontal className="h-3.5 w-3.5 text-pink-400" />
                <span>Overlays & Customization</span>
              </div>

              <div className="space-y-2 pt-1">
                {/* Custom Badge Toggle & Username */}
                <div className="flex items-center justify-between rounded-xl bg-[#0d0e12] p-2.5 border border-[#232632]">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-pink-400" />
                    <span className="font-mono text-xs text-[#e8e9ed]">Glass Badge</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={badge}
                    onChange={(e) => setBadge(e.target.checked)}
                    className="h-4 w-4 rounded accent-pink-500"
                  />
                </div>

                {/* Cozy Dark Tint Toggle */}
                <div className="flex items-center justify-between rounded-xl bg-[#0d0e12] p-2.5 border border-[#232632]">
                  <div>
                    <div className="font-mono text-xs text-[#e8e9ed]">Cozy Dark Tint</div>
                    <div className="font-mono text-[10px] text-[#8b90a0]">Calms blinding white covers for dark mode</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tint}
                    onChange={(e) => setTint(e.target.checked)}
                    className="h-4 w-4 rounded accent-pink-500"
                  />
                </div>

                {/* Vignette Toggle */}
                <div className="flex items-center justify-between rounded-xl bg-[#0d0e12] p-2.5 border border-[#232632]">
                  <div className="font-mono text-xs text-[#e8e9ed]">Cinematic Vignette</div>
                  <input
                    type="checkbox"
                    checked={vignette}
                    onChange={(e) => setVignette(e.target.checked)}
                    className="h-4 w-4 rounded accent-pink-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Embed Code Snippet Cards */}
          <div className="rounded-2xl border border-[#232632] bg-[#15171e] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#e8e9ed]">Embed In Your GitHub Profile README</span>
              <span className="font-mono text-[11px] text-[#8b90a0]">bypasses GitHub Camo stale caching</span>
            </div>

            <div className="relative rounded-xl bg-[#0d0e12] p-3 border border-[#232632]">
              <pre className="font-mono text-xs text-[#e8e9ed] overflow-x-auto whitespace-pre-wrap break-all">
                {markdownSnippet}
              </pre>
              <button
                onClick={() => copyToClipboard(markdownSnippet, "code")}
                className="absolute right-2 top-2 rounded-lg bg-[#232632] p-1.5 text-[#8b90a0] hover:text-white"
                title="Copy snippet"
              >
                {copiedFormat === "code" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Quick URL Copy Bar */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between font-mono text-xs text-[#8b90a0] pt-1">
              <div className="truncate">
                API Endpoint: <span className="text-pink-300 select-all">{fullProductionUrl}</span>
              </div>
              <button
                onClick={() => copyToClipboard(fullProductionUrl, "url")}
                className="rounded-lg bg-[#232632] px-3 py-1 text-[#e8e9ed] hover:bg-pink-500 hover:text-white transition-colors"
              >
                {copiedFormat === "url" ? "Copied URL!" : "Copy Raw URL"}
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
        <div>
          crafted for <span className="text-pink-400 font-bold">banners.carbon.is-a.dev</span>
        </div>
      </footer>
    </div>
  );
}
