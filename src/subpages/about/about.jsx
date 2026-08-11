import { useState } from "react"

// ── Panopticon plan drawing ─────────────────────────────────────────────
// Circular cell block: central inspection tower with radiating sightlines,
// a catwalk ring, and a perimeter ring of 9 cells — practice areas mapped
// onto Bentham's panopticon, redrawn as a CAD sheet.

const W = 1000
const H = 700
const mono = "'JetBrains Mono', monospace"
const CX = 500
const CY = 360
const R_TOWER = 68
const R_CATWALK = 102
const R_CELL_IN = 112
const R_CELL_OUT = 252
const N_CELLS = 9

const WORDS = [
  "bio simulation",
  "speculative ethic",
  "speculative politic",
  "investigative fiction",
  "fashion design",
  "product design",
  "speculative biograph",
  "audiovisual",
  "interface design",
]

// thick poché wall
const Wl = ({ x1, y1, x2, y2, w = 2.4, o = 0.85 }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={w} opacity={o} />
)
// thin drawing line
const Ln = ({ x1, y1, x2, y2, w = 0.7, o = 0.5, dash }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={w} opacity={o} strokeDasharray={dash} />
)

const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]

function sectorPath(cx, cy, rIn, rOut, a0, a1) {
  const [x1, y1] = pol(cx, cy, rOut, a0)
  const [x2, y2] = pol(cx, cy, rOut, a1)
  const [x3, y3] = pol(cx, cy, rIn, a1)
  const [x4, y4] = pol(cx, cy, rIn, a0)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${large} 0 ${x4} ${y4} Z`
}

function CellDoor({ am, r = R_CELL_IN }) {
  const [x, y] = pol(CX, CY, r, am)
  const rot = (am * 180) / Math.PI + 90
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <rect x={x - 2} y={y - 14} width={4} height={14} fill="var(--bg, #fff)" />
      <line x1={x} y1={y} x2={x} y2={y - 14} stroke="currentColor" strokeWidth={0.8} opacity={0.6} />
      <path d={`M ${x} ${y - 14} A 14 14 0 0 1 ${x + 14} ${y}`} fill="none" stroke="currentColor" strokeWidth={0.5} opacity={0.4} />
    </g>
  )
}

function CellFittings({ am, rMid }) {
  const [cx, cy] = pol(CX, CY, rMid, am)
  const rot = (am * 180) / Math.PI + 90
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`} stroke="currentColor" fill="none" opacity={0.5}>
      <rect x={cx - 20} y={cy - 7} width={40} height={14} strokeWidth={0.6} />
      <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} strokeWidth={0.35} />
      <circle cx={cx} cy={cy + 20} r={5} strokeWidth={0.5} />
    </g>
  )
}

// HUD-style leader: dot on cell centroid → past ring → elbow → uppercase label
function Cell({ idx, a0, a1, label, hovered, onHover }) {
  const am = (a0 + a1) / 2
  const rMid = (R_CELL_IN + R_CELL_OUT) / 2
  const [px, py] = pol(CX, CY, rMid, am)
  const [ex, ey] = pol(CX, CY, R_CELL_OUT + 18, am)
  const dir = Math.cos(am) >= 0 ? 1 : -1
  const elbowX = ex + dir * 80
  return (
    <g>
      <path
        d={sectorPath(CX, CY, R_CELL_IN, R_CELL_OUT, a0, a1)}
        fill="currentColor"
        opacity={hovered ? 0.07 : 0.015}
        style={{ cursor: "crosshair", transition: "opacity 0.15s" }}
        onMouseEnter={() => onHover(idx)}
        onMouseLeave={() => onHover(null)}
      />
      <CellFittings am={am} rMid={rMid} />
      <CellDoor am={am} />
      {hovered && (
        <g pointerEvents="none">
          <circle cx={px} cy={py} r={1.8} fill="currentColor" opacity={0.85} />
          <polyline
            points={`${px},${py} ${ex},${ey} ${elbowX},${ey}`}
            fill="none" stroke="currentColor" strokeWidth={0.7} opacity={0.75}
          />
          <text
            x={elbowX + dir * 6} y={ey + 5}
            textAnchor={dir > 0 ? "start" : "end"}
            fill="currentColor" opacity={0.92}
            style={{ fontFamily: mono, fontSize: "22px", letterSpacing: "0.12em" }}
          >
            {label.toUpperCase()}
          </text>
        </g>
      )}
    </g>
  )
}

