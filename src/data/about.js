/**
 * About text, shared by /about (about.jsx) and the plain /perma page.
 *
 * `fullBio` paragraphs are rendered as HTML, so inline <strong>/<em> are
 * allowed.
 */

/** The short bio; the first paragraph is the lead. */
export const bio = [
  "Wasawat Somno (1994, Thailand) is an artist working with code, audiovisual/sound performance, and installation. His practice is organized around the act of mapping — holding two planes of context in tension and tracing what passes between them. A computational system and the ethical questions it quietly carries. A simulation and the physical world it stands in for. An interface and the body that encounters it.",
  "His work constructs situations where these double registers become navigable: spaces where narrative bleeds across layers, where expectation bends, and where the logic of a system begins to press against something more speculative. Working across installation, audiovisual/sound performance, and net art, he is drawn to the threshold where the technical and the ethical fold into each other — where a worm's connectome becomes a question about consciousness, where a screen holds more than what it displays.",
  "The work holds a deliberately semi-serious structure — rigorous in its systems, amateur in its posture, sustained by the spirit of DIY.",
]

/** The extended bio. */
export const fullBio = [
  "He also performs and records under the name <strong>WrappedByte</strong> — a live-coding audio/visual project working primarily in TidalCycles and Hydra. As WrappedByte, he has performed across club scenes, art exhibitions, and international live-coding communities, including <em>evals</em> (Bangkok Kunsthalle), <em>Para Cartography</em> (Vietnam Media Lab, Ho Chi Minh City), <em>Ghost2565</em>, <em>NonNonNon Bangkok</em>, <em>Road to Diage</em> and <em>Diage Festival</em>, <em>Algorapture</em> (Jakarta), <em>Interlude</em> (Ho Chi Minh City), and <em>AlgoSeoul</em> (Seoul).",
  "Alongside the solo practice, he is active as an organizer and curator in Bangkok's independent tech-art and experimental electronic music scene. He co-organized <strong>BYOB Bangkok (Bring Your Own Beamer)</strong> with members of JAAG and ZonZon.Studio, supported by Bangkok CityCity Gallery. With his collective <strong>Cornea Cochlear Club</strong>, he organized <em>Cybernaut Party</em> (at Unformat) and <em>Hear/Hex/Halt</em> (at Goethe-Institut Thailand), bringing together artists from New York, Ho Chi Minh City, Yogyakarta, and Seoul. He co-organized and curated <strong>Player 2 Has Entered The Server</strong>, a tech-art initiative in collaboration with Goethe-Institut Thailand, under the group name Stack. He also co-founded <strong>TouchDesigner Bangkok Meetup (TDBKK)</strong>.",
  "He regularly collaborates with other artists. Notable contributions include <em>THE IMMORTALS ARE QUITE BUSY THESE DAYS</em> by Nawin Nuthong, and the algorave collective <strong>WrappedByte [Algorave]</strong> hosting regular events under the name <strong>WrappedByte</strong> at venues including De Commune. He co-founded <strong>Mal Studio</strong> as a studio and event space in Bangkok.",
]

/**
 * Works & activity: sectioned CV-style listing.
 * @typedef {{ label: string, meta?: string, url?: string }} BioItem
 * @typedef {{ title: string, items: BioItem[], footnote?: string }} BioSection
 * @type {BioSection[]}
 */
export const bioSections = [
  {
    title: "Selected Exhibitions",
    items: [
      { label: "re:complex", meta: "Goethe-Institut Thailand, 7–13 November 2025", url: "/art/eternal-gain-eternal-pain" },
      { label: "Close Inspection From Afar", meta: "ETA BKK, organised by Cache, July 2025", url: "/art/here-now-absolute-elsewhere" },
      { label: "Un_Unsubscribe", meta: "pavilion within The Wrong Biennale 2023, curated by Khristina Ots & Roman Solodkov", url: "https://poetic-garden.netlify.app/" },
    ],
  },
  {
    title: "Curatorial Practice & Organizing",
    items: [
      { label: "Stack", meta: "co-curator, ongoing", url: "https://stackth.xyz/" },
      { label: "Cornea Cochlear Club", meta: "co-organizer, curator, ongoing", url: "https://www.instagram.com/corneacochlearclub/" },
      { label: "BYOB Bangkok (Bring Your Own Beamer)", meta: "co-organizer, as JAAG, with ZonZon.Studio, 2023", url: "/art/byob" },
      { label: "TouchDesigner Bangkok Meetup (TDBKK)", meta: "co-organizer, TDBKK vol.1 and TDBKK vol.2, 2025–2026", url: "https://tdbkk.xyz/" },
    ],
  },
  {
    title: "Guest Lectures & Workshops",
    items: [
      { label: "King Mongkut's Institute of Technology Ladkrabang (KMITL)", meta: "Introduction to TouchDesigner, 2025" },
      { label: "Chiang Mai University", meta: "Introduction to Tech-based Art, 2024" },
      { label: "King Mongkut's Institute of Technology Ladkrabang (KMITL)", meta: "Introduction to Tech-based Art: Hydra.js, TouchDesigner, MaxMSP, net.art, 2023" },
    ],
  },
  {
    title: "Press & Interviews",
    items: [
      { label: "Exotic Quixotic", meta: '"DJ CODER" — interview on live coding practice', url: "https://www.youtube.com/watch?v=ANif-L3o-BY" },
      { label: "Thai PBS", meta: "interview", url: "https://www.youtube.com/watch?v=FrC436oCzjM" },
      { label: "Arttrovert", meta: "BYOB with JAAG", url: "https://www.youtube.com/watch?v=YebO_X6QA3w" },
      { label: "Bookshop Library", meta: "Studio visit, Mal Studio / JAAG", url: "https://bookshoplibrary.com/activity/studio-visit-mal-studio/" },
    ],
  },
  {
    title: "Technical Work",
    items: [
      { label: "Tenderness Kit", meta: "web development for Omer Wasim, with Tewprai Bualoi, 2021", url: "/art/tenderness-kit" },
      { label: 'Website for "THE IMMORTALS ARE QUITE BUSY THESE DAYS"', meta: "for Nawin Nuthong, Bangkok CityCity Gallery, 2021", url: "/art/the-immortals-are-quite-busy-these-days" },
      { label: "I will always think of you fondly.", meta: "with Tewprai Bualoi, BACC, 2019", url: "/art/i-will-always-think-of-you-fondly" },
      { label: "Website for Stack", meta: "web development for Stack, 2026", url: "/art/website-for-stack" },
      { label: "Website for TDBKK", meta: "web development for TouchDesigner Bangkok Meetup, 2026", url: "/art/website-for-tdbkk" },
    ],
  },
]
