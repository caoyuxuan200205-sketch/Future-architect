import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("public");
const assetsDir = path.join(publicDir, "assets");
const outputPath = path.join(assetsDir, "asset-manifest.json");

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolutePath);
    if (absolutePath === outputPath) return [];
    const relativePath = path.relative(publicDir, absolutePath).split(path.sep).join("/");
    return [{ url: `/${relativePath}`, size: fs.statSync(absolutePath).size }];
  });
}

const entries = collectFiles(assetsDir).sort((left, right) => left.url.localeCompare(right.url));
const visuals = entries.filter((entry) => entry.url.startsWith("/assets/visuals/") || entry.url.startsWith("/assets/badges/"));
const audio = entries.filter((entry) => entry.url.startsWith("/assets/audio/"));
const digest = crypto
  .createHash("sha256")
  .update(entries.map((entry) => `${entry.url}:${entry.size}`).join("\n"))
  .digest("hex")
  .slice(0, 12);

const manifest = {
  version: digest,
  groups: { visuals, audio },
};

fs.writeFileSync(outputPath, `${JSON.stringify(manifest)}\n`);
console.log(`Generated asset manifest ${digest}: ${visuals.length} visuals, ${audio.length} audio files.`);
