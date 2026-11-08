"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RotateCcw,
  Copy,
  Check,
  Download,
  ExternalLink,
  Pin,
  Sparkles,
  Sliders,
  Layers,
  Code2,
  Terminal,
  Grid,
  Search,
  BookOpen,
  Eye,
  CheckCircle2,
  Github,
  ChevronDown,
  Monitor,
  LayoutTemplate,
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

const PRESETS = [
  { id: "github", label: "GitHub Banner", width: 1844, height: 999, ratio: "1.85:1" },
  { id: "github-compact", label: "GitHub Slim", width: 1200, height: 400, ratio: "3:1" },
  { id: "twitter", label: "Twitter / X", width: 1500, height: 500, ratio: "3:1" },
  { id: "discord", label: "Discord Banner", width: 1920, height: 1080, ratio: "16:9" },
  { id: "custom", label: "Custom Size", width: 1600, height: 800, ratio: "2:1" },
];

const POPULAR_LANGUAGES = [
  "All",
  "Rust",
  "Python",
  "Go",
  "TypeScript",
  "C++",
  "C",
  "JavaScript",
  "Linux",
  "SICP",
  "Java",
  "Haskell",
  "Docker",
  "Math",
  "Algorithms",
];

export default function BannerStudio() {
  // Config state
  const [preset, setPreset] = useState("github");
  const [customW, setCustomW] = useState(1844);
  const [customH, setCustomH] = useState(999);
  const [selectedLang, setSelectedLang] = useState("All");
  const [crop, setCrop] = useState<"attention" | "center" | "entropy" | "top">("attention");
  const [badge, setBadge] = useState(false);
  const [dim, setDim] = useState(false);
  const [vignette, setVignette] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // Studio UI state
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [isLoading, setIsLoading] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"banner" | "github">("banner");
  const [activeTab, setActiveTab] = useState<"preview" | "gallery" | "docs">("preview");

  // Metadata from the loaded banner
  const [currentMeta, setCurrentMeta] = useState<{
    id: string;
    category: string;
    title: string;
    source: string;
  }>({
    id: "",
    category: "Rust",
    title: "The Rust Programming Language",
    source: "Rust/Shikanoko-The-Rust-Programming-Language.png",
  });

  // Gallery state
  const [searchQuery, setSearchQuery] = useState("");
  const [galleryCategory, setGalleryCategory] = useState("All");
  const [galleryPage, setGalleryPage] = useState(1);
  const itemsPerPage = 32;

  // Compute active dimensions
  const activeWidth = preset === "custom" ? customW : PRESETS.find((p) => p.id === preset)?.width || 1844;
  const activeHeight = preset === "custom" ? customH : PRESETS.find((p) => p.id === preset)?.height || 999;

  // Construct the live API URL
  const bannerApiUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (preset !== "github") {
      if (preset === "custom") {
        params.set("w", activeWidth.toString());
        params.set("h", activeHeight.toString());
      } else {
        params.set("preset", preset);
      }
    }

    if (selectedLang !== "All") {
      params.set("lang", selectedLang.toLowerCase());
    }

    if (crop !== "attention") {
      params.set("crop", crop);
    }

    if (badge) params.set("badge", "true");
    if (dim) params.set("dim", "true");
    if (vignette) params.set("vignette", "true");

    if (pinnedId) {
      params.set("id", pinnedId);
    } else {
      params.set("seed", seed.toString());
    }

    const query = params.toString();
    return `/api/banner${query ? `?${query}` : ""}`;
  }, [preset, activeWidth, activeHeight, selectedLang, crop, badge, dim, vignette, pinnedId, seed]);

  // Production absolute URL for embedding
  const embedBaseUrl = "https://banners.carbon.is-a.dev";
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (preset !== "github") {
      if (preset === "custom") {
        params.set("w", activeWidth.toString());
        params.set("h", activeHeight.toString());
      } else {
        params.set("preset", preset);
      }
    }

    if (selectedLang !== "All") {
      params.set("lang", selectedLang.toLowerCase());
    }

    if (crop !== "attention") {
      params.set("crop", crop);
    }

    if (badge) params.set("badge", "true");
    if (dim) params.set("dim", "true");
    if (vignette) params.set("vignette", "true");

    if (pinnedId) {
      params.set("id", pinnedId);
    }

    const query = params.toString();
    return `${embedBaseUrl}/api/banner${query ? `?${query}` : ""}`;
  }, [preset, activeWidth, activeHeight, selectedLang, crop, badge, dim, vignette, pinnedId]);

  // Reroll handler
  const reroll = useCallback(() => {
    setPinnedId(null);
    setSeed(Math.floor(Math.random() * 10000000));
    setIsLoading(true);
  }, []);

  // Keyboard shortcut listener: Space or R to reroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "r" || e.key === "R" || e.key === " ") {
        if (e.key === " ") e.preventDefault();
        reroll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reroll]);

  // Fetch metadata headers on image update
  useEffect(() => {
    const fetchHeaders = async () => {
      try {
        const res = await fetch(bannerApiUrl, { method: "HEAD" });
        if (res.ok) {
          const id = res.headers.get("x-banner-id") || "";
          const category = res.headers.get("x-banner-category") || "Anime";
          const rawTitle = res.headers.get("x-banner-title") || "";
          const source = res.headers.get("x-banner-source") || "";
          setCurrentMeta({
            id,
            category,
            title: decodeURIComponent(rawTitle),
            source,
          });
        }
      } catch (err) {
        console.error("Failed to read banner headers", err);
      }
    };
    fetchHeaders();
  }, [bannerApiUrl]);

  // Copy helper
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Gallery filtered items
  const galleryItems = useMemo(() => {
    let list = manifestData.items as BannerItem[];
    if (galleryCategory !== "All") {
      list = list.filter((it) => it.category.toLowerCase() === galleryCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (it) => it.title.toLowerCase().includes(q) || it.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [galleryCategory, searchQuery]);

  const paginatedGallery = useMemo(() => {
    const start = (galleryPage - 1) * itemsPerPage;
    return galleryItems.slice(start, start + itemsPerPage);
  }, [galleryItems, galleryPage]);

  const totalPages = Math.ceil(galleryItems.length / itemsPerPage);

  // Pin a specific gallery item
  const handleSelectFromGallery = (item: BannerItem) => {
    setPinnedId(item.id);
    setSelectedLang("All");
    setActiveTab("preview");
    setIsLoading(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Top Header Badge */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wider uppercase bg-pink-500/10 text-pink-400 border border-pink-500/20 mb-4 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Live Banner Generator</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-mono">
          random-banner
        </h1>

        <p className="mt-3 text-base sm:text-lg text-zinc-400 max-w-2xl font-sans leading-relaxed">
          Dynamic, perfectly cropped banners for GitHub profile READMEs featuring{" "}
          <span className="text-pink-400 font-semibold font-mono">850+</span> anime girls holding programming books. One <code className="text-zinc-200 bg-zinc-800/80 px-1.5 py-0.5 rounded text-sm font-mono">&lt;img&gt;</code> tag, fresh random illustration on every load.
        </p>

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-8 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === "preview"
                ? "bg-zinc-800 text-white font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Monitor className="w-4 h-4 text-pink-400" />
            Studio & Preview
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === "gallery"
                ? "bg-zinc-800 text-white font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Grid className="w-4 h-4 text-pink-400" />
            Book Catalog ({manifestData.total})
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === "docs"
                ? "bg-zinc-800 text-white font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Terminal className="w-4 h-4 text-pink-400" />
            API Specs
          </button>
        </div>
      </div>

      {activeTab === "preview" && (
        <div className="space-y-8">
          {/* Main Display Stage */}
          <div className="relative rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 sm:p-6 shadow-2xl backdrop-blur-sm">
            {/* Stage Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-800/80 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-zinc-300 font-bold">
                  {currentMeta.category || "Anime"}
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-400 truncate max-w-[260px] sm:max-w-md">
                  {currentMeta.title || "Loading..."}
                </span>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setViewMode("banner")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                    viewMode === "banner"
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Banner View
                </button>
                <button
                  onClick={() => setViewMode("github")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                    viewMode === "github"
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Github className="w-3.5 h-3.5 text-pink-400" />
                  GitHub README View
                </button>
              </div>
            </div>

            {/* Banner Frame */}
            {viewMode === "banner" ? (
              <div className="relative w-full overflow-hidden rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-center min-h-[220px] sm:min-h-[380px]">
                {isLoading && (
                  <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10 font-mono text-xs text-zinc-400">
                    <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    <span>Processing Sharp Smart Crop...</span>
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={bannerApiUrl}
                  src={bannerApiUrl}
                  alt={currentMeta.title}
                  className="w-full h-auto max-h-[560px] object-contain transition-opacity duration-300"
                  onLoad={() => setIsLoading(false)}
                />
              </div>
            ) : (
              /* Simulated GitHub Profile README Container */
              <div className="rounded-xl border border-zinc-800 bg-[#0d1117] p-4 sm:p-6 text-zinc-100 font-sans shadow-inner">
                {/* Simulated Profile Header */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-zinc-800">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://github.com/carbonthecoder.png"
                      alt="carbon"
                      className="w-full h-full rounded-full object-cover bg-zinc-900"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Ibrahim</h3>
                    <p className="text-zinc-400 text-xs font-mono">carbonthecoder · banners.carbon.is-a.dev</p>
                  </div>
                </div>

                {/* Simulated README Box */}
                <div className="rounded-lg border border-zinc-700/60 bg-[#161b22] p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3 text-xs font-mono text-zinc-400">
                    <BookOpen className="w-3.5 h-3.5 text-pink-400" />
                    <span>README.md</span>
                  </div>

                  {/* The live banner inside the simulated README */}
                  <div className="overflow-hidden rounded-md border border-zinc-700/50 mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={`gh-${bannerApiUrl}`}
                      src={bannerApiUrl}
                      alt="GitHub README Banner"
                      className="w-full h-auto object-cover"
                    />
                  </div>

                  <p className="text-zinc-300 text-sm leading-relaxed">
                    👋 Hey there! Welcome to my profile. This banner automatically rotates every time you load this page, cropped with intelligent edge attention from <span className="text-pink-400 font-mono text-xs">cat-milk/Anime-Girls-Holding-Programming-Books</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Primary Action Button Bar (Reroll, Preset, Download, Pin, Open) */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Reroll Button */}
                <button
                  onClick={reroll}
                  title="Roll another random banner (or press Space / R)"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-pink-500 text-white hover:bg-pink-600 active:scale-95 transition-all shadow-lg shadow-pink-500/20 cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>reroll</span>
                  <span className="text-[10px] opacity-70 bg-black/20 px-1 rounded">R</span>
                </button>

                {/* Preset Dropdown Pills */}
                <div className="flex items-center rounded-xl bg-zinc-950 p-1 border border-zinc-800 font-mono text-xs">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        preset === p.id
                          ? "bg-zinc-800 text-white font-bold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {p.label.split(" (")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Pin Button */}
                <button
                  onClick={() => {
                    if (currentMeta.id) {
                      setPinnedId(currentMeta.id);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-xs font-medium border transition-all cursor-pointer ${
                    pinnedId
                      ? "bg-pink-500/10 border-pink-500 text-pink-400 font-bold"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  }`}
                  title="Lock this specific banner image so it won't rotate"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{pinnedId ? "pinned" : "pin this one"}</span>
                </button>

                {/* Download Button */}
                <a
                  href={bannerApiUrl}
                  download={`anime-banner-${currentMeta.id || "image"}.jpg`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>download</span>
                </a>

                {/* Open in New Tab */}
                <a
                  href={bannerApiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>open ↗</span>
                </a>
              </div>
            </div>

            {/* Source Path Indicator */}
            <div className="mt-3 font-mono text-[11px] text-zinc-500 truncate">
              source: <span className="text-zinc-400">{currentMeta.source}</span>
            </div>
          </div>

          {/* Controls & Filter Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Language Filter */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  <Code2 className="w-4 h-4 text-pink-400" />
                  <span>Language Filter</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  {selectedLang === "All" ? "850+ images" : `${selectedLang} only`}
                </span>
              </div>

              {/* Quick Language Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {POPULAR_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLang(lang);
                      setPinnedId(null);
                      setIsLoading(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      selectedLang === lang
                        ? "bg-pink-500 text-white font-bold shadow-md shadow-pink-500/20"
                        : "bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Crop & Dimensions */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-pink-400" />
                  <span>Crop & Dimension</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  {activeWidth} × {activeHeight}
                </span>
              </div>

              {/* Crop Strategy */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 uppercase">
                  Crop Strategy
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-center">
                  {(["attention", "center", "entropy", "top"] as const).map((strat) => (
                    <button
                      key={strat}
                      onClick={() => setCrop(strat)}
                      className={`py-1 rounded capitalize transition-all cursor-pointer ${
                        crop === strat
                          ? "bg-zinc-800 text-white font-bold"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {strat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Dimensions if selected */}
              {preset === "custom" && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase">Width</label>
                    <input
                      type="number"
                      value={customW}
                      onChange={(e) => setCustomW(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-white"
                      min={200}
                      max={3840}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase">Height</label>
                    <input
                      type="number"
                      value={customH}
                      onChange={(e) => setCustomH(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-white"
                      min={100}
                      max={2160}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Style & Overlays */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-pink-400" />
                <span>Overlays & Badges</span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                {/* Badge Toggle */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <span className="text-zinc-300">Book Title Badge</span>
                  <input
                    type="checkbox"
                    checked={badge}
                    onChange={(e) => setBadge(e.target.checked)}
                    className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                  />
                </label>

                {/* Dim Gradient Toggle */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <span className="text-zinc-300">Text Readability Dim</span>
                  <input
                    type="checkbox"
                    checked={dim}
                    onChange={(e) => setDim(e.target.checked)}
                    className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                  />
                </label>

                {/* Vignette Toggle */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <span className="text-zinc-300">Cinematic Vignette</span>
                  <input
                    type="checkbox"
                    checked={vignette}
                    onChange={(e) => setVignette(e.target.checked)}
                    className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Embed in a README Section */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-zinc-400">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-pink-400" />
                <span>Embed in your GitHub README</span>
              </div>
              <span className="text-zinc-500 text-[11px]">Copy snippet</span>
            </div>

            {/* Code Block */}
            <div className="relative group rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs overflow-x-auto text-zinc-200">
              <pre className="text-pink-300 leading-relaxed">
{`<a href="https://github.com/carbonthecoder">
  <img src="${embedUrl}" width="100%" alt="Anime Programming Banner" />
</a>`}
              </pre>

              <button
                onClick={() =>
                  copyToClipboard(
                    `<a href="https://github.com/carbonthecoder">\n  <img src="${embedUrl}" width="100%" alt="Anime Programming Banner" />\n</a>`,
                    "html"
                  )
                }
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedType === "html" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>copy html</span>
                  </>
                )}
              </button>
            </div>

            {/* Multi-format copy buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() =>
                  copyToClipboard(
                    `[![Anime Banner](${embedUrl})](https://github.com/carbonthecoder)`,
                    "md"
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedType === "md" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>copy markdown</span>
              </button>

              <button
                onClick={() => copyToClipboard(embedUrl, "raw")}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedType === "raw" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>copy direct url</span>
              </button>

              <div className="text-[11px] text-zinc-500 ml-auto hidden sm:block">
                Supported parameters: <code className="text-zinc-400">lang</code>, <code className="text-zinc-400">preset</code>, <code className="text-zinc-400">w</code>, <code className="text-zinc-400">h</code>, <code className="text-zinc-400">seed</code>, <code className="text-zinc-400">badge</code>
              </div>
            </div>
          </div>

          {/* 4 Architectural Metric Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Active Preset
              </span>
              <span className="text-base sm:text-lg font-bold text-white">
                {activeWidth} × {activeHeight}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Source Dataset
              </span>
              <span className="text-base sm:text-lg font-bold text-pink-400">
                853 Curated
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Crop Engine
              </span>
              <span className="text-base sm:text-lg font-bold text-white capitalize">
                Sharp {crop}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Cache Control
              </span>
              <span className="text-base sm:text-lg font-bold text-white">
                {pinnedId ? "Seeded 1yr" : "No-Store Live"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Catalog & Explorer Tab */}
      {activeTab === "gallery" && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 font-mono text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by book or language..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setGalleryPage(1);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-zinc-500 shrink-0">Language:</span>
              <select
                value={galleryCategory}
                onChange={(e) => {
                  setGalleryCategory(e.target.value);
                  setGalleryPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 cursor-pointer focus:outline-none focus:border-pink-500"
              >
                <option value="All">All Categories ({manifestData.total})</option>
                {manifestData.categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid of Images */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {paginatedGallery.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectFromGallery(item)}
                className="group relative rounded-xl overflow-hidden bg-zinc-900/70 border border-zinc-800/80 hover:border-pink-500/80 transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-[16/10] overflow-hidden bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.cdn_url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-3 font-mono">
                  <div className="text-[10px] text-pink-400 font-bold uppercase tracking-wider mb-0.5">
                    {item.category}
                  </div>
                  <h4 className="text-xs text-zinc-200 font-semibold truncate group-hover:text-white">
                    {item.title}
                  </h4>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-mono text-white">
                  click to preview
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4 font-mono text-xs">
              <button
                disabled={galleryPage <= 1}
                onClick={() => setGalleryPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
              >
                Previous
              </button>
              <span className="text-zinc-500">
                Page <span className="text-white font-bold">{galleryPage}</span> of {totalPages}
              </span>
              <button
                disabled={galleryPage >= totalPages}
                onClick={() => setGalleryPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* API Specifications & Playground Tab */}
      {activeTab === "docs" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6 font-mono text-xs">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 font-mono">
                API Endpoint Reference
              </h3>
              <p className="text-zinc-400 font-sans text-sm">
                The banner endpoint operates with fast server-side Sharp processing and direct image streaming.
              </p>
            </div>

            {/* Endpoint block */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-pink-300">
              <code>GET https://banners.carbon.is-a.dev/api/banner</code>
              <span className="text-zinc-500">HTTP/2 / JPEG / WEBP / PNG</span>
            </div>

            {/* Query parameters table */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                Query Parameters
              </h4>
              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Param</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Default</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                    <tr>
                      <td className="p-3 text-pink-400">lang</td>
                      <td className="p-3 text-zinc-500">string</td>
                      <td className="p-3 text-zinc-500">all</td>
                      <td className="p-3 font-sans text-xs">Filter by language (e.g. <code>rust</code>, <code>python</code>, <code>go</code>, <code>typescript</code>, <code>c++</code>).</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-pink-400">preset</td>
                      <td className="p-3 text-zinc-500">string</td>
                      <td className="p-3 text-zinc-500">github</td>
                      <td className="p-3 font-sans text-xs"><code>github</code> (1844×999), <code>github-compact</code> (1200×400), <code>twitter</code> (1500×500), <code>discord</code> (1920×1080).</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-pink-400">w, h</td>
                      <td className="p-3 text-zinc-500">number</td>
                      <td className="p-3 text-zinc-500">1844, 999</td>
                      <td className="p-3 font-sans text-xs">Custom width and height in pixels.</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-pink-400">seed</td>
                      <td className="p-3 text-zinc-500">string | number</td>
                      <td className="p-3 text-zinc-500">random</td>
                      <td className="p-3 font-sans text-xs">Fixes an exact reproducible image and enables immutable 1-year CDN caching.</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-pink-400">id</td>
                      <td className="p-3 text-zinc-500">string</td>
                      <td className="p-3 text-zinc-500">none</td>
                      <td className="p-3 font-sans text-xs">Direct slug ID from the 853 image catalog.</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-pink-400">crop</td>
                      <td className="p-3 text-zinc-500">string</td>
                      <td className="p-3 text-zinc-500">attention</td>
                      <td className="p-3 font-sans text-xs"><code>attention</code> (focuses on face and book), <code>entropy</code>, <code>center</code>, <code>top</code>.</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-pink-400">badge</td>
                      <td className="p-3 text-zinc-500">boolean</td>
                      <td className="p-3 text-zinc-500">false</td>
                      <td className="p-3 font-sans text-xs">Renders a subtle glassmorphic pill badge with book name and language.</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-pink-400">dim</td>
                      <td className="p-3 text-zinc-500">boolean</td>
                      <td className="p-3 text-zinc-500">false</td>
                      <td className="p-3 font-sans text-xs">Applies a subtle bottom darkness gradient for profile text contrast.</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-pink-400">format</td>
                      <td className="p-3 text-zinc-500">string</td>
                      <td className="p-3 text-zinc-500">jpeg</td>
                      <td className="p-3 font-sans text-xs"><code>jpeg</code>, <code>webp</code>, or <code>png</code>.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Response Headers */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Response Metadata Headers
              </h4>
              <p className="text-zinc-400 font-sans text-xs mb-3">
                Every request returns rich headers detailing the exact illustration served:
              </p>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 text-zinc-400">
                <div><span className="text-pink-400">X-Banner-Id:</span> rust-shikanoko-the-rust-programming-language</div>
                <div><span className="text-pink-400">X-Banner-Category:</span> Rust</div>
                <div><span className="text-pink-400">X-Banner-Title:</span> Shikanoko The Rust Programming Language</div>
                <div><span className="text-pink-400">X-Banner-Source:</span> Rust/Shikanoko-The-Rust-Programming-Language.png</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span>endpoint:</span>
          <code className="text-zinc-300">/api/banner</code>
          <span>·</span>
          <span>source:</span>
          <a
            href="https://github.com/cat-milk/Anime-Girls-Holding-Programming-Books"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:underline"
          >
            cat-milk/Anime-Girls-Holding-Programming-Books
          </a>
        </div>

        <div className="text-zinc-400">
          crafted by <a href="https://github.com/carbonthecoder" target="_blank" rel="noopener noreferrer" className="text-zinc-200 font-bold hover:text-white">carbon</a> for <span className="text-pink-400 font-bold">banners.carbon.is-a.dev</span>
        </div>
      </footer>
    </div>
  );
}
