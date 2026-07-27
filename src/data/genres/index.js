import { artSections } from "../artArchive.js"
import installations from "./installations.js"
import netart from "./netart.js"
import performance from "./performance.js"

/** @param {import('../homeQuadrant3d.js').QuadrantWork[]} works newest first; undated works go last */
function sortByDateDesc(works) {
  return [...works].sort((a, b) => (b.date ?? "0000").localeCompare(a.date ?? "0000"))
}

function toId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

/** Enrich archive items with date/image from quadrant genre data when available */
const metaBySlug = Object.fromEntries(
  [...installations.works, ...netart.works, ...performance.works]
    .filter((w) => w.slug)
    .map((w) => [w.slug, w]),
)

/**
 * @param {{ label: string, slug?: string }} item
 * @returns {import('../homeQuadrant3d.js').QuadrantWork}
 */
function toWork(item) {
  const meta = item.slug ? metaBySlug[item.slug] : undefined
  return {
    label: item.label,
    slug: item.slug,
    date: meta?.date,
    image: meta?.image,
    x: meta?.x ?? 0,
    y: meta?.y ?? 0,
    z: meta?.z ?? 0,
  }
}

/** @type {import('../homeQuadrant3d.js').GenreLayer & { sections: { id: string, title: string, groups: { title?: string, works: import('../homeQuadrant3d.js').QuadrantWork[] }[] }[] }} */
const index = {
  id: "index",
  title: "Index",
  layout: "chronology",
  z: 6,
  sections: artSections.map((section) => ({
    id: toId(section.title),
    title: section.title,
    groups: section.groups.map((group) => ({
      title: group.title,
      works: sortByDateDesc(group.items.map(toWork)),
    })),
  })),
  works: sortByDateDesc(
    artSections.flatMap((section) =>
      section.groups.flatMap((group) => group.items.map(toWork)),
    ),
  ),
}

export default index
