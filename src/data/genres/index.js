import installations from "./installations.js"
import netart from "./netart.js"
import performance from "./performance.js"

// ─── /index page config ───────────────────────────────────────────────────────
// Categories shown on the index page, in display order.
// Add, remove, or reorder entries here to change the page.
const categories = [installations, netart, performance]

/** @param {import('../homeQuadrant3d.js').QuadrantWork[]} works newest first; undated works go last */
function sortByDateDesc(works) {
  return [...works].sort((a, b) => (b.date ?? "0000").localeCompare(a.date ?? "0000"))
}

/** @type {import('../homeQuadrant3d.js').GenreLayer & { sections: { id: string, title: string, works: import('../homeQuadrant3d.js').QuadrantWork[] }[] }} */
const index = {
  id: "index",
  title: "Index",
  layout: "chronology",
  z: 6,
  sections: categories.map((genre) => ({
    id: genre.id,
    title: genre.title,
    works: sortByDateDesc(genre.works),
  })),
  works: sortByDateDesc(categories.flatMap((genre) => genre.works)),
}

export default index
