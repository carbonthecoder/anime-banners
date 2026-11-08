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
    const { item, isSeeded } = selectItem({ id, seed, lang });

    // Fetch and process image
    const sourceBuffer = await fetchSourceImage(item);
    const { buffer, contentType } = await processBanner(sourceBuffer, item, {
      width,
      height,
      preset,
      crop,
      badge,
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
      // Seeded/pinned banners can be aggressively cached by edge & browsers
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      // Rotating banner: tell GitHub Camo and browser not to cache
      headers.set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
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
