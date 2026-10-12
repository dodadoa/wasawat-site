import { artSections } from "./artArchive.js"
import { genreLayers } from "./homeQuadrant3d.js"

/**
 * The sets the home page's venn diagram is drawn from. A facet is one way of
 * sorting the works (country, year, …); each of its values is a set a work is
 * either in or out of.
 *
 * Year, medium and concept are read off what the works already carry (date,
 * genre, position on the three axes). Country comes from the archive, and from
 * `TAGS` for the works the archive has no country for. Themes exist only here.
 */

/** @type {Record<string, { country?: string[], themes?: string[] }>} */
const TAGS = {
  "eternal-gain-eternal-pain": { country: ["Thailand"], themes: ["Simulation", "Life & death"] },
  "here-now-absolute-elsewhere": { country: ["Thailand"], themes: ["Simulation", "AI", "Politics"] },
  "self-censored-step-sequencer": { themes: ["Politics"] },
  "gimme-the-light": { themes: ["Audience"] },
  "from-scratch-live-coding": { themes: ["Live coding"] },
  "do-the-npcs-hear-the-simulated-wind": { themes: ["Simulation", "Games", "Memory"] },
  "as-if-you-would-still-be-here": { themes: ["Live coding", "Memory"] },
  "the-abstraction-of-violence": { themes: ["Games", "Politics"] },
  "neonatus-neotokyo": { country: ["Thailand"], themes: ["AI", "Life & death", "Memory"] },
}

// "Thailand / Vietnam" in the archive is two countries
const ARCHIVE_COUNTRY = Object.fromEntries(
  artSections
    .flatMap((section) => section.groups.flatMap((group) => group.items))
    .filter((item) => item.slug && item.country)
    .map((item) => [item.slug, item.country.split("/").map((c) => c.trim())]),
)

const GENRE_TITLE = Object.fromEntries(genreLayers.map((l) => [l.id, l.title]))

// which end of each axis a work leans to; a work sitting on zero is at neither
const CONCEPTS = [
  ["Investigative", (w) => w.x < 0],
  ["Speculative", (w) => w.x > 0],
  ["Past", (w) => w.y < 0],
  ["Future", (w) => w.y > 0],
  ["Human", (w) => (w.z ?? 0) > 0],
  ["Machine", (w) => (w.z ?? 0) < 0],
]

/** @type {{ id: string, title: string, of: (w: any) => string[], sort?: "name", order?: string[] }[]} */
const FACETS = [
  { id: "country", title: "Country", of: (w) => ARCHIVE_COUNTRY[w.slug] ?? TAGS[w.slug]?.country ?? [] },
  { id: "year", title: "Year", of: (w) => (w.date ? [w.date.slice(0, 4)] : []), sort: "name" },
  { id: "medium", title: "Medium", of: (w) => (w.genreId ? [GENRE_TITLE[w.genreId] ?? w.genreId] : []) },
  {
    id: "concept",
    title: "Concept",
    of: (w) => CONCEPTS.filter(([, test]) => test(w)).map(([name]) => name),
    order: CONCEPTS.map(([name]) => name),
  },
  { id: "theme", title: "Theme", of: (w) => TAGS[w.slug]?.themes ?? [] },
]

/**
 * @param {any[]} works
 * @param {(w: any) => string} keyOf
 * @returns {{ id: string, title: string, sets: { id: string, label: string, keys: Set<string> }[] }[]}
 */
export function buildFacets(works, keyOf) {
  return FACETS.map((facet) => {
    /** @type {Map<string, Set<string>>} */
    const byLabel = new Map()
    for (const w of works) {
      for (const label of facet.of(w)) {
        if (!byLabel.has(label)) byLabel.set(label, new Set())
        byLabel.get(label).add(keyOf(w))
      }
    }
    const sets = [...byLabel].map(([label, keys]) => ({ id: `${facet.id}:${label}`, label, keys }))
    if (facet.sort === "name") sets.sort((a, b) => a.label.localeCompare(b.label))
    if (facet.order) sets.sort((a, b) => facet.order.indexOf(a.label) - facet.order.indexOf(b.label))
    return { id: facet.id, title: facet.title, sets }
  })
}