// ── Elevation (facade) + Section ───────────────────────────────────────

const EH = 380
const N_FLOORS = 5
const FLOOR_H = 40
const STORE_TOP = 60
const BASE_Y = STORE_TOP + N_FLOORS * FLOOR_H
const FACADE_BAYS = 5

const FACADE_ROWS = [
  { top: 10, h: 14, arched: false },
  { top: 6, h: 27, arched: true },
  { top: 6, h: 27, arched: true },
  { top: 7, h: 25, arched: true },
  { top: 8, h: 24, arched: false },
]

function FacadeWindow({ x, y, w, h, arched }) {
  const r = w / 2
  const d = arched
    ? `M ${x} ${y + h} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h} Z`
    : `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`
  return (
    <g>
      <path d={d} fill="url(#winHatch)" stroke="currentColor" strokeWidth={0.6} opacity={0.8} />
      <Ln x1={x - 2} y1={y + h} x2={x + w + 2} y2={y + h} w={0.8} o={0.55} />
    </g>
  )
}

function Facade() {
  const xL = 16, xR = CX - 6
  const bayW = (xR - xL) / FACADE_BAYS
  return (
    <g>
      <path d={`M ${xL} ${STORE_TOP - 4} L ${xL + 96} 16 L ${xR - 24} 16 L ${xR} ${STORE_TOP - 4} Z`} fill="currentColor" opacity={0.035} />
      <path d={`M ${xL} ${STORE_TOP - 4} L ${xL + 96} 16 L ${xR - 24} 16 L ${xR} ${STORE_TOP - 4} Z`} fill="none" stroke="currentColor" strokeWidth={1.1} opacity={0.7} />
      <g clipPath="url(#roofClip)" opacity={0.35}>
        {Array.from({ length: 24 }, (_, i) => <Ln key={`v${i}`} x1={xL + 4 + i * 13} y1={12} x2={xL + 4 + i * 13} y2={STORE_TOP} w={0.35} o={0.6} />)}
        {Array.from({ length: 6 }, (_, i) => <Ln key={`h${i}`} x1={xL} y1={20 + i * 7} x2={xL + 320} y2={20 + i * 7} w={0.35} o={0.6} />)}
      </g>
      <text x={xL + 44} y={11} textAnchor="middle" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7px" }}>B</text>
      <Wl x1={xL - 3} y1={STORE_TOP - 4} x2={xR + 3} y2={STORE_TOP - 4} w={1} o={0.55} />
      <Wl x1={xL - 2} y1={STORE_TOP} x2={xR + 2} y2={STORE_TOP} w={2.2} o={0.85} />
      <Wl x1={xL} y1={STORE_TOP} x2={xL} y2={BASE_Y} w={2} o={0.8} />
      <Wl x1={xR} y1={STORE_TOP} x2={xR} y2={BASE_Y} w={2} o={0.8} />
      {Array.from({ length: FACADE_BAYS - 1 }, (_, i) => <Ln key={i} x1={xL + (i + 1) * bayW} y1={STORE_TOP + 3} x2={xL + (i + 1) * bayW} y2={BASE_Y - 2} w={0.4} o={0.18} />)}
      {FACADE_ROWS.map((row, r) => {
        const y0 = STORE_TOP + r * FLOOR_H
        const winW = bayW * (r === 0 ? 0.16 : 0.2)
        return (
          <g key={r}>
            {r > 0 && <><Wl x1={xL} y1={y0} x2={xR} y2={y0} w={1} o={0.5} /><Ln x1={xL} y1={y0 + 2.5} x2={xR} y2={y0 + 2.5} w={0.4} o={0.3} /></>}
            {Array.from({ length: FACADE_BAYS }, (_, c) => {
              if (r === 4 && c === 2) return null
              const bayX = xL + c * bayW
              return <g key={c}><FacadeWindow x={bayX + bayW * 0.26 - winW / 2} y={y0 + row.top} w={winW} h={row.h} arched={row.arched} /><FacadeWindow x={bayX + bayW * 0.74 - winW / 2} y={y0 + row.top} w={winW} h={row.h} arched={row.arched} /></g>
            })}
          </g>
        )
      })}
      <FacadeWindow x={xL + 2.5 * bayW - 14} y={BASE_Y - 33} w={28} h={33} arched />
      <Wl x1={xL - 4} y1={BASE_Y} x2={xR + 4} y2={BASE_Y} w={2.4} o={0.85} />
    </g>
  )
}

