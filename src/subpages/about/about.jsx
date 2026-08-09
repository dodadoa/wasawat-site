import { useState } from "react"

const WORDS = [
  "computational system", "ethical questions",
  "simulation", "physical world",
  "interface", "the body",
  "worm's connectome", "consciousness",
  "screen", "what it displays",
  "code", "material",
]

// ── One combined 2D plan drawing ──────────────────────────────────────
// Mash-up of three references: apartment plan with poché walls, furniture
// and a stair/elevator core; CAD sheet with grid bubbles, axis lines and a
// radial fan; 1984 hand-drawn commercial complex with named rooms, sq-m
// figures, covered walkways, arrows and trees.

const W = 1000
const H = 700
const mono = "'JetBrains Mono', monospace"

// thick poché wall segment
const Wl = ({ x1, y1, x2, y2, w = 2.4, o = 0.85 }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={w} opacity={o} />
)
// thin drawing line
const Ln = ({ x1, y1, x2, y2, w = 0.7, o = 0.5, dash }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={w} opacity={o} strokeDasharray={dash} />
)

// door: gap punched in wall + swing arc
function Door({ x, y, r = 16, rot = 0 }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <rect x={x - 2} y={y - r} width={4} height={r} fill="var(--bg, #fff)" />
      <line x1={x} y1={y} x2={x} y2={y - r} stroke="currentColor" strokeWidth={0.8} opacity={0.6} />
      <path d={`M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x + r} ${y}`} fill="none" stroke="currentColor" strokeWidth={0.5} opacity={0.4} />
    </g>
  )
}

function TileGrid({ x, y, w, h, cell = 8 }) {
  const v = []
  for (let gx = x + cell; gx < x + w; gx += cell) v.push(<line key={`v${gx}`} x1={gx} y1={y} x2={gx} y2={y + h} />)
  for (let gy = y + cell; gy < y + h; gy += cell) v.push(<line key={`h${gy}`} x1={x} y1={gy} x2={x + w} y2={gy} />)
  return <g stroke="currentColor" strokeWidth={0.35} opacity={0.3}>{v}</g>
}

function Bed({ x, y, w, h }) {
  return (
    <g stroke="currentColor" fill="none" strokeWidth={0.8} opacity={0.55}>
      <rect x={x} y={y} width={w} height={h} />
      <rect x={x + 3} y={y + 3} width={w * 0.28} height={h - 6} />
      <path d={`M ${x + w * 0.4} ${y} L ${x + w} ${y + h * 0.55} M ${x + w * 0.4} ${y + h} L ${x + w} ${y + h * 0.45}`} strokeWidth={0.5} opacity={0.6} />
    </g>
  )
}

function Sofa({ x, y, w, h }) {
  const n = Math.max(2, Math.round(w / 22))
  return (
    <g stroke="currentColor" fill="none" strokeWidth={0.8} opacity={0.55}>
      <rect x={x} y={y} width={w} height={h} rx={3} />
      {Array.from({ length: n - 1 }, (_, i) => (
        <line key={i} x1={x + ((i + 1) * w) / n} y1={y} x2={x + ((i + 1) * w) / n} y2={y + h} strokeWidth={0.5} />
      ))}
      <rect x={x - 4} y={y - 4} width={w + 8} height={6} rx={2} strokeWidth={0.5} />
    </g>
  )
}

function DiningSet({ cx, cy, r = 14 }) {
  const chairs = [[0, -r - 8], [0, r + 8], [-r - 8, 0], [r + 8, 0]]
  return (
    <g stroke="currentColor" fill="none" strokeWidth={0.7} opacity={0.55}>
      <circle cx={cx} cy={cy} r={r} />
      {chairs.map(([dx, dy], i) => (
        <rect key={i} x={cx + dx - 5} y={cy + dy - 5} width={10} height={10} strokeWidth={0.5} />
      ))}
    </g>
  )
}

function Wardrobe({ x, y, w, h }) {
  const n = Math.max(3, Math.round(w / 9))
  return (
    <g stroke="currentColor" fill="none" strokeWidth={0.7} opacity={0.5}>
      <rect x={x} y={y} width={w} height={h} />
      {Array.from({ length: n }, (_, i) => {
        const gx = x + ((i + 0.5) * w) / n
        return <line key={i} x1={gx} y1={y + 2} x2={gx + 4} y2={y + h - 2} strokeWidth={0.45} />
      })}
    </g>
  )
}

