/**
 * Regenerates /public/images/thumbs/<slug>.jpg for every work that has an
 * image, from the same data the home and work pages read.
 *
 *   node scripts/make-thumbs.mjs
 *
 * The largest place a thumb is drawn is the 210px home card, so 640px wide
 * keeps it sharp up to 3x screens.
 */
import { mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { artSections } from "../src/data/artArchive.js"
import { genreLayers } from "../src/data/homeQuadrant3d.js"

const WIDTH = 640
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outDir = path.join(root, "public/images/thumbs")

// sharp ships with astro rather than as a direct dependency
const require = createRequire(import.meta.url)
const sharp = createRequire(require.resolve("astro/package.json"))("sharp")

/** slug -> source image; the genre data wins over the archive, as on the pages */
const imageBySlug = new Map()
for (const item of artSections.flatMap((s) => s.groups.flatMap((g) => g.items))) {
  if (item.slug && item.image) imageBySlug.set(item.slug, item.image)
}
for (const work of genreLayers.flatMap((l) => l.works)) {
  if (work.slug && work.image) imageBySlug.set(work.slug, work.image)
}

await mkdir(outDir, { recursive: true })
for (const [slug, image] of [...imageBySlug].sort()) {
  const info = await sharp(path.join(root, "public", image))
    .rotate()
    .resize({ width: WIDTH, withoutEnlargement: true })
    .flatten({ background: "#fff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(outDir, `${slug}.jpg`))
  console.log(`${slug}.jpg  ${info.width}x${info.height}  ${Math.round(info.size / 1024)}kB  <- ${image}`)
}
