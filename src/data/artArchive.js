/** @typedef {{ label: string, slug?: string }} ArtItem */
/** @typedef {{ title?: string, items: ArtItem[] }} ArtGroup */
/** @typedef {{ title: string, groups: ArtGroup[] }} ArtSection */

/** @type {ArtSection[]} */
export const artSections = [
  {
    title: "Artwork",
    groups: [
      {
        title: "Installation",
        items: [
          {
            label:
              "Eternal Gain, Eternal Pain. (Would You Still Love Me If I Was A Digital C. elegans)",
            slug: "eternal-gain-eternal-pain",
          },
          { label: "Here-now; absolute-elsewhere.", slug: "here-now-absolute-elsewhere" },
        ],
      },
      {
        title: "Netart",
        items: [
          { label: "Self-censored Step Sequencer", slug: "self-censored-step-sequencer" },
          {
            label: "Poetic Garden",
            slug: "poetic-garden",
            unlisted: true,
            date: "2023-01-01",
            image: "/images/poetic-garden/poetic-garden-capture.jpg",
          },
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
            label: "Do The NPCs Hear The Simulated Wind",
            slug: "do-the-npcs-hear-the-simulated-wind",
          },
          {
            label: "Gimme the light, and you shall receive the praise",
            slug: "gimme-the-light",
            image: "/images/las-vegas-sphere.jpg",
          },
          {
            label: "LiveCoding AudioVisual duo with @pasuthh at Unfest2025",
            slug: "unfest2025",
            date: "2025-01-01",
          },
          {
            label: "As if you would still be here, if I keep thinking about you.",
            slug: "as-if-you-would-still-be-here",
            date: "2026-01-01",
          },
          {
            label: "OperationSéance: Purifying the AI Spirits in Latent Space Salon",
            slug: "operation-seance",
            date: "2026-01-01",
          },
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
          { label: "VJing for Jon Samurai at JAM (as JAAG)", hidden: true },
          {
            label: "Sonic Thread with Thanapat Ogaslert (CSRCSR) at Tentacles Gallery",
            hidden: true,
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
          { label: "Sonic thread", hidden: true },
          { label: "Sonic thread", hidden: true },
          { label: "Ghost (as JAAG)", hidden: true },
        ],
      },
      {
        title: "DJ [DJ Kanyoke]",
        items: [
          { label: "Ghost (as JAAG)", hidden: true },
          { label: "Opening Party for Nanut, This history is auto-generated", hidden: true },
          { label: "Closing Party for Nanut, This history is auto-generated", hidden: true },
          {
            label: "Mix, invited guest for Blozxom for Bangkok Community Radio (BCR)",
            hidden: true,
          },
        ],
      },
    ],
  },
  {
    title: "Collaboration",
    groups: [
      {
        title: "Printing",
        items: [
          { label: "Neonatus/Neotokyo", slug: "neonatus-neotokyo", commissioner: "Nanut Thanapornrapee" },
        ],
      },
      {
        title: "Installation",
        items: [
          { label: "Tentacular Territoria", slug: "tentacular-territoria", date: "2020-01-01", commissioner: "Humanist.us" },
        ],
      },
      {
        title: "Event/Installation",
        items: [
          { label: "BYOB (as JAAG)", slug: "byob", date: "2023-01-01", image: "/images/byob/byob-1.jpg", commissioner: "JAAG & ZonZon.Studio" },
        ],
      },
    ],
  },
  {
    title: "Technical Work",
    groups: [
      {
        title: "Technical Consultant/Assistant/Advisor",
        items: [
          {
            label: "The Immortals Are Quite Busy These Days",
            slug: "the-immortals-are-quite-busy-these-days",
            date: "2021-01-01",
            commissioner: "Nawin Nuthong",
          },
          {
            label: "Tenderness Kit",
            slug: "tenderness-kit",
            date: "2021-01-01",
            commissioner: "Omer Wasim",
          },
          {
            label: "I will always think of you fondly. (with Tewprai Bualoi)",
            slug: "i-will-always-think-of-you-fondly",
            date: "2019-01-01",
            image: "/images/i-will-always-think-of-you-fondly/05-qr-codes.jpg",
            commissioner: "Tewprai Bualoi",
          },
          {
            label: "Website for Stack",
            slug: "website-for-stack",
            date: "2026-01-01",
            image: "/images/website-for-stack.jpg",
            commissioner: "Stack",
          },
          {
            label: "Website for TDBKK",
            slug: "website-for-tdbkk",
            date: "2026-01-01",
            image: "/images/website-for-tdbkk.jpg",
            commissioner: "TouchDesigner Bangkok Meetup",
          },
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
  "gimme-the-light": { title: "Gimme the light, and you shall receive the praise" },
  unfest2025: { title: "LiveCoding AudioVisual duo with @pasuthh at Unfest2025" },
  byob: { title: "BYOB (as JAAG)" },
  "eternal-gain-eternal-pain": {
    title: "Eternal Gain, Eternal Pain. (Would You Still Love Me If I Was A Digital C. elegans)",
  },
  "here-now-absolute-elsewhere": { title: "Here-now; absolute-elsewhere." },
  "self-censored-step-sequencer": { title: "Self-censored Step Sequencer" },
  "as-if-you-would-still-be-here": {
    title: "As if you would still be here, if I keep thinking about you.",
  },
  "tentacular-territoria": { title: "Tentacular Territoria" },
  "i-will-always-think-of-you-fondly": {
    title: "I will always think of you fondly. (with Tewprai Bualoi)",
  },
  "operation-seance": {
    title: "OperationSéance: Purifying the AI Spirits in Latent Space Salon",
  },
  "the-immortals-are-quite-busy-these-days": {
    title: "The Immortals Are Quite Busy These Days",
  },
  "tenderness-kit": { title: "Tenderness Kit" },
  "website-for-stack": { title: "Website for Stack" },
  "website-for-tdbkk": { title: "Website for TDBKK" },
  "poetic-garden": { title: "Poetic Garden" },
}
