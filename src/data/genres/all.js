import installations from "./installations.js"
import netart from "./netart.js"
import performance from "./performance.js"

/** @type {import('../homeQuadrant3d.js').GenreLayer} */
const all = {
  id: "all",
  title: "All",
  z: 6,
  works: [...installations.works, ...netart.works, ...performance.works],
}

export default all
