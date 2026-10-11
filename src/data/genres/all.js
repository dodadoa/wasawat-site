import installations from "./installations.js"
import netart from "./netart.js"
import performance from "./performance.js"
import print from "./print.js"

/** @type {import('../homeQuadrant3d.js').GenreLayer} */
const all = {
  id: "all",
  title: "All",
  z: 6,
  works: [...installations.works, ...netart.works, ...performance.works, ...print.works],
}

export default all