function Fixture({ cx, cy, r = 9 }) {
  return (
    <g stroke="currentColor" fill="none" strokeWidth={0.7} opacity={0.5}>
      <circle cx={cx} cy={cy} r={r} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} strokeWidth={0.4} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} strokeWidth={0.4} />
    </g>
  )
}

function Stove({ x, y }) {
  return (
    <g stroke="currentColor" fill="none" strokeWidth={0.6} opacity={0.55}>
      <rect x={x} y={y} width={20} height={14} />
      {[[5, 4], [15, 4], [5, 10], [15, 10]].map(([dx, dy], i) => (
        <circle key={i} cx={x + dx} cy={y + dy} r={2.4} />
      ))}
    </g>
  )
}

function Elevator({ x, y, w, h }) {
  return (
    <g stroke="currentColor" fill="none" opacity={0.8}>
      <rect x={x} y={y} width={w} height={h} strokeWidth={1.4} />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} strokeWidth={0.8} />
      <line x1={x + 4} y1={y + 4} x2={x + w - 4} y2={y + h - 4} strokeWidth={0.7} />
      <line x1={x + w - 4} y1={y + 4} x2={x + 4} y2={y + h - 4} strokeWidth={0.7} />
    </g>
  )
}

function Stairs({ x, y, w, h, treads = 9 }) {
  return (
    <g stroke="currentColor" fill="none" opacity={0.6}>
      <rect x={x} y={y} width={w} height={h} strokeWidth={0.9} />
      {Array.from({ length: treads }, (_, i) => {
        const gx = x + ((i + 1) * w) / (treads + 1)
        return <line key={i} x1={gx} y1={y} x2={gx} y2={y + h} strokeWidth={0.55} />
      })}
      <line x1={x} y1={y + h / 2} x2={x + w - 8} y2={y + h / 2} strokeWidth={0.5} />
      <path d={`M ${x + w - 14} ${y + h / 2 - 4} L ${x + w - 8} ${y + h / 2} L ${x + w - 14} ${y + h / 2 + 4}`} strokeWidth={0.5} />
      {/* break line */}
      <path d={`M ${x + w * 0.55} ${y - 3} l 6 ${h * 0.4} l -8 ${h * 0.25} l 6 ${h * 0.4}`} strokeWidth={0.7} />
    </g>
  )
}

function Tree({ cx, cy, r }) {
  return (
    <g stroke="currentColor" fill="none" opacity={0.35}>
      <circle cx={cx} cy={cy} r={r} strokeWidth={0.6} strokeDasharray="3 2.5" />
      <path d={`M ${cx - r * 0.5} ${cy} a ${r * 0.5} ${r * 0.5} 0 0 1 ${r} 0`} strokeWidth={0.4} />
      <path d={`M ${cx - r * 0.3} ${cy + r * 0.3} a ${r * 0.4} ${r * 0.4} 0 0 1 ${r * 0.6} -0.1`} strokeWidth={0.4} />
      <circle cx={cx} cy={cy} r={1.4} fill="currentColor" stroke="none" />
    </g>
  )
}