function Section({ hov }) {
  const x0 = CX + 6, x1 = W - 44, towerX = CX + 160, cellX = x1 - 116
  return (
    <g>
      <rect x={towerX - 11} y={4} width={22} height={14} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.7} />
      <Ln x1={towerX - 6} y1={7} x2={towerX - 6} y2={15} w={0.4} o={0.5} />
      <Ln x1={towerX + 6} y1={7} x2={towerX + 6} y2={15} w={0.4} o={0.5} />
      <text x={towerX - 18} y={12} textAnchor="end" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7px" }}>K</text>
      <path d={`M ${x0} ${STORE_TOP - 4} L ${towerX} 18 L ${x1} ${STORE_TOP - 4}`} fill="none" stroke="currentColor" strokeWidth={1.4} opacity={0.75} />
      <Ln x1={x0 + 12} y1={STORE_TOP - 5} x2={towerX} y2={24} w={0.5} o={0.35} />
      {Array.from({ length: 7 }, (_, i) => { const t = (i + 1) / 8; const px = towerX + t * (x1 - towerX); const py = 18 + t * (STORE_TOP - 4 - 18); return <Ln key={i} x1={px} y1={py + 1} x2={px} y2={py + 8} w={0.45} o={0.4} /> })}
      <text x={(towerX + x1) / 2 + 10} y={26} textAnchor="middle" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7px" }}>C</text>
      <Wl x1={x0} y1={STORE_TOP - 4} x2={x0} y2={BASE_Y} w={2} o={0.8} />
      <Wl x1={x1} y1={STORE_TOP - 4} x2={x1} y2={BASE_Y} w={2} o={0.8} />
      <path d={`M ${x0 + 4} 50 Q ${towerX - 90} 30 ${towerX - 26} 116`} fill="none" stroke="currentColor" strokeWidth={0.7} opacity={0.35} />
      <path d={`M ${x0 + 4} 84 Q ${towerX - 80} 62 ${towerX - 26} 140`} fill="none" stroke="currentColor" strokeWidth={0.6} opacity={0.25} />
      <text x={(x0 + towerX) / 2 - 20} y={52} textAnchor="middle" fill="currentColor" opacity={0.4} style={{ fontFamily: mono, fontSize: "7px" }}>I</text>
      <text x={(x0 + towerX - 26) / 2} y={152} textAnchor="middle" fill="currentColor" opacity={0.42} style={{ fontFamily: mono, fontSize: "7px" }}>G</text>
      {Array.from({ length: N_FLOORS }, (_, r) => {
        const yb = STORE_TOP + (r + 1) * FLOOR_H
        const n = Math.floor((towerX - 34 - (x0 + 8)) / 26)
        return <g key={r} opacity={0.22}><Ln x1={x0 + 2} y1={yb} x2={towerX - 28} y2={yb} w={0.5} o={0.9} />{Array.from({ length: n }, (_, i) => { const ax = x0 + 8 + i * 26; return <path key={i} d={`M ${ax} ${yb} L ${ax} ${yb - 14} A 9 9 0 0 1 ${ax + 18} ${yb - 14} L ${ax + 18} ${yb}`} fill="none" stroke="currentColor" strokeWidth={0.5} /> })}</g>
      })}
      <Wl x1={towerX - 26} y1={18} x2={towerX - 26} y2={BASE_Y} w={1.2} o={0.7} />
      <Wl x1={towerX + 26} y1={18} x2={towerX + 26} y2={BASE_Y} w={1.2} o={0.7} />
      {Array.from({ length: 16 }, (_, i) => { const y = 28 + i * 14.4; return i % 2 === 0 ? <Ln key={i} x1={towerX - 22} y1={y} x2={towerX + 22} y2={y - 9} w={0.45} o={0.4} /> : <Ln key={i} x1={towerX - 22} y1={y - 9} x2={towerX + 22} y2={y} w={0.45} o={0.4} /> })}
      {Array.from({ length: N_FLOORS + 1 }, (_, r) => {
        const y = STORE_TOP + r * FLOOR_H
        return <g key={r}><Wl x1={towerX + 26} y1={y} x2={x1} y2={y} w={1.5} o={0.75} />{r > 0 && <g opacity={0.55}><Ln x1={towerX + 27} y1={y - 9} x2={towerX + 61} y2={y - 9} w={0.6} o={0.9} />{Array.from({ length: 9 }, (_, t) => <Ln key={t} x1={towerX + 28 + t * 4} y1={y} x2={towerX + 28 + t * 4} y2={y - 9} w={0.45} o={0.8} />)}</g>}</g>
      })}
      {Array.from({ length: N_FLOORS }, (_, r) => {
        const y = STORE_TOP + r * FLOOR_H
        const lit = hov != null && hov % N_FLOORS === r
        return (
          <g key={r}>
            <rect x={cellX + 1.5} y={y + 1.5} width={x1 - cellX - 3} height={FLOOR_H - 3} fill="currentColor" opacity={lit ? 0.06 : 0} pointerEvents="none" style={{ transition: "opacity 0.15s" }} />
            <Wl x1={cellX} y1={y} x2={cellX} y2={y + 16} w={1.3} o={0.7} />
            <path d={`M ${cellX} ${y + 16} A 8 8 0 0 0 ${cellX - 8} ${y + 24}`} fill="none" stroke="currentColor" strokeWidth={0.6} opacity={0.5} />
            <Ln x1={cellX} y1={y + FLOOR_H} x2={cellX - 9} y2={y + FLOOR_H - 9} w={0.5} o={0.4} />
            <g stroke="currentColor" fill="none" opacity={0.45}><rect x={x1 - 32} y={y + FLOOR_H - 9} width={22} height={7} strokeWidth={0.5} /><line x1={x1 - 32} y1={y + FLOOR_H - 5.5} x2={x1 - 10} y2={y + FLOOR_H - 5.5} strokeWidth={0.3} /></g>
            <rect x={x1 + 1} y={y + 8} width={7} height={11} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeWidth={0.6} opacity={0.5} />
            <text x={(cellX + x1) / 2} y={y + 22} textAnchor="middle" fill="currentColor" opacity={0.5} style={{ fontFamily: mono, fontSize: "7.5px" }}>A</text>
            {r < N_FLOORS - 1 && <text x={towerX + 88} y={y + 22} textAnchor="middle" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7px" }}>D</text>}
          </g>
        )
      })}
      {hov != null && (() => {
        const r = hov % N_FLOORS
        const y = STORE_TOP + r * FLOOR_H
        const sx = cellX + (x1 - cellX) / 2, sy = y + FLOOR_H / 2
        const skyY = 50, elbowX = sx + 26
        return (
          <g pointerEvents="none">
            <circle cx={sx} cy={sy} r={1.8} fill="currentColor" opacity={0.85} />
            <polyline points={`${sx},${sy} ${elbowX},${skyY} ${x1 + 30},${skyY}`} fill="none" stroke="currentColor" strokeWidth={0.7} opacity={0.75} />
            <text x={x1 + 30} y={skyY - 8} textAnchor="end" fill="currentColor" opacity={0.92} style={{ fontFamily: mono, fontSize: "22px", letterSpacing: "0.12em" }}>
              {WORDS[hov].toUpperCase()}
            </text>
          </g>
        )
      })()}
      <path d={`M ${towerX + 26} ${BASE_Y} Q ${(towerX + 26 + cellX) / 2} ${BASE_Y - 62} ${cellX} ${BASE_Y}`} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.5} />
      <text x={(towerX + 26 + cellX) / 2} y={BASE_Y - 16} textAnchor="middle" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7.5px" }}>H</text>
      <Wl x1={x0 - 4} y1={BASE_Y} x2={x1 + 8} y2={BASE_Y} w={2.4} o={0.85} />
      <text x={x1 + 22} y={BASE_Y - 6} textAnchor="middle" fill="currentColor" opacity={0.4} style={{ fontFamily: mono, fontSize: "7px" }}>E</text>
      <g opacity={0.45}>
        <Ln x1={x1 + 32} y1={STORE_TOP} x2={x1 + 32} y2={BASE_Y} w={0.5} />
        {Array.from({ length: N_FLOORS + 1 }, (_, r) => { const y = STORE_TOP + r * FLOOR_H; return <g key={r}><Ln x1={x1 + 28} y1={y} x2={x1 + 36} y2={y} w={0.6} /><Ln x1={x1 + 29} y1={y + 3} x2={x1 + 35} y2={y - 3} w={0.6} /></g> })}
      </g>
    </g>
  )
}

