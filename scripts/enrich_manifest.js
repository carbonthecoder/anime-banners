const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const manifestPath = path.join(__dirname, "../src/data/banner_manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function parsePng(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return null;
}

async function probeItem(it) {
  const isPng = it.path.toLowerCase().endsWith(".png");
  const range = isPng ? "bytes=0-511" : "bytes=0-32768";
  try {
    const res = await fetch(it.raw_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Range: range,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 206 || res.status === 200) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (isPng) {
        const p = parsePng(buf);
        if (p) return p;
      }
      const meta = await sharp(buf).metadata();
      if (meta.width && meta.height) return { width: meta.width, height: meta.height };
    }
  } catch {
    // ignore
  }
  return null;
}

async function run() {
  console.log(`Starting real probe for ${manifest.items.length} items...`);
  const concurrency = 4;
  let wide = 0;
  let square = 0;
  let portrait = 0;

  for (let i = 0; i < manifest.items.length; i += concurrency) {
    const chunk = manifest.items.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (it) => {
        const d = await probeItem(it);
        if (d && d.width && d.height) {
          it.width = d.width;
          it.height = d.height;
          const ratio = Number((d.width / d.height).toFixed(2));
          it.aspect_ratio = ratio;

          if (ratio >= 1.25) {
            it.orientation = "wide";
            wide++;
          } else if (ratio >= 0.85) {
            it.orientation = "square";
            square++;
          } else {
            it.orientation = "portrait";
            portrait++;
          }
        } else {
          // Fallback if network dropped this specific item
          it.width = 1200;
          it.height = 675;
          it.aspect_ratio = 1.78;
          it.orientation = "wide";
          wide++;
        }
      })
    );

    if ((i + concurrency) % 100 < concurrency || i + concurrency >= manifest.items.length) {
      console.log(`Progress: ${Math.min(i + concurrency, manifest.items.length)} / ${manifest.items.length} (Wide: ${wide}, Square: ${square}, Portrait: ${portrait})`);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    }

    await new Promise((r) => setTimeout(r, 40));
  }

  manifest.stats = { total: manifest.items.length, wide, square, portrait };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`FINISHED ALL ITEMS! Wide: ${wide}, Square: ${square}, Portrait: ${portrait}`);
}

run().catch(console.error);