function WalkArrow({ x, y, rot = 0 }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`} stroke="currentColor" fill="none" strokeWidth={1.6} opacity={0.6}>
      <line x1={x} y1={y - 9} x2={x} y2={y + 7} />
      <path d={`M ${x - 5} ${y + 1} L ${x} ${y + 8} L ${x + 5} ${y + 1}`} />
    </g>
  )
}

function GridBubble({ x, y, label, axis }) {
  return (
    <g opacity={0.5}>
      {axis === "v"
        ? <Ln x1={x} y1={40} x2={x} y2={y - 9} w={0.4} o={0.35} dash="6 4" />
        : <Ln x1={x + 9} y1={y} x2={W - 40} y2={y} w={0.4} o={0.35} dash="6 4" />}
      <circle cx={x} cy={y} r={9} fill="none" stroke="currentColor" strokeWidth={0.8} />
      <text x={x} y={y + 3} textAnchor="middle" fill="currentColor" style={{ fontFamily: mono, fontSize: "8px" }}>
        {label}
      </text>
    </g>
  )
}

// named room: hoverable fill; info shows in the external tooltip
function NamedRoom({ x, y, w, h, idx, label, active, setActive, rot = 0 }) {
  const on = active?.idx === idx
  return (
    <g
      transform={rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined}
      onMouseEnter={() =>
        setActive({
          idx,
          label,
          area: `${Math.round((w * h) / 100)} sqm (${Math.round((w * h) / 9.29)} sq ft)`,
        })
      }
      onMouseLeave={() => setActive(null)}
      style={{ cursor: "crosshair" }}
    >
      <rect x={x} y={y} width={w} height={h} fill="currentColor" opacity={on ? 0.09 : 0.015} />
    </g>
  )
}

function CombinedPlan() {
  const [active, setActive] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  return (
    <div
      style={{ position: "relative", width: "min(80%, 680px)", margin: "0 auto", color: "var(--text, #000)" }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            left: pos.x + 18,
            top: pos.y - 14,
            zIndex: 10,
            pointerEvents: "none",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--bg, #fff) 60%, transparent), color-mix(in srgb, var(--bg, #fff) 85%, transparent))",
            backdropFilter: "blur(14px) saturate(1.6)",
            WebkitBackdropFilter: "blur(14px) saturate(1.6)",
            borderRadius: "14px",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -8px 18px rgba(255,255,255,0.25)",
            padding: "10px 22px 11px",
            whiteSpace: "nowrap",
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: "8px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.45,
              marginBottom: "1px",
              lineHeight: 1.1,
            }}
          >
            room {String(active.idx + 1).padStart(2, "0")}
          </div>
          <div style={{ fontFamily: mono, fontSize: "13px", fontStyle: "italic", letterSpacing: "0.03em", lineHeight: 1.1 }}>
            {active.label}
          </div>
          <div style={{ fontFamily: mono, fontSize: "9px", opacity: 0.5, marginTop: "2px", letterSpacing: "0.08em", lineHeight: 1.1 }}>
            {active.area}
          </div>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>

        {/* ── central lobby: gray like ref 1 ── */}
        <polygon points="420,210 580,210 640,266 660,290 340,290 360,266" fill="currentColor" opacity={0.06} />
        <polygon points="430,90 570,90 570,210 430,210" fill="currentColor" opacity={0.04} />

        {/* ── core: stair + elevator ── */}
        <Stairs x={438} y={64} w={124} h={30} />
        <Elevator x={462} y={112} w={76} h={64} />
        <Wl x1={430} y1={58} x2={430} y2={210} />
        <Wl x1={570} y1={58} x2={570} y2={210} />
        <Wl x1={430} y1={58} x2={570} y2={58} />

        {/* ── upper-left apartment ── */}
        <Wl x1={60} y1={60} x2={430} y2={60} />
        <Wl x1={60} y1={60} x2={60} y2={290} />
        <Wl x1={60} y1={290} x2={340} y2={290} />
        {/* internal walls */}
        <Wl x1={205} y1={60} x2={205} y2={175} w={1.6} />
        <Wl x1={330} y1={60} x2={330} y2={175} w={1.6} />
        <Wl x1={60} y1={175} x2={430} y2={175} w={1.6} />
        <Door x={205} y={130} rot={90} />
        <Door x={330} y={100} rot={90} />
        <Door x={150} y={175} />
        <Door x={290} y={175} />
        {/* furniture */}
        <Bed x={75} y={78} w={78} h={54} />
        <Sofa x={222} y={78} w={62} h={16} />
        <DiningSet cx={262} cy={135} />
        <TileGrid x={332} y={62} w={96} h={111} cell={9} />
        <Fixture cx={382} cy={92} />
        <Stove x={344} y={140} />
        <Wardrobe x={70} y={190} w={80} h={16} />
        <NamedRoom x={62} y={62} w={141} h={111} idx={0} label={WORDS[0]} active={active} setActive={setActive} />
        <NamedRoom x={207} y={62} w={121} h={111} idx={1} label={WORDS[1]} active={active} setActive={setActive} />
        <NamedRoom x={62} y={177} w={276} h={111} idx={2} label={WORDS[2]} active={active} setActive={setActive} />

        {/* ── upper-right apartment (mirror) ── */}
        <Wl x1={570} y1={60} x2={940} y2={60} />
        <Wl x1={940} y1={60} x2={940} y2={290} />
        <Wl x1={660} y1={290} x2={940} y2={290} />
        <Wl x1={795} y1={60} x2={795} y2={175} w={1.6} />
        <Wl x1={670} y1={60} x2={670} y2={175} w={1.6} />
        <Wl x1={570} y1={175} x2={940} y2={175} w={1.6} />
        <Door x={795} y={130} rot={90} />
        <Door x={670} y={100} rot={90} />
        <Door x={850} y={175} />
        <Door x={710} y={175} />
        <Bed x={848} y={78} w={78} h={54} />
        <Sofa x={716} y={78} w={62} h={16} />
        <DiningSet cx={738} cy={135} />
        <TileGrid x={572} y={62} w={96} h={111} cell={9} />
        <Fixture cx={618} cy={92} />
        <Stove x={636} y={140} />
        <Wardrobe x={850} y={190} w={80} h={16} />
        <NamedRoom x={797} y={62} w={141} h={111} idx={3} label={WORDS[3]} active={active} setActive={setActive} />
        <NamedRoom x={672} y={62} w={121} h={111} idx={4} label={WORDS[4]} active={active} setActive={setActive} />
        <NamedRoom x={662} y={177} w={276} h={111} idx={5} label={WORDS[5]} active={active} setActive={setActive} />

        {/* ── covered walkways with arrows, ref 3 ── */}
        <Ln x1={340} y1={290} x2={250} y2={370} w={1} o={0.5} />
        <Ln x1={360} y1={310} x2={278} y2={384} w={1} o={0.5} />
        <text x={276} y={330} fill="currentColor" opacity={0.45} transform="rotate(-40 276 330)" style={{ fontFamily: mono, fontSize: "7.5px", letterSpacing: "1px" }}>covered walkway</text>
        <WalkArrow x={318} y={330} rot={50} />
        <Ln x1={660} y1={290} x2={750} y2={370} w={1} o={0.5} />
        <Ln x1={640} y1={310} x2={722} y2={384} w={1} o={0.5} />
        <text x={678} y={352} fill="currentColor" opacity={0.45} transform="rotate(40 678 352)" style={{ fontFamily: mono, fontSize: "7.5px", letterSpacing: "1px" }}>covered walkway</text>
        <WalkArrow x={682} y={330} rot={-50} />

        {/* courtyard trees */}
        <Tree cx={468} cy={352} r={26} />
        <Tree cx={532} cy={378} r={19} />
        <Tree cx={432} cy={402} r={14} />

        {/* ── lower-left angled wing, ref 3 ── */}
        <g transform="rotate(-12 200 480)">
          <Wl x1={70} y1={390} x2={330} y2={390} />
          <Wl x1={70} y1={390} x2={70} y2={560} />
          <Wl x1={70} y1={560} x2={330} y2={560} />
          <Wl x1={330} y1={390} x2={330} y2={560} />
          <Wl x1={200} y1={390} x2={200} y2={560} w={1.6} />
          <Wl x1={70} y1={480} x2={200} y2={480} w={1.6} />
          <Door x={200} y={440} rot={90} />
          <Door x={140} y={480} />
          <Sofa x={220} y={410} w={58} h={15} />
          <Wardrobe x={80} y={532} w={70} h={14} />
          <NamedRoom x={72} y={392} w={126} h={86} idx={6} label={WORDS[6]} active={active} setActive={setActive} />
          <NamedRoom x={72} y={482} w={126} h={76} idx={7} label={WORDS[7]} active={active} setActive={setActive} />
          <NamedRoom x={202} y={392} w={126} h={166} idx={8} label={WORDS[8]} active={active} setActive={setActive} />
        </g>

        {/* ── lower-right angled wing ── */}
        <g transform="rotate(10 790 480)">
          <Wl x1={660} y1={400} x2={930} y2={400} />
          <Wl x1={660} y1={400} x2={660} y2={560} />
          <Wl x1={660} y1={560} x2={930} y2={560} />
          <Wl x1={930} y1={400} x2={930} y2={560} />
          <Wl x1={800} y1={400} x2={800} y2={560} w={1.6} />
          <Wl x1={800} y1={475} x2={930} y2={475} w={1.6} />
          <Door x={800} y={445} rot={90} />
          <Door x={860} y={475} />
          <TileGrid x={662} y={402} w={70} h={70} cell={8} />
          <Fixture cx={697} cy={437} />
          <Bed x={815} y={415} w={66} h={44} />
          <NamedRoom x={662} y={402} w={136} h={156} idx={9} label={WORDS[9]} active={active} setActive={setActive} />
          <NamedRoom x={802} y={402} w={126} h={71} idx={10} label={WORDS[10]} active={active} setActive={setActive} />
          <NamedRoom x={802} y={477} w={126} h={81} idx={11} label={WORDS[11]} active={active} setActive={setActive} />
        </g>

        {/* ── radial fan, ref 2 ── */}
        <g stroke="currentColor" fill="none" opacity={0.4}>
          {Array.from({ length: 17 }, (_, i) => {
            const a = Math.PI + (i * Math.PI) / 16
            const x2 = 500 + Math.cos(a) * 150
            const y2 = 655 + Math.sin(a) * 150
            return <line key={i} x1={500} y1={655} x2={x2} y2={y2} strokeWidth={0.45} />
          })}
          <path d="M 350 655 A 150 150 0 0 1 650 655" strokeWidth={0.8} />
          <path d="M 400 655 A 100 100 0 0 1 600 655" strokeWidth={0.6} />
          <path d="M 450 655 A 50 50 0 0 1 550 655" strokeWidth={0.6} />
        </g>
        <Stairs x={455} y={568} w={90} h={22} treads={11} />

        {/* ── grid bubbles + axis lines, ref 2 ── */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => (
          <GridBubble key={n} x={95 + i * 116} y={682} label={String(n)} axis="v" />
        ))}
        {["A", "B", "C", "D", "E"].map((c, i) => (
          <GridBubble key={c} x={26} y={80 + i * 130} label={c} axis="h" />
        ))}

        {/* dimension ticks along top */}
        <g opacity={0.4}>
          <Ln x1={60} y1={34} x2={940} y2={34} w={0.5} />
          {[60, 205, 330, 430, 570, 670, 795, 940].map((x) => (
            <g key={x}>
              <Ln x1={x} y1={30} x2={x} y2={38} w={0.6} />
              <Ln x1={x - 3} y1={37} x2={x + 3} y2={31} w={0.6} />
            </g>
          ))}
        </g>

        {/* north arrow */}
        <g transform="translate(952 330)" stroke="currentColor" fill="none" opacity={0.5}>
          <circle cx={0} cy={0} r={13} strokeWidth={0.7} />
          <path d="M 0 9 L 0 -9 M -4 -3 L 0 -9 L 4 -3" strokeWidth={0.8} />
          <text x={0} y={24} textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: mono, fontSize: "7px" }}>N</text>
        </g>

      </svg>
      <p
        style={{ textAlign: "right", marginTop: "0.6rem", fontSize: "10px", opacity: 0.5, color: "var(--text-dim)" }}
      >
        first floor plan — commercial complex — scale 1:100 — ws.2026
      </p>
    </div>
  )
}

// ── Full bio content ──────────────────────────────────────────────────

function FullBio() {
  return (
    <div className="space-y-3" style={{ fontSize: "13px", lineHeight: 1.65 }}>
      <p>
        He also performs and records under the name <strong>WrappedByte</strong> — a live-coding
        audio/visual project working primarily in TidalCycles and Hydra. As WrappedByte, he has
        performed across club scenes, art exhibitions, and international live-coding communities,
        including <em>evals</em> (Bangkok Kunsthalle), <em>Para Cartography</em> (Vietnam Media Lab,
        Ho Chi Minh City), <em>Ghost2565</em>, <em>NonNonNon Bangkok</em>, <em>Road to Diage</em>{" "}
        and <em>Diage Festival</em>, <em>Algorapture</em> (Jakarta), <em>Interlude</em> (Ho Chi Minh
        City), and <em>AlgoSeoul</em> (Seoul).
      </p>
      <p>
        Alongside the solo practice, he is active as an organizer and curator in Bangkok's independent
        tech-art and experimental electronic music scene. He co-organized{" "}
        <strong>BYOB Bangkok (Bring Your Own Beamer)</strong> with members of JAAG and ZonZon.Studio,
        supported by Bangkok CityCity Gallery. With his collective{" "}
        <strong>Cornea Cochlear Club</strong>, he organized <em>Cybernaut Party</em> (at Unformat) and{" "}
        <em>Hear/Hex/Halt</em> (at Goethe-Institut Thailand), bringing together artists from New York,
        Ho Chi Minh City, Yogyakarta, and Seoul. He co-organized and curated{" "}
        <strong>Player 2 Has Entered The Server</strong>, a tech-art initiative in collaboration with
        Goethe-Institut Thailand, under the group name Stack. He also co-founded{" "}
        <strong>TouchDesigner Bangkok Meetup (TDBKK)</strong>.
      </p>
      <p>
        He regularly collaborates with other artists. Notable contributions include{" "}
        <em>THE IMMORTALS ARE QUITE BUSY THESE DAYS</em> by Nawin Nuthong, and the algorave collective{" "}
        <strong>WrappedByte [Algorave]</strong> hosting regular events under the name{" "}
        <strong>WrappedByte</strong> at venues including De Commune. He co-founded{" "}
        <strong>Mal Studio</strong> as a studio and event space in Bangkok.
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

const About = () => {
  const [showFull, setShowFull] = useState(false)
  const [showPlan, setShowPlan] = useState(true)

  return (
    <div
      className="relative z-10 font-mono w-full mt-16 pb-16"
      style={{ color: "var(--text-body)", fontSize: "14px", lineHeight: 1.5 }}
    >
      <div className="px-8 lg:w-4/5 max-w-3xl font-thin space-y-3 mb-6">
        <p className="uppercase text-[13px] tracking-widest mb-5 font-normal" style={{ color: "var(--text-muted)" }}>
          ~Artist
        </p>
        <p>
          Wasawat Somno (1994, Thailand) is an artist working with code, audiovisual/sound performance,
          and installation. His practice is organized around the act of mapping — holding two planes of
          context in tension and tracing what passes between them. A computational system and the ethical
          questions it quietly carries. A simulation and the physical world it stands in for. An interface
          and the body that encounters it.
        </p>
        <p>
          His work constructs situations where these double registers become navigable: spaces where narrative
          bleeds across layers, where expectation bends, and where the logic of a system begins to press
          against something more speculative. Working across installation, audiovisual/sound performance, and
          net art, he is drawn to the threshold where the technical and the ethical fold into each other —
          where a worm's connectome becomes a question about consciousness, where a screen holds more than
          what it displays.
        </p>
        <p>
          The work holds a deliberately semi-serious structure — rigorous in its systems, amateur in its
          posture, sustained by the spirit of DIY.
        </p>

        {/* toggle */}
        <button
          onClick={() => setShowFull(v => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5em",
            fontFamily: "'DepartureMono', monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            background: "none",
            border: "none",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "0.25em 0",
            cursor: "pointer",
            marginTop: "0.5rem",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <span style={{ display: "inline-block", transition: "transform 0.2s", transform: showFull ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
          <span>{showFull ? "collapse" : "extended bio"}</span>
        </button>

        {/* expanded content */}
        {showFull && (
          <div
            style={{
              borderLeft: "1px solid var(--border-subtle)",
              paddingLeft: "1.2rem",
              marginTop: "0.5rem",
            }}
          >
            <FullBio />
          </div>
        )}
      </div>

      {/* floor plan toggle */}
      <div style={{ width: "100%", borderTop: "1px solid var(--border-subtle)", marginTop: "1rem" }}>
        <div className="px-8 lg:w-4/5 max-w-3xl" style={{ paddingTop: "1rem", paddingBottom: showPlan ? "0" : "1rem" }}>
          <button
            onClick={() => setShowPlan(v => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5em",
              fontFamily: "'DepartureMono', monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              borderBottom: "1px solid var(--border-subtle)",
              padding: "0.25em 0",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <span style={{ display: "inline-block", transition: "transform 0.2s", transform: showPlan ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
            <span>{showPlan ? "close plan" : "floor plan"}</span>
          </button>
        </div>
        {showPlan && (
          <CombinedPlan />
        )}
      </div>

      <div className="px-8 lg:w-4/5 max-w-3xl mt-10">
        <a
          className="hover:font-bold block"
          target="_blank"
          rel="noopener noreferrer"
          href="https://shrouded-runner-ae1.notion.site/Wasawat-Somno-dc377ed5daf94a79a57575adc00331bf?pvs=4"
        >
          <span className="underline uppercase text-[13px] tracking-widest" style={{ color: "var(--text-muted)" }}>
            /More about me/
          </span>
        </a>
      </div>
    </div>
  )
}

export default About
