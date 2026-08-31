const INSTAGRAM_NAMES: Record<string, string> = {
  // Venues & organisations
  "stack_xyz": "STACK",
  "team_stimulant": "Team Stimulant",
  "thaifilmarchive": "Thai Film Archive",
  "tentaclesgallery": "Tentacles Gallery",
  "internetarchive": "Internet Archive",
  "goetheinstitut.thailand": "Goethe-Institut Thailand",
  "bangkok_kunsthalle": "Bangkok Kunsthalle",
  "synap.home.lab": "SYNAP",
  "corneacochlearclub": "Cornea Cochlear Club",
  "unformatstudio": "Unformat Studio",
  "vietnam_media_lab": "Vietnam Media Lab",
  "rmitvnscd": "RMIT Vietnam",
  "unfest26": "Unfest",
  "bartemp.bkk": "Bar Temp",
  "korborvor_visual_label": "Korborvor Visual Label",
  // People
  "renickbell": "Renick Bell",
  "jodeyiam": "Jo Ngo",
  "wrappedbyte": "WrappedByte",
  "karnpapon": "Anu",
  "pasuthh": "Pasuth Sa-ingthong",
  "puttisinn": "Puttisinn",
  "puttisinc": "Puttisinn",
  "nawinnuthong": "Nawin Nuthong",
  "pin_natthamon": "Pin Natthamon",
  "varut_o": "Varut",
  "putpat13o": "putpat13o",
  "uuunbbb": "uuunbbb",
  "poc9.s": "poc9.s",
  "sthienwiwat": "sthienwiwat",
  "frameofchaos": "frameofchaos",
  "alcoholidaysss": "Pathompong Manakitsomboon",
  "toeeyt": "toeeyt",
  "msyves": "msyves",
  "roma_or_am_i": "Roman Solodkov",
  "nomonument": "Nuttapon Sawasdee",
  "nowheredweller": "Thanapat Ogaslert",
  "nanut.t": "nanut.t",
  "gracenaholic": "gracenaholic",
  "nonnonnon_bangkok": "nonnonnon",
  "maehappyair": "maehappyair",
  "krung_khet": "krung_khet",
  "skykys._": "Sippapas Thienwiwat",
  "pxwxriz": "pxwxriz",
  "lebactan": "lebactan",
  "pipechch": "pipechch",
  "kobored": "kobored",
  "anv_50hz": "anv_50hz",
  "kijjaz": "kijjaz",
  "pppppppeeeeeeaaaaarrrryyype": "pppppppeeeeeeaaaaarrrryyype",
};

export function linkInstagramMentions(text: string): string {
  const mentionPattern = /@([\w._-]+)/g;

  return text.replace(mentionPattern, (match, username) => {
    const instagramUrl = `https://www.instagram.com/${username}/`;
    const displayName = INSTAGRAM_NAMES[username] ?? match;
    return `<a href="${instagramUrl}" target="_blank" rel="noopener noreferrer" data-ig="@${username}" class="ig-mention font-bold hover:underline" style="color: var(--text-muted);">${displayName}</a>`;
  });
}
