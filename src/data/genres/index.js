import installations from "./installations.js"
import netart from "./netart.js"
import performance from "./performance.js"

/** @param {import('../homeQuadrant3d.js').QuadrantWork[]} works */
function layoutChronological(works) {
  const sorted = [...works].sort((a, b) => {
    const da = a.date ?? "9999-12-31"
    const db = b.date ?? "9999-12-31"
    return da.localeCompare(db)
  })

  const n = sorted.length
  return sorted.map((work, i) => ({
    ...work,
    x: n <= 1 ? 0 : -0.85 + (i / (n - 1)) * 1.7,
    y: 0,
  }))
}

const genreSources = [installations, netart, performance]

/** @type {import('../homeQuadrant3d.js').GenreLayer} */
const index = {
  id: "index",
  title: "Index",
  layout: "chronology",
  z: 6,
  works: layoutChronological(genreSources.flatMap((genre) => genre.works)),
}

export default index
