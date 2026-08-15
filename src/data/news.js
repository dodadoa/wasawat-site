/**
 * News entries.
 *
 * `start`/`end` are ISO dates (`YYYY-MM-DD`). `end` defaults to `start` for
 * single-day events. Everything on the news page — ordering, the date label,
 * and whether an entry sits under "Upcoming" or "Archive" — is derived from
 * these, so adding an entry here is the only edit needed.
 *
 * `meta` and paragraph strings are rendered as HTML, so inline tags
 * (<strong>, <em>, <a>) are allowed.
 */

/**
 * @typedef {{ label: string, href?: string }} NewsLink
 * @typedef {{
 *   start: string,
 *   end?: string,
 *   venue?: NewsLink[],
 *   venueSuffix?: string,
 *   title: string,
 *   subtitle?: string,
 *   body?: string[],
 *   meta?: string[],
 *   links?: NewsLink[],
 * }} NewsEntry
 */

/** @type {NewsEntry[]} */
export const newsEntries = [
  {
    start: "2026-08-14",
    venue: [{ label: "Bangkok Kunsthalle", href: "https://www.instagram.com/bangkok_kunsthalle/" }],
    title: "Rat Section",
    body: [
      "Bangkok Kunsthalle presents Rat Section for a one-night performance joined by Wasawat Somno + Niwit Lertsawaengkit and Medulla Spinalis.",
      "Rat Section is a music and performance project currently based in London that treats choreography, set design, and the specific qualities of each space as integral parts of every show. Their work moves between experimental electronic, pop, spoken word and club music, constructing a mythology that deliberately blurs the line between biography and fiction.",
      "The night focuses on unstable dichotomies, with each performance blurring lines between reality and fiction, mundanity and metaphysical, science and ritual. Across three performances, familiar formats are distorted and transformed.",
    ],
    meta: ["Friday, 14 August 2026 · 7:30 PM – 10:00 PM", "THB 400 online / THB 450 at door"],
    links: [
      { label: "↗ Instagram", href: "https://www.instagram.com/p/Dbam_roj7Nk/" },
      {
        label: "↗ Tickets (Ticketmelon)",
        href: "https://www.ticketmelon.com/th/bangkok-kunsthalle/ratsection",
      },
    ],
  },
  {
    start: "2026-08-21",
    end: "2026-08-23",
    venue: [{ label: "Three Space Tokyo", href: "https://www.instagram.com/threespacetokyo/" }],
    venueSuffix: "Asakusabashi 3-6-6, Taito-ku, Tokyo",
    title: "Sound Performance for SUPPOSE WE COUNTED EVERY EDGE OF THE GRID",
    subtitle: "An exhibition by Timotej Janko",
    body: [
      "Through analogue image-making and spoken word, the project explores how perception gradually becomes memory, and how memory remains unstable, continuously reshapes itself over time. The title proposes an impossible gesture — resisting the constant impulse to search for something new, asking instead what might happen if we gave sustained attention to what already surrounds us.",
      "The exhibition brings together silver gelatin prints and 8mm film shot in Tokyo, accompanied by a live soundtrack composed from intimate monologues recorded during Timotej's travels — transformed into a sound composition in collaboration with Wasawat Somno, who will perform the work live at the opening.",
    ],
    meta: [
      "<strong>Reception &amp; live performance</strong> — Friday, 21 Aug · 18:00–21:00",
      "Live sound: Wasawat Somno (Bangkok) &amp; Naoki Nomoto (Japan)",
      "<strong>Exhibition</strong> — 22–23 Aug · 12:00–20:00",
    ],
    links: [{ label: "↗ Instagram", href: "https://www.instagram.com/p/Dbnw6HmkTnF/" }],
  },
  {
    start: "2026-08-21",
    venue: [{ label: "Midnight East", href: "https://www.instagram.com/midnight_east/" }],
    venueSuffix: "O-EAST 3F, Tokyo",
    title: "Safety Trance / Cardopusher",
    body: [
      "VJ set at Midnight East alongside Cardopusher, NTsKi B2B Romy Mats, MUNÉO B2B Rosa, and no heavenly B2B Yves Misa Ghost. VJ alongside JACKSON kaki.",
    ],
    meta: ["Friday, 21 August 2026 · Open 24:00", "Door ¥3,500 / Adv ¥3,000 / U23 ¥2,000"],
    links: [
      { label: "↗ Instagram", href: "https://www.instagram.com/p/DbvJaAdkqXX/" },
      { label: "↗ RA", href: "https://ra.co/events/2507676" },
      {
        label: "↗ Tickets (Zaiko)",
        href: "https://midnighteast.zaiko.io/e/safety-trance-cardopusher",
      },
    ],
  },
  {
    start: "2026-09-17",
    end: "2026-09-20",
    venue: [
      { label: "@odc.networks", href: "https://www.instagram.com/odc.networks/" },
      { label: "@ldk_roomservice", href: "https://www.instagram.com/ldk_roomservice/" },
    ],
    title: "ODC Conference & ODCf Exhibition",
    body: [
      "Four days split between the ODC conference and the ODCf exhibition, with an audiovisual live coding performance and party on the exhibition's opening night.",
    ],
    meta: [
      "<strong>17–18 Sep</strong> — ODC conference",
      "<strong>19–20 Sep</strong> — ODCf exhibition",
      "<strong>19 Sep</strong> — Sound performance (audiovisual), live coding &amp; party",
    ],
  },
  {
    start: "2026-10-10",
    venue: [{ label: "@vietnam_media_lab", href: "https://www.instagram.com/vietnam_media_lab/" }],
    title: "Show at Vietnam Media Lab",
    body: ["More details coming soon."],
  },
]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `2026-09-17` → `{ y, m, d }` (no Date, so no timezone drift). */
function parts(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  return { y, m, d }
}

/** Human date label: `19–20 Sep 2026`, `21 Aug – 3 Sep 2026`, `14 Aug 2026`. */
export function formatRange(start, end) {
  const a = parts(start)
  const b = parts(end ?? start)
  if (a.y === b.y && a.m === b.m && a.d === b.d) return `${a.d} ${MONTHS[a.m - 1]} ${a.y}`
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m - 1]} ${a.y}`
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${a.y}`
  return `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`
}

/**
 * Today as `YYYY-MM-DD` in Bangkok time — the page is server-rendered, so this
 * is evaluated per request rather than frozen at build time.
 */
export function todayISO(timeZone = "Asia/Bangkok") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/**
 * Split entries into upcoming (soonest first) and archive (most recent first).
 * An entry stays "upcoming" through its final day.
 */
export function splitNews(entries = newsEntries, today = todayISO()) {
  const upcoming = []
  const archive = []
  for (const entry of entries) {
    ;((entry.end ?? entry.start) >= today ? upcoming : archive).push(entry)
  }
  upcoming.sort((a, b) => a.start.localeCompare(b.start))
  archive.sort((a, b) => (b.end ?? b.start).localeCompare(a.end ?? a.start))
  return { upcoming, archive }
}
