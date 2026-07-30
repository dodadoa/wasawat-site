/** @typedef {{ label: string, slug?: string }} ArtItem */
/** @typedef {{ title?: string, items: ArtItem[] }} ArtGroup */
/** @typedef {{ title: string, groups: ArtGroup[] }} ArtSection */

/** @type {ArtSection[]} */
export const artSections = [
  {
    title: "Installations",
    groups: [
      {
        items: [
          {
            label: "Do The NPCs Hear The Simulated Wind",
            slug: "do-the-npcs-hear-the-simulated-wind",
          },
          {
            label:
              "Eternal Gain, Eternal Pain. (Would You Still Love Me If I Was A Digital C. elegans)",
            slug: "eternal-gain-eternal-pain",
          },
          { label: "Here-now; absolute-elsewhere.", slug: "here-now-absolute-elsewhere" },
        ],
      },
    ],
  },
  {
    title: "Performance",
    groups: [
      {
        items: [
          {
            label: "From Scratch Live Coding From Scratch",
            slug: "from-scratch-live-coding",
          },
          {
            label: "Gimme the light, and you shall receive the praise (2025)",
            slug: "gimme-the-light",
          },
          {
            label: "LiveCoding AudioVisual duo with @pasuthh at Unfest2025",
            slug: "unfest2025",
          },
          {
            label: "As if you would still be here, if I keep thinking about you.",
            slug: "as-if-you-would-still-be-here",
          },
          { label: "Self-censored Step Sequencer", slug: "self-censored-step-sequencer" },
          { label: "BYOB", slug: "byob" },
        ],
      },
      {
        title: "VJ",
        items: [
          {
            label:
              "Gallery night performance With Karnpapon (The Black Codes) at Mal studio, and with Nanut at Tentacles Gallery",
          },
          { label: "Bangkok street noise With Karnpapon (The Black Codes)" },
          { label: "DXPRN (as JAAG)" },
          { label: "VJing for Jon Samurai at JAM (as JAAG)" },
          {
            label: "Sonic Thread with Thanapat Ogaslert (CSRCSR) at Tentacles Gallery",
          },
        ],
      },
      {
        title: "Algorave [WrappedByte]",
        items: [
          {
            label:
              "The end is near: a dystopian electronic party. Duo with Thanapat Ogaslert (CSRCSR) at De Commune. Also organize and promote the event.",
          },
          { label: "Sonic thread" },
          { label: "Sonic thread" },
          { label: "Ghost (as JAAG)" },
        ],
      },
      {
        title: "DJ [DJ Kanyoke]",
        items: [
          { label: "Ghost (as JAAG)" },
          { label: "Opening Party for Nanut, This history is auto-generated" },
          { label: "Closing Party for Nanut, This history is auto-generated" },
          {
            label: "Mix, invited guest for Blozxom for Bangkok Community Radio (BCR)",
          },
        ],
      },
    ],
  },
  {
    title: "Collaboration",
    groups: [
      {
        items: [
          { label: "Neonatus/Neotokyo", slug: "neonatus-neotokyo" },
          { label: "Tentacular Teriterria" },
        ],
      },
      {
        title: "Technical Consultant/Assistant/Advisor",
        items: [
          { label: "Nawin Nuthong" },
          { label: "JAM" },
          { label: "Tewprai" },
          { label: "Omer Wasim" },
        ],
      },
    ],
  },
]

/** @type {Record<string, { title: string }>} */
export const artworkPages = {
  "do-the-npcs-hear-the-simulated-wind": { title: "Do The NPCs Hear The Simulated Wind" },
  "neonatus-neotokyo": { title: "Neonatus/Neotokyo" },
  "from-scratch-live-coding": { title: "From Scratch Live Coding From Scratch" },
  "gimme-the-light": { title: "Gimme the light, and you shall receive the praise (2025)" },
  unfest2025: { title: "LiveCoding AudioVisual duo with @pasuthh at Unfest2025" },
  byob: { title: "BYOB" },
  "eternal-gain-eternal-pain": {
    title: "Eternal Gain, Eternal Pain. (Would You Still Love Me If I Was A Digital C. elegans)",
  },
  "here-now-absolute-elsewhere": { title: "Here-now; absolute-elsewhere." },
  "self-censored-step-sequencer": { title: "Self-censored Step Sequencer" },
  "as-if-you-would-still-be-here": {
    title: "As if you would still be here, if I keep thinking about you.",
  },
}
