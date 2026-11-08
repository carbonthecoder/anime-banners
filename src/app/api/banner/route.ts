import { NextRequest } from "next/server";
import {
  selectItem,
  fetchSourceImage,
  processBanner,
  BannerOptions,
  PresetKey,
} from "@/lib/banner";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lang = searchParams.get("lang") || undefined;
    const pool = searchParams.get("pool") || undefined;
    const favs = searchParams.get("favs") || undefined;
    const user = searchParams.get("user") || undefined;
    const seed = searchParams.get("seed") || undefined;
    const id = searchParams.get("id") || undefined;

    const preset = (searchParams.get("preset") as PresetKey) || undefined;
    const widthParam = searchParams.get("w") || searchParams.get("width");
    const heightParam = searchParams.get("h") || searchParams.get("height");

    const width = widthParam ? parseInt(widthParam, 10) : undefined;
    const height = heightParam ? parseInt(heightParam, 10) : undefined;

    const cropParam = searchParams.get("crop");
    const crop = (
      ["attention", "entropy", "center", "top"].includes(cropParam || "")
        ? cropParam
        : "attention"
    ) as BannerOptions["crop"];

    const badge = searchParams.get("badge") === "true" || searchParams.get("badge") === "1";
    const dim = searchParams.get("dim") === "true" || searchParams.get("dim") === "1";
    const tint = searchParams.get("tint") === "true" || searchParams.get("tint") === "1";
    const vignette = searchParams.get("vignette") === "true" || searchParams.get("vignette") === "1";

    const blurParam = searchParams.get("blur");
    const blur = blurParam ? parseFloat(blurParam) : undefined;

    const formatParam = searchParams.get("format");
    const format = (
      ["jpeg", "webp", "png"].includes(formatParam || "") ? formatParam : "jpeg"
    ) as BannerOptions["format"];

    const qualityParam = searchParams.get("q") || searchParams.get("quality");
    const quality = qualityParam ? parseInt(qualityParam, 10) : 85;

    // Select banner item
    const { item, isSeeded } = selectItem({ id, seed, lang, pool, favs });

    // Fetch and process image
    const sourceBuffer = await fetchSourceImage(item);
    const { buffer, contentType } = await processBanner(sourceBuffer, item, {
      width,
      height,
      preset,
      crop,
      badge,
      user,
      pool,
      favs,
      tint,
      dim,
      vignette,
      blur,
      format,
      quality,
    });

    // Build headers
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", buffer.length.toString());
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-Banner-Id", item.id);
    headers.set("X-Banner-Category", item.category);
    headers.set("X-Banner-Title", encodeURIComponent(item.title));
    headers.set("X-Banner-Source", item.path);

    if (isSeeded) {
      // Seeded/pinned banners: permanent immutable cache
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("CDN-Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Vercel-CDN-Cache-Control", "public, max-age=31536000, immutable");
    } else {
      // High-speed edge cached rotating banner (60s fresh, 10m stale-while-revalidate)
      // This serves in <25ms directly from Vercel/Cloudflare Edge memory to GitHub Camo
      headers.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=600");
      headers.set("CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
      headers.set("Vercel-CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Banner rendering error:", error);
    return new Response("Failed to generate banner", { status: 500 });
  }
}