function ScaleBar() {
  const y = BASE_Y + 32, x = 350, seg = 50
  return (
    <g>
      <text x={x - 12} y={y + 5} textAnchor="end" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7px", fontStyle: "italic" }}>scale of</text>
      {Array.from({ length: 6 }, (_, i) => i % 2 === 0 && <rect key={i} x={x + i * seg} y={y} width={seg} height={4} fill="currentColor" opacity={0.55} />)}
      <rect x={x} y={y} width={seg * 6} height={4} fill="none" stroke="currentColor" strokeWidth={0.7} opacity={0.7} />
      {Array.from({ length: 7 }, (_, i) => <text key={i} x={x + i * seg} y={y - 4} textAnchor="middle" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "6.5px" }}>{i * 10}</text>)}
      <text x={x + seg * 6 + 12} y={y + 5} textAnchor="start" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7px", fontStyle: "italic" }}>feet</text>
    </g>
  )
}

function ElevationSection({ hov }) {
  return (
    <svg viewBox={`0 0 ${W} ${EH}`} style={{ width: "100%", height: "auto", display: "block", marginBottom: "0.4rem" }}>
      <defs>
        <pattern id="winHatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3.2" stroke="currentColor" strokeWidth="0.5" opacity="0.45" />
        </pattern>
        <clipPath id="roofClip">
          <path d={`M 16 ${STORE_TOP - 4} L 112 16 L ${CX - 30} 16 L ${CX - 6} ${STORE_TOP - 4} Z`} />
        </clipPath>
      </defs>
      <Facade />
      <Section hov={hov} />
      <g opacity={0.3}>
        {Array.from({ length: 70 }, (_, i) => { const x = 20 + i * 14; return <Ln key={i} x1={x} y1={BASE_Y + 2} x2={x - 6} y2={BASE_Y + 8} w={0.5} o={0.9} /> })}
      </g>
      <text x={255} y={BASE_Y + 20} textAnchor="middle" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7.5px", letterSpacing: "1.2px" }}>ELEVATION</text>
      <text x={731} y={BASE_Y + 20} textAnchor="middle" fill="currentColor" opacity={0.45} style={{ fontFamily: mono, fontSize: "7.5px", letterSpacing: "1.2px" }}>SECTION A—A</text>
      <ScaleBar />
      <Ln x1={CX} y1={0} x2={CX} y2={BASE_Y + 10} w={0.5} o={0.3} dash="1 3" />
    </svg>
  )
}

