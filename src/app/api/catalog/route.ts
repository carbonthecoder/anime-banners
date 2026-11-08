import { NextRequest, NextResponse } from "next/server";
import { manifest, filterItems, BANNER_PRESETS } from "@/lib/banner";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lang = searchParams.get("lang") || undefined;
  const q = searchParams.get("q") || undefined;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = Math.min(Math.max(1, limitParam ? parseInt(limitParam, 10) : 48), 200);
  const offset = Math.max(0, offsetParam ? parseInt(offsetParam, 10) : 0);

  const filtered = filterItems({ lang, query: q });
  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json(
    {
      total: filtered.length,
      categories: manifest.categories,
      items: paginated,
      presets: BANNER_PRESETS,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < filtered.length,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