function CombinedPlan() {
  const [hov, setHov] = useState(null)
  return (
    <div style={{ position: "relative", width: "min(80%, 680px)", margin: "0 auto", color: "var(--text, #000)" }}>
      <ElevationSection hov={hov} />
      <svg viewBox={`-250 0 1500 ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <circle cx={CX} cy={CY} r={R_CELL_OUT} fill="currentColor" opacity={0.03} />
        <circle cx={CX} cy={CY} r={R_CELL_OUT} fill="none" stroke="currentColor" strokeWidth={2.4} opacity={0.85} />
        {Array.from({ length: N_CELLS }, (_, i) => {
          const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / N_CELLS
          const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / N_CELLS
          return <Cell key={i} idx={i} a0={a0} a1={a1} label={WORDS[i]} hovered={hov === i} onHover={setHov} />
        })}
        {Array.from({ length: N_CELLS }, (_, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / N_CELLS
          const [x1, y1] = pol(CX, CY, R_CELL_IN, a)
          const [x2, y2] = pol(CX, CY, R_CELL_OUT, a)
          return <Wl key={i} x1={x1} y1={y1} x2={x2} y2={y2} w={1.6} o={0.6} />
        })}
        <circle cx={CX} cy={CY} r={R_CATWALK} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} strokeDasharray="2 3" />
        <circle cx={CX} cy={CY} r={R_CELL_IN} fill="none" stroke="currentColor" strokeWidth={1.4} opacity={0.7} />
        <g stroke="currentColor" fill="none" opacity={0.22}>
          {Array.from({ length: N_CELLS }, (_, i) => {
            const a = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / N_CELLS
            const [x2, y2] = pol(CX, CY, R_CELL_OUT - 4, a)
            return <line key={i} x1={CX} y1={CY} x2={x2} y2={y2} strokeWidth={0.4} strokeDasharray="1 3" />
          })}
        </g>
        {hov != null && (() => {
          const a = -Math.PI / 2 + ((hov + 0.5) * 2 * Math.PI) / N_CELLS
          const [x2, y2] = pol(CX, CY, R_CELL_OUT - 4, a)
          return <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="currentColor" strokeWidth={0.7} opacity={0.55} pointerEvents="none" />
        })()}
        <circle cx={CX} cy={CY} r={R_TOWER} fill="currentColor" opacity={0.06} />
        <circle cx={CX} cy={CY} r={R_TOWER} fill="none" stroke="currentColor" strokeWidth={1.6} opacity={0.85} />
        <g stroke="currentColor" fill="none" opacity={0.6}>
          {Array.from({ length: N_CELLS }, (_, i) => {
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / N_CELLS
            const [x1, y1] = pol(CX, CY, R_TOWER * 0.4, a)
            const [x2, y2] = pol(CX, CY, R_TOWER, a)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.4} />
          })}
        </g>
        <circle cx={CX} cy={CY} r={16} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.7} />
        <circle cx={CX} cy={CY} r={4} fill="currentColor" stroke="none" opacity={0.75} />
        <text x={CX} y={CY - 26} textAnchor="middle" fill="currentColor" opacity={0.5} style={{ fontFamily: mono, fontSize: "7.5px", letterSpacing: "1.5px" }}>INSPECTION HOUSE</text>
        <g opacity={0.4}>
          <Ln x1={60} y1={34} x2={940} y2={34} w={0.5} />
          {[60, 240, 500, 760, 940].map((x) => <g key={x}><Ln x1={x} y1={30} x2={x} y2={38} w={0.6} /><Ln x1={x - 3} y1={37} x2={x + 3} y2={31} w={0.6} /></g>)}
        </g>
        <g transform="translate(952 330)" stroke="currentColor" fill="none" opacity={0.5}>
          <circle cx={0} cy={0} r={13} strokeWidth={0.7} />
          <path d="M 0 9 L 0 -9 M -4 -3 L 0 -9 L 4 -3" strokeWidth={0.8} />
          <text x={0} y={24} textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: mono, fontSize: "7px" }}>N</text>
        </g>
      </svg>
      <p style={{ textAlign: "center", marginTop: "0.6rem", fontSize: "10px", opacity: 0.5, color: "var(--text-dim)" }}>
        first floor plan — panopticon — scale 1:100 — ws.2026
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

        <div className="flex gap-3 mb-4">
          <a
            href="/cv"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "var(--text)",
              color: "var(--bg)",
              padding: "0.45rem 0.9rem",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            CV
          </a>
          <a
            href="/resume"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "var(--text)",
              color: "var(--bg)",
              padding: "0.45rem 0.9rem",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Resume
          </a>
        </div>

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
    </div>
  )
}

export default About
