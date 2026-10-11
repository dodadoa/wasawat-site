import { useState } from "react"

// ── Plan drawing ────────────────────────────────────────────────────────
// A CAD sheet in two parts, one building. Below, the plan: Bentham's
// inspection house kept as a round kernel, the nine practices accreted
// around it as rooms on a 2 m grid, one wing rotated into the rest, one wing
// never rendered. Above, its south elevation and a section through the kernel.

const mono = "'DepartureMono', monospace"
const pixel = "var(--f-pixel)"
const dataMono = "var(--f-data)"
const SOFT = "var(--soft)"

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

// ── Floor plan ──────────────────────────────────────────────────────────
// Drawn in grid units (1 U = 2 m), origin at the building's north-west
// corner. Rooms are closed polygons stroked as walls; everything else
// (doors, windows, the rotunda) is painted over them back to front.

const U = 60
const OX = 70
const OY = 150
const PW = 1240
const PH = 910
const WALL = 4
const MID = 3
const THIN = 2
// kernel centre, and the later wing that was rotated into the east end
const KX = 8.5
const KY = 6.3
const R_ROTUNDA = 2.5
const R_KERNEL = 1.5
const BOX = { cx: 15.3, cy: 8.3, hw: 3, hh: 1.9, rot: -18 }

const px = (n) => n * U
const pts2str = (pts) => pts.map(([x, y]) => `${px(x)},${px(y)}`).join(" ")
const pad2 = (n) => String(n).padStart(2, "0")
const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, "0")
const label = (size) => ({ fontFamily: mono, fontSize: `${size}px` })

// box-local → plan coordinates
const boxPt = (x, y) => {
  const a = (BOX.rot * Math.PI) / 180
  return [BOX.cx + x * Math.cos(a) - y * Math.sin(a), BOX.cy + x * Math.sin(a) + y * Math.cos(a)]
}

// the assembly's apse: a semicircle rasterised onto the quarter-unit grid
const APSE = Array.from({ length: 12 }, (_, i) => {
  const xm = -1.5 + 0.25 * (i + 0.5)
  const h = Math.round(Math.sqrt(2.25 - xm * xm) * 4) / 4
  return [[8.5 + 0.25 * i, -h], [8.5 + 0.25 * (i + 1), -h]]
}).flat()

// one room per entry in WORDS, same order
const ROOMS = [
  { code: "WET_LAB", pts: [[0, 0], [5, 0], [5, 3.8], [0, 3.8]], tag: [0.3, 3.1] },
  { code: "TRIBUNAL", pts: [[5, 0], [8, 0], [8, 3], [5, 3]], tag: [5.25, 0.25] },
  { code: "ASSEMBLY", pts: [[8, 3], [8, 0], [8.5, 0], ...APSE, [11.5, 0], [12, 0], [12, 3]], tag: [8.25, 2.35] },
  { code: "EVIDENCE", pts: [[12, 0], [15.5, 0], [15.5, 3], [12, 3]], tag: [12.25, 2.35] },
  { code: "ATELIER", pts: [[0, 3.8], [3.6, 3.8], [3.6, 5.6], [5, 5.6], [5, 8.8], [0, 8.8]], tag: [0.3, 5.15] },
  { code: "WORKSHOP", pts: [[0, 8.8], [5, 8.8], [5, 12], [0, 12]], tag: [0.3, 9.05] },
  { code: "CELLS", pts: [[5, 9.6], [11.5, 9.6], [11.5, 12], [5, 12]], tag: [5.2, 10.9], stack: true },
  {
    code: "BLACK_BOX",
    pts: [boxPt(-BOX.hw, -BOX.hh), boxPt(BOX.hw, -BOX.hh), boxPt(BOX.hw, BOX.hh), boxPt(-BOX.hw, BOX.hh)],
    tag: boxPt(-2.7, 1.1),
    rot: BOX.rot,
  },
  { code: "CONTROL", pts: [[12, 3.8], [15.5, 3.8], [15.5, 6.6], [12, 6.6]], tag: [12.25, 5.95] },
]
const BOX_ROOM = 7

// everything under a roof, less the box (which paints its own floor)
const FOOTPRINT = [
  [0, 0], [8.5, 0], ...APSE, [11.5, 0], [15.5, 0], [15.5, 6.6], [14.4, 6.6],
  boxPt(-BOX.hw, -BOX.hh), [12.57, 9.6], [11.5, 9.6], [11.5, 12], [0, 12],
]

// shoelace, in m²
const roomArea = (pts) =>
  Math.abs(pts.reduce((s, [x, y], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]
    return s + x * y2 - x2 * y
  }, 0)) * 2

// hinge at (x, y); the opening runs along the rotated +x axis, the leaf swings to −y
function Door({ x, y, rot = 0, flip, w = 0.7 }) {
  const d = px(w)
  return (
    <g transform={`translate(${px(x)} ${px(y)}) rotate(${rot}) scale(1 ${flip ? -1 : 1})`}>
      <rect x={0} y={-WALL} width={d} height={WALL * 2} fill="var(--bg, #fff)" />
      <line x1={0} y1={0} x2={0} y2={-d} stroke="currentColor" strokeWidth={MID} />
      <path d={`M 0 ${-d} A ${d} ${d} 0 0 1 ${d} 0`} fill="none" stroke="currentColor" strokeWidth={THIN} />
    </g>
  )
}

// glazing: the wall opens into a hollow segment
function Win({ x, y, len, v }) {
  const l = px(len)
  return (
    <g transform={`translate(${px(x)} ${px(y)}) rotate(${v ? 90 : 0})`}>
      <rect x={0} y={-WALL / 2 - 1} width={l} height={WALL + 2} fill="var(--bg, #fff)" />
      <rect x={0} y={-4} width={l} height={8} fill="none" stroke="currentColor" strokeWidth={THIN} />
    </g>
  )
}

// room tag: inverted number chip + code name, on a paper backing so it
// stays legible over the hover screen
function Tag({ n, room }) {
  const [x, y] = room.tag
  const tw = room.code.length * 11.5 + 8
  return (
    <g transform={`translate(${px(x)} ${px(y)}) rotate(${room.rot || 0})`}>
      <rect width={34} height={24} fill="currentColor" />
      <text x={17} y={18} textAnchor="middle" fill="var(--bg, #fff)" style={label(18)}>{pad2(n + 1)}</text>
      <rect x={room.stack ? 0 : 36} y={room.stack ? 26 : 0} width={tw} height={24} fill="var(--bg, #fff)" />
      <text x={room.stack ? 2 : 42} y={room.stack ? 44 : 18} fill="currentColor" style={label(18)}>{room.code}</text>
    </g>
  )
}

function Fittings() {
  const R = (x, y, w, h, k) => <rect key={k} x={px(x)} y={px(y)} width={px(w)} height={px(h)} />
  const C = (x, y, r, k) => <circle key={k} cx={px(x)} cy={px(y)} r={px(r)} />
  const L = (x1, y1, x2, y2, k) => <line key={k} x1={px(x1)} y1={px(y1)} x2={px(x2)} y2={px(y2)} />
  return (
    <g stroke={SOFT} strokeWidth={THIN} fill="none">
      {/* 01 wet lab: wall bench, island, culture dish with its worm */}
      {R(0.3, 0.3, 3.2, 0.55)}
      {R(0.6, 0.4, 0.45, 0.35)}
      {R(1, 1.6, 2.4, 0.8)}
      {L(1, 2, 3.4, 2)}
      {C(4.1, 1.3, 0.55)}
      {C(4.1, 1.3, 0.4)}
      <path d={`M ${px(3.85)} ${px(1.3)} q 7 -16 15 0 t 15 0`} strokeWidth={MID} />

      {/* 02 tribunal: two facing benches, one chair between them */}
      {R(5.5, 1, 2, 0.25)}
      {R(5.5, 2, 2, 0.25)}
      {C(6.5, 1.62, 0.14)}

      {/* 03 assembly: hemicycle tiers in the apse, rostrum */}
      {[0.5, 0.85, 1.2].map((r) => (
        <path key={r} d={`M ${px(10 - r)} ${px(0.3)} A ${px(r)} ${px(r)} 0 0 1 ${px(10 + r)} ${px(0.3)}`} />
      ))}
      {R(9.6, 1.2, 0.8, 0.3)}

      {/* 04 evidence: compact shelving, reading desk */}
      {Array.from({ length: 5 }, (_, i) => R(12.35 + i * 0.4, 0.3, 0.22, 1.5, i))}
      {R(14.6, 0.4, 0.6, 1.3)}
      {C(14.38, 1.05, 0.14)}

      {/* 05 atelier: dress forms, cutting table, rail */}
      {[0.6, 1.3, 2].map((x) => (
        <g key={x}>
          {C(x, 4.45, 0.18)}
          {L(x - 0.18, 4.45, x + 0.18, 4.45)}
          {L(x, 4.27, x, 4.63)}
        </g>
      ))}
      {R(0.9, 6.3, 2.6, 1.1)}
      <line x1={px(0.9)} y1={px(7.4)} x2={px(3.5)} y2={px(6.3)} strokeDasharray="6 6" />
      <line x1={px(0.4)} y1={px(8.35)} x2={px(3.6)} y2={px(8.35)} strokeWidth={MID} />
      {Array.from({ length: 11 }, (_, i) => L(0.5 + i * 0.3, 8.22, 0.5 + i * 0.3, 8.48, i))}

      {/* stair, open to the west corridor */}
      {Array.from({ length: 6 }, (_, i) => L(3.8 + i * 0.2, 3.8, 3.8 + i * 0.2, 5.6, i))}
      <line x1={px(3.8)} y1={px(4.7)} x2={px(5)} y2={px(4.7)} strokeWidth={MID} />
      <path d={`M ${px(4.9)} ${px(4.25)} L ${px(3.95)} ${px(4.25)} m 9 -7 l -9 7 l 9 7`} />

      {/* 06 workshop: assembly table, bench, one machine */}
      {R(1, 9.9, 1.8, 0.9)}
      {L(1, 9.9, 2.8, 10.8)}
      {L(2.8, 9.9, 1, 10.8)}
      {R(0.3, 11.2, 3, 0.5)}
      {R(3.9, 10.8, 0.75, 0.75)}
      {C(4.275, 11.175, 0.25)}

      {/* 07 cells: five identical rooms off a day room */}
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i}>
          <line x1={px(6.5 + i)} y1={px(9.6)} x2={px(6.5 + i)} y2={px(12)} strokeWidth={MID + 1} />
          {R(7.02 + i, 10.5, 0.36, 1.2)}
          {L(7.02 + i, 10.8, 7.38 + i, 10.8)}
        </g>
      ))}

      {/* 09 control: monitor wall, curved console */}
      {Array.from({ length: 5 }, (_, i) => R(15.1, 4.05 + i * 0.4, 0.2, 0.3, i))}
      {[1, 0.8].map((r) => {
        const a = (115 * Math.PI) / 180
        const dx = r * Math.cos(a), dy = r * Math.sin(a)
        return <path key={r} d={`M ${px(15.2 + dx)} ${px(5 + dy)} A ${px(r)} ${px(r)} 0 0 1 ${px(15.2 + dx)} ${px(5 - dy)}`} />
      })}
      {C(13.9, 5, 0.14)}
    </g>
  )
}

// the old inspection house, kept: poché square, ring walk, kernel
function Rotunda() {
  const s = R_ROTUNDA
  return (
    <g>
      <rect x={px(KX - s)} y={px(KY - s)} width={px(s * 2)} height={px(s * 2)} fill="url(#planChk)" stroke="currentColor" strokeWidth={WALL} />
      <circle cx={px(KX)} cy={px(KY)} r={px(s)} fill="var(--bg, #fff)" stroke="currentColor" strokeWidth={WALL} />
      {/* risers in the four leftover corners */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => {
        const x = px(KX + sx * (s - 0.14) - (sx > 0 ? 0.45 : 0))
        const y = px(KY + sy * (s - 0.14) - (sy > 0 ? 0.45 : 0))
        const d = px(0.45)
        return (
          <g key={i} stroke="currentColor" strokeWidth={THIN}>
            <rect x={x} y={y} width={d} height={d} fill="var(--bg, #fff)" />
            <path d={`M ${x} ${y} l ${d} ${d} M ${x + d} ${y} l ${-d} ${d}`} fill="none" />
          </g>
        )
      })}
      {/* openings where the ring touches the four corridors */}
      {[[0, -1], [0, 1], [-1, 0], [1, 0]].map(([sx, sy], i) => (
        <rect
          key={i}
          x={px(KX + sx * s - (sx ? 0.12 : 0.4))} y={px(KY + sy * s - (sy ? 0.12 : 0.4))}
          width={px(sx ? 0.24 : 0.8)} height={px(sy ? 0.24 : 0.8)}
          fill="var(--bg, #fff)"
        />
      ))}
      <circle cx={px(KX)} cy={px(KY)} r={px(2)} fill="none" stroke={SOFT} strokeWidth={THIN} strokeDasharray="2 8" />
    </g>
  )
}

function Kernel() {
  const arc = (r, a0, a1) => {
    const [x0, y0] = [px(KX + r * Math.cos(a0)), px(KY + r * Math.sin(a0))]
    const [x1, y1] = [px(KX + r * Math.cos(a1)), px(KY + r * Math.sin(a1))]
    return `M ${x0} ${y0} A ${px(r)} ${px(r)} 0 0 1 ${x1} ${y1}`
  }
  return (
    <g>
      <circle cx={px(KX)} cy={px(KY)} r={px(R_KERNEL)} fill="var(--bg, #fff)" stroke="currentColor" strokeWidth={WALL} />
      {/* its one opening */}
      <path d={arc(R_KERNEL, 0.72, 1.06)} fill="none" stroke="var(--bg, #fff)" strokeWidth={WALL + 6} />
      {/* rack ring */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8 + Math.PI / 16
        return (
          <line
            key={i}
            x1={px(KX + 1.02 * Math.cos(a))} y1={px(KY + 1.02 * Math.sin(a))}
            x2={px(KX + 1.3 * Math.cos(a))} y2={px(KY + 1.3 * Math.sin(a))}
            stroke="currentColor" strokeWidth={WALL}
          />
        )
      })}
      <circle cx={px(KX)} cy={px(KY)} r={px(0.45)} fill="none" stroke="currentColor" strokeWidth={MID} />
      <circle cx={px(KX)} cy={px(KY)} r={px(0.12)} fill="currentColor" />
      <text x={px(KX)} y={px(KY + 0.86)} textAnchor="middle" fill="currentColor" style={label(16)}>KERNEL</text>
    </g>
  )
}

// the wing that was dropped onto the east end at −18°
function BlackBox({ hovered, hit }) {
  const w = px(BOX.hw), h = px(BOX.hh)
  return (
    <g transform={`translate(${px(BOX.cx)} ${px(BOX.cy)}) rotate(${BOX.rot})`}>
      <rect x={-w} y={-h} width={w * 2} height={h * 2} fill="var(--bg, #fff)" />
      <rect x={-w} y={-h} width={w * 2} height={h * 2} fill="url(#planTone)" />
      <rect x={-w} y={-h} width={w * 2} height={h * 2} fill={hovered ? "url(#planD12)" : "transparent"} stroke="currentColor" strokeWidth={WALL} {...hit} />
      <g stroke={SOFT} strokeWidth={THIN} fill="none" pointerEvents="none">
        {/* screen, projector and its throw, seating rows, speakers */}
        <line x1={px(2.75)} y1={px(-1.4)} x2={px(2.75)} y2={px(1.4)} stroke="currentColor" strokeWidth={WALL} />
        <rect x={px(-2.3)} y={px(-0.17)} width={px(0.34)} height={px(0.34)} fill="var(--bg, #fff)" />
        <path d={`M ${px(-1.96)} 0 L ${px(2.75)} ${px(-1.4)} M ${px(-1.96)} 0 L ${px(2.75)} ${px(1.4)}`} strokeDasharray="6 6" />
        {[-0.9, -0.4, 0.1].map((x) => (
          <line key={x} x1={px(x)} y1={px(-1.2)} x2={px(x)} y2={px(0.9)} strokeWidth={WALL} strokeDasharray="10 6" />
        ))}
        <rect x={px(2.3)} y={px(-1.75)} width={px(0.25)} height={px(0.25)} fill="var(--bg, #fff)" />
        <rect x={px(2.3)} y={px(1.5)} width={px(0.25)} height={px(0.25)} fill="var(--bg, #fff)" />
        <Door x={-BOX.hw} y={0} rot={-90} />
      </g>
    </g>
  )
}

// phase two: drawn, never rendered — and the one sealed room it contains
function GhostWing() {
  return (
    <g>
      <path
        d={`M ${px(15.5)} 0 L ${px(18.5)} 0 L ${px(18.5)} ${px(5)} L ${px(15.5)} ${px(5)} M ${px(15.5)} ${px(2.5)} L ${px(18.5)} ${px(2.5)}`}
        fill="none" stroke={SOFT} strokeWidth={THIN} strokeDasharray="6 8"
      />
      <rect x={px(16.3)} y={px(0.7)} width={px(1.4)} height={px(1.2)} fill="url(#planChk)" stroke="currentColor" strokeWidth={WALL} />
      <text x={px(16.3)} y={px(2.28)} fill="currentColor" style={label(16)}>NULL</text>
      <text x={px(16.4)} y={px(4.1)} fill="currentColor" style={label(16)}>PHASE_02</text>
      <text x={px(16.4)} y={px(4.5)} fill="currentColor" style={label(16)}>NOT RENDERED</text>
    </g>
  )
}

function Rulers() {
  const ty = px(-2.1), lx = px(-0.75)
  return (
    <g stroke={SOFT} strokeWidth={THIN} color={SOFT}>
      <line x1={0} y1={ty} x2={px(19)} y2={ty} />
      {Array.from({ length: 20 }, (_, i) => (
        <g key={i}>
          <line x1={px(i)} y1={ty} x2={px(i)} y2={ty + (i % 2 ? 6 : 12)} />
          {i % 2 === 0 && <text x={px(i) + 5} y={ty + 22} fill="currentColor" stroke="none" style={label(16)}>{hex2(i)}</text>}
        </g>
      ))}
      <line x1={lx} y1={0} x2={lx} y2={px(12)} />
      {Array.from({ length: 13 }, (_, i) => (
        <g key={i}>
          <line x1={lx} y1={px(i)} x2={lx + (i % 2 ? 6 : 12)} y2={px(i)} />
          {i % 2 === 0 && <text x={lx + 5} y={px(i) + 22} fill="currentColor" stroke="none" style={label(16)}>{hex2(i)}</text>}
        </g>
      ))}
    </g>
  )
}

// status line: what the cursor has selected, read off the model
function Readout({ hov }) {
  const room = hov != null ? ROOMS[hov] : null
  const ray = room ? Math.hypot(room.tag[0] - KX, room.tag[1] - KY) * 2 : 0
  return (
    <g fill="currentColor">
      <text x={0} y={-68} style={label(18)}>
        {room
          ? `SEL ${pad2(hov + 1)} / ${room.code} / ${roomArea(room.pts).toFixed(1)} M2 / RAY ${ray.toFixed(1)} M`
          : "SEL -- / ROOMS 09 / KERNEL 01 / EXITS 00"}
      </text>
      <text x={0} y={-24} opacity={room ? 1 : 0} style={{ ...label(30), letterSpacing: "0.12em" }}>
        {room ? WORDS[hov].toUpperCase() : ""}
      </text>
      <text x={px(19)} y={-68} textAnchor="end" style={label(18)}>PLAN_L00.DWG / REV 0x09</text>
      <text x={px(19)} y={-40} textAnchor="end" style={label(18)}>1 U = 2 M / 1:200</text>
    </g>
  )
}

// hover: the room is selected the way a modelling tool selects it —
// bounding box with handles, a ray back to the kernel, coordinates on the rulers
function Selection({ room }) {
  const xs = room.pts.map((p) => p[0]), ys = room.pts.map((p) => p[1])
  const x0 = px(Math.min(...xs)) - 10, x1 = px(Math.max(...xs)) + 10
  const y0 = px(Math.min(...ys)) - 10, y1 = px(Math.max(...ys)) + 10
  const [tx, ty] = room.tag
  const d = Math.hypot(tx - KX, ty - KY)
  return (
    <g pointerEvents="none" stroke="var(--red)" fill="none">
      <line
        x1={px(KX + ((tx - KX) * R_KERNEL) / d)} y1={px(KY + ((ty - KY) * R_KERNEL) / d)}
        x2={px(tx)} y2={px(ty)} strokeWidth={MID}
      />
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} strokeWidth={THIN} strokeDasharray="8 6" />
      {[[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y], i) => (
        <rect key={i} x={x - 6} y={y - 6} width={12} height={12} strokeWidth={THIN} fill="var(--bg, #fff)" />
      ))}
      <path d={`M ${x0} ${px(-2.1) - 8} v 16 M ${x1} ${px(-2.1) - 8} v 16 M ${px(-0.75) - 8} ${y0} h 16 M ${px(-0.75) - 8} ${y1} h 16`} strokeWidth={MID} />
    </g>
  )
}

function FloorPlan({ hov, onHover }) {
  const hit = (i) => ({
    style: { cursor: "crosshair" },
    onMouseEnter: () => onHover(i),
    onMouseLeave: () => onHover(null),
  })
  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        {/* halftone screens on a 45° grid: hover, poché, dark room */}
        <pattern id="planD12" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="3.5" cy="3.5" r="1.2" fill="currentColor" />
        </pattern>
        <pattern id="planChk" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="2.5" cy="2.5" r="1.5" fill="currentColor" />
        </pattern>
        <pattern id="planTone" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="4.5" cy="4.5" r="1" fill="currentColor" />
        </pattern>
        {/* one point per grid intersection */}
        <pattern id="planGrid" width={U} height={U} patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="var(--line)" />
        </pattern>
      </defs>
      <g transform={`translate(${OX} ${OY})`}>
        <g pointerEvents="none">
          <rect x={0} y={px(-1.5)} width={px(19.3)} height={px(14)} fill="url(#planGrid)" />
          <polygon points={pts2str(FOOTPRINT)} fill="var(--bg, #fff)" />
        </g>

        {ROOMS.map((room, i) => i !== BOX_ROOM && (
          <polygon
            key={room.code}
            points={pts2str(room.pts)}
            // hovered room fills with a halftone screen; a hard cut, no fade
            fill={hov === i ? "url(#planD12)" : "transparent"}
            stroke="currentColor" strokeWidth={WALL}
            {...hit(i)}
          />
        ))}

        <g pointerEvents="none">
          <Fittings />
          <Rotunda />
          {/* sightlines, inherited: one ray from the kernel to every room */}
          {ROOMS.map((room) => (
            <line
              key={room.code}
              x1={px(KX)} y1={px(KY)} x2={px(room.tag[0])} y2={px(room.tag[1])}
              stroke={SOFT} strokeWidth={THIN} strokeDasharray="2 10"
            />
          ))}
          <Kernel />

          {/* corridor ends: one closed by a door onto nothing, one by the box */}
          <line x1={px(15.5)} y1={px(3)} x2={px(15.5)} y2={px(3.8)} stroke="currentColor" strokeWidth={WALL} />
          <line x1={px(11.5)} y1={px(9.6)} x2={px(12.7)} y2={px(9.6)} stroke="currentColor" strokeWidth={WALL} />

          <Door x={5} y={3.75} rot={-90} />
          <Door x={6} y={3} />
          <Door x={10.9} y={3} />
          <Door x={14.5} y={3} />
          <Door x={5} y={7.3} rot={-90} />
          <Door x={5} y={9.55} rot={-90} />
          <Door x={5.3} y={9.6} flip w={0.6} />
          {Array.from({ length: 5 }, (_, i) => <Door key={i} x={6.65 + i} y={9.6} flip w={0.5} />)}
          <Door x={12} y={4.6} rot={90} />
          <Door x={15.5} y={3.05} rot={90} />

          <Win x={0.8} y={0} len={1.2} />
          <Win x={2.8} y={0} len={1.2} />
          <Win x={0} y={1.2} len={1.4} v />
          <Win x={5.9} y={0} len={1.2} />
          <Win x={12.5} y={0} len={0.8} />
          <Win x={14.1} y={0} len={0.8} />
          <Win x={0} y={4.6} len={1.2} v />
          <Win x={0} y={6.6} len={1.4} v />
          <Win x={0} y={9.8} len={1.4} v />
          <Win x={0.8} y={12} len={1.2} />
          <Win x={2.8} y={12} len={1.2} />
          <Win x={5.4} y={12} len={0.7} />
          {Array.from({ length: 5 }, (_, i) => <Win key={i} x={6.75 + i} y={12} len={0.5} />)}
        </g>

        <BlackBox hovered={hov === BOX_ROOM} hit={hit(BOX_ROOM)} />

        <g pointerEvents="none">
          {/* the control room's corner, still on file under the box */}
          <path
            d={`M ${px(14.4)} ${px(6.6)} L ${px(15.5)} ${px(6.6)} L ${px(15.5)} ${px(6.24)}`}
            fill="none" stroke="currentColor" strokeWidth={THIN} strokeDasharray="6 6"
          />
          {[[14.4, 6.6], [15.5, 6.24]].map(([x, y], i) => (
            <g key={i} transform={`translate(${px(x)} ${px(y)})`} stroke="currentColor" strokeWidth={MID}>
              <circle r={13} fill="var(--bg, #fff)" strokeWidth={THIN} />
              <path d="M -6 -6 L 6 6 M 6 -6 L -6 6" />
            </g>
          ))}
          <text x={px(15.75)} y={px(5.62)} fill="currentColor" style={label(16)}>CLASH_02</text>

          <GhostWing />
          {ROOMS.map((room, i) => <Tag key={room.code} n={i} room={room} />)}
          <Rulers />

          {/* where section A–A cuts */}
          {[-0.62, 12.25].map((y) => (
            <g key={y}>
              <line x1={px(KX)} y1={px(y)} x2={px(KX)} y2={px(y + 0.3)} stroke="currentColor" strokeWidth={MID} />
              <text x={px(KX) - 18} y={px(y + 0.3)} fill="currentColor" style={label(16)}>A</text>
            </g>
          ))}

          {/* axes */}
          <g transform={`translate(${px(12)} ${px(11.8)})`} stroke="currentColor" strokeWidth={MID} fill="none">
            <path d={`M 0 0 V ${-px(0.8)} m -7 9 l 7 -9 l 7 9 M 0 0 H ${px(0.7)} m -9 -7 l 9 7 l -9 7`} />
            <rect x={-5} y={-5} width={10} height={10} fill="currentColor" stroke="none" />
            <text x={12} y={-px(0.8) + 4} fill="currentColor" stroke="none" style={label(16)}>N</text>
            <text x={px(0.7) - 12} y={26} fill="currentColor" stroke="none" style={label(16)}>X</text>
          </g>
          {/* scale bar, in powers of two */}
          <g transform={`translate(${px(14.6)} ${px(11.85)})`}>
            <rect x={0} y={0} width={px(1)} height={8} fill="currentColor" />
            <rect x={px(2)} y={0} width={px(2)} height={8} fill="currentColor" />
            <rect x={0} y={0} width={px(4)} height={8} fill="none" stroke="currentColor" strokeWidth={THIN} />
            {[[0, "0"], [1, "2"], [2, "4"], [4, "8 M"]].map(([x, t]) => (
              <text key={t} x={px(x)} y={-8} fill="currentColor" style={label(16)}>{t}</text>
            ))}
          </g>

          <Readout hov={hov} />
        </g>
        {hov != null && <Selection room={ROOMS[hov]} />}
      </g>
    </svg>
  )
}

// ── Elevation + Section ─────────────────────────────────────────────────
// Projected from the plan at a smaller scale: the south elevation shares the
// plan's x axis, section A–A its y axis (cut north–south through the kernel,
// looking east). Heights are in the same units, 1 U = 2 m.

const E = 34
const EH = 350
const GY = 270
const SX = 797
const ex = (x) => OX + x * E
const sy = (y) => SX + y * E
const ez = (z) => GY - z * E
// rect from its lower-left corner, in elevation (x, z) or section (y, z)
const eBox = (h, a, z, w, t) => ({ x: h(a), y: ez(z + t), width: w * E, height: t * E })

const H_ROOF = 2
const H_CELLS = 1.7
const H_HALL = 3
const H_BOX = 3.5
const H_KERNEL = 6
const H_MAST = 7.2
// box corners in plan order: west, north, east, south
const [BOX_W, BOX_N, BOX_E, BOX_S] = ROOMS[BOX_ROOM].pts

function SouthElevation({ hov }) {
  const lit = (i) => (hov === i ? "url(#planD12)" : "none")
  const solid = { fill: "var(--bg, #fff)", stroke: "currentColor", strokeWidth: MID }
  return (
    <g>
      {/* behind everything: the kernel tower and its mast, then the rotunda drum */}
      <g stroke={SOFT} strokeWidth={THIN} fill="none">
        <line x1={ex(KX)} y1={ez(H_KERNEL)} x2={ex(KX)} y2={ez(H_MAST)} />
        <line x1={ex(KX - 0.25)} y1={ez(6.5)} x2={ex(KX + 0.25)} y2={ez(6.5)} />
        <line x1={ex(KX - 0.15)} y1={ez(6.85)} x2={ex(KX + 0.15)} y2={ez(6.85)} />
      </g>
      <rect {...eBox(ex, KX - R_KERNEL, 0, R_KERNEL * 2, H_KERNEL)} {...solid} />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1={ex(7.2)} y1={ez(3.5 + i * 0.5)} x2={ex(9.8)} y2={ez(3.5 + i * 0.5)} stroke={SOFT} strokeWidth={THIN} />
      ))}
      <rect {...eBox(ex, KX - R_ROTUNDA, 0, R_ROTUNDA * 2, H_HALL)} {...solid} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} {...eBox(ex, 6.36 + i * 0.5, 2.25, 0.28, 0.4)} fill="none" stroke={SOFT} strokeWidth={THIN} />
      ))}
      {/* the foyer wall, seen in the gap between the cells and the box */}
      <rect {...eBox(ex, 11.5, 0, 1, H_ROOF)} {...solid} />

      {/* front: the workshop under a sawtooth roof, then the cells */}
      {Array.from({ length: 4 }, (_, i) => (
        <path key={i} d={`M ${ex(i * 1.25)} ${ez(H_ROOF)} V ${ez(2.6)} L ${ex((i + 1) * 1.25)} ${ez(H_ROOF)}`} {...solid} />
      ))}
      <rect {...eBox(ex, 0, 0, 5, H_ROOF)} {...solid} />
      <rect {...eBox(ex, 0, 0, 5, H_ROOF)} fill={lit(5)} />
      <rect {...eBox(ex, 5, 0, 6.5, H_CELLS)} {...solid} />
      <rect {...eBox(ex, 5, 0, 6.5, H_CELLS)} fill={lit(6)} />
      <g stroke={SOFT} strokeWidth={THIN} fill="var(--bg, #fff)">
        {[0.8, 2.8].map((x) => (
          <g key={x}>
            <rect {...eBox(ex, x, 0.6, 1.2, 0.9)} />
            <line x1={ex(x + 0.6)} y1={ez(0.6)} x2={ex(x + 0.6)} y2={ez(1.5)} />
          </g>
        ))}
        <rect {...eBox(ex, 5.4, 0.9, 0.7, 0.5)} />
        {Array.from({ length: 5 }, (_, i) => <rect key={i} {...eBox(ex, 6.75 + i, 0.9, 0.5, 0.5)} />)}
      </g>

      {/* the box, turned 18°: a short face and a long one, the long one in tone */}
      <rect {...eBox(ex, BOX_W[0], 0, BOX_S[0] - BOX_W[0], H_BOX)} {...solid} />
      <rect {...eBox(ex, BOX_S[0], 0, BOX_E[0] - BOX_S[0], H_BOX)} {...solid} />
      <rect {...eBox(ex, BOX_S[0], 0, BOX_E[0] - BOX_S[0], H_BOX)} fill="url(#planTone)" />
      <rect {...eBox(ex, BOX_W[0], 0, BOX_E[0] - BOX_W[0], H_BOX)} fill={lit(BOX_ROOM)} />

      <line x1={ex(-0.5)} y1={GY} x2={ex(19.3)} y2={GY} stroke="currentColor" strokeWidth={WALL} />
    </g>
  )
}

function SectionAA({ hov }) {
  const lit = (i) => (hov === i ? "url(#planD12)" : "none")
  const P = (pts) => pts.map(([y, z]) => `${sy(y)},${ez(z)}`).join(" ")
  const V = (y, z0, z1) => <line x1={sy(y)} y1={ez(z0)} x2={sy(y)} y2={ez(z1)} />
  const Hz = (z, y0, y1) => <line x1={sy(y0)} y1={ez(z)} x2={sy(y1)} y2={ez(z)} />
  // roofline, north to south: apse and hall, corridor, drum, tower, drum, corridor, cells
  const profile = [
    [-1.5, 0], [-1.5, H_HALL], [3, H_HALL], [3, H_ROOF], [3.8, H_ROOF], [3.8, H_HALL],
    [KY - R_KERNEL, H_HALL], [KY - R_KERNEL, H_KERNEL], [KY + R_KERNEL, H_KERNEL], [KY + R_KERNEL, H_HALL],
    [8.8, H_HALL], [8.8, H_ROOF], [9.6, H_ROOF], [9.6, H_CELLS], [12, H_CELLS], [12, 0],
  ]
  const tiers = Array.from({ length: 5 }, (_, k) => [[0.3 - 0.36 * k, 0.18 * (k + 1)], [0.3 - 0.36 * (k + 1), 0.18 * (k + 1)]]).flat()
  return (
    <g>
      {/* beyond the cut: the box and the mast */}
      <g stroke={SOFT} strokeWidth={THIN} fill="none">
        <rect {...eBox(sy, BOX_N[1], 0, BOX_S[1] - BOX_N[1], H_BOX)} />
        {V(BOX_W[1], 0, H_BOX)}
        {V(KY, H_KERNEL, H_MAST)}
        {Hz(6.5, KY - 0.25, KY + 0.25)}
        {Hz(6.85, KY - 0.15, KY + 0.15)}
      </g>
      <polygon points={P(profile)} fill="var(--bg, #fff)" />
      <rect {...eBox(sy, -1.5, 0, 4.5, H_HALL)} fill={lit(2)} />
      <rect {...eBox(sy, 9.6, 0, 2.4, H_CELLS)} fill={lit(6)} />

      {/* ground, and the kernel's shaft carrying on below it */}
      <rect x={sy(-2)} y={GY} width={14.5 * E} height={10} fill="url(#planChk)" />
      <g stroke={SOFT} strokeWidth={THIN} fill="none">
        <g strokeDasharray="6 6">
          {V(KY - 0.45, 0, -1.4)}
          {V(KY + 0.45, 0, -1.4)}
        </g>
        {/* shaft, racks on every level of the tower */}
        {V(KY - 0.45, 0, H_KERNEL)}
        {V(KY + 0.45, 0, H_KERNEL)}
        {Array.from({ length: 5 }, (_, f) => (
          <g key={f}>
            <rect {...eBox(sy, 5.05, f * 1.2 + 0.06, 0.55, 0.85)} />
            <rect {...eBox(sy, 7, f * 1.2 + 0.06, 0.55, 0.85)} />
          </g>
        ))}
        {/* raked tiers in the apse, rostrum, a bed */}
        <polyline points={P([[0.3, 0], ...tiers])} />
        <rect {...eBox(sy, 1.2, 0, 0.3, 0.5)} />
        <rect {...eBox(sy, 10.5, 0.2, 1.2, 0.16)} />
      </g>
      <text x={sy(7.05)} y={GY + 44} fill={SOFT} style={label(16)}>DEPTH: NULL</text>

      <g stroke="currentColor" strokeWidth={MID}>
        {[1.2, 2.4, 3.6, 4.8].map((z) => (
          <g key={z}>
            {Hz(z, KY - R_KERNEL, KY - 0.45)}
            {Hz(z, KY + 0.45, KY + R_KERNEL)}
          </g>
        ))}
        {/* gallery round the ring walk */}
        {Hz(1.5, 3.8, KY - R_KERNEL)}
        {Hz(1.5, KY + R_KERNEL, 8.8)}
      </g>
      {/* everything the plane cuts */}
      <g stroke="currentColor" strokeWidth={WALL} fill="none">
        <polyline points={P(profile)} />
        {V(3, 1.1, H_ROOF)}
        {V(3.8, 1.2, H_ROOF)}
        {V(KY - R_KERNEL, 0, H_HALL)}
        {V(KY + R_KERNEL, 0, H_HALL)}
        {V(8.8, 1.2, H_ROOF)}
        {V(9.6, 1.1, H_CELLS)}
      </g>
      {/* the cell's window */}
      <rect x={sy(12) - 4} y={ez(1.4)} width={8} height={0.5 * E} fill="var(--bg, #fff)" stroke="currentColor" strokeWidth={THIN} />
      <line x1={sy(-2)} y1={GY} x2={sy(12.5)} y2={GY} stroke="currentColor" strokeWidth={WALL} />
    </g>
  )
}

function ElevationSection({ hov }) {
  const room = hov != null ? ROOMS[hov] : null
  // hover: the selected room's extent, projected onto each view's ground line
  const bracket = (h, i) => {
    const v = room.pts.map((p) => p[i])
    const a = h(Math.min(...v)), b = h(Math.max(...v))
    return <path d={`M ${a} ${GY + 14} v 12 M ${b} ${GY + 14} v 12 M ${a} ${GY + 20} H ${b}`} fill="none" stroke="var(--red)" strokeWidth={MID} />
  }
  return (
    <svg viewBox={`0 0 ${PW} ${EH}`} style={{ width: "100%", height: "auto", display: "block", marginBottom: "0.4rem" }}>
      <SouthElevation hov={hov} />
      <SectionAA hov={hov} />
      <text x={ex(0)} y={EH - 8} fill="currentColor" style={label(16)}>SOUTH ELEVATION</text>
      <text x={sy(-1.5)} y={EH - 8} fill="currentColor" style={label(16)}>SECTION A-A</text>
      {room && bracket(ex, 0)}
      {room && bracket(sy, 1)}
    </svg>
  )
}

function CombinedPlan() {
  const [hov, setHov] = useState(null)
  return (
    // .plan-1bit: no antialiasing, then every pixel is thresholded to ink or
    // paper (see #one-bit in layout.astro) — the drawing's line hierarchy is
    // carried by weight alone, like a photocopied CAD sheet
    <div className="plan-1bit" style={{ position: "relative", width: "min(100%, 760px)", color: "var(--ink)" }}
    >
      <ElevationSection hov={hov} />
      <FloorPlan hov={hov} onHover={setHov} />
    </div>
  )
}

// ── Full bio content ──────────────────────────────────────────────────

function FullBio() {
  return (
    <div className="space-y-4" style={{ fontSize: "15px", lineHeight: 1.45 }}>
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

// ── Works & activity list ───────────────────────────────────────────────
// Sectioned CV-style listing (structure after nanuttpp.net/about-1):
// bold section label, dash-prefixed entries, venue/year trailing each line.

const BIO_SECTIONS = [
  {
    title: "Group Exhibition",
    items: [
      { label: "re:complex", meta: "Goethe-Institut Thailand, 7–13 November 2025", url: "/art/eternal-gain-eternal-pain" },
      { label: "Close Inspection From Afar", meta: "ETA BKK, organised by Cache, July 2025", url: "/art/here-now-absolute-elsewhere" },
      { label: "Un_Unsubscribe", meta: "pavilion within The Wrong Biennale 2023, curated by Khristina Ots & Roman Solodkov", url: "https://poetic-garden.netlify.app/" },
    ],
  },
  {
    title: "Selected Works",
    items: [
      { label: "Do The NPCs Hear The Simulated Wind", meta: "PATCH NOTES THAT REFUSE A SETTLED WORLD (co-curated as Stack), Virtual Media Lab, TCDC Bangkok, 2026", url: "/art/do-the-npcs-hear-the-simulated-wind" },
      { label: "Here-now; absolute-elsewhere.", meta: "Close Inspection From Afar, ETA BKK, 2025", url: "/art/here-now-absolute-elsewhere" },
      { label: "Eternal Gain, Eternal Pain. (Would You Still Love Me If I Was A Digital C. elegans)", meta: "Installation, 2025", url: "/art/eternal-gain-eternal-pain" },
      { label: "As if you would still be here, if I keep thinking about you.", meta: "Audiovisual performance, 2026", url: "/art/as-if-you-would-still-be-here" },
      { label: "Poetic Garden", meta: "Un_Unsubscribe pavilion, The Wrong Biennale, 2023", url: "/art/poetic-garden" },
      { label: "Self-censored Step Sequencer", meta: "Net art, Chrome extension, 2026", url: "/art/self-censored-step-sequencer" },
      { label: "Neonatus/Neotokyo", meta: "with Nanut Thanapornrapee, Tokyo Hot Restaurant, Bangkok, 2020", url: "/art/neonatus-neotokyo" },
    ],
  },
  {
    title: "Performances & Live Sets",
    items: [
      { label: "From Scratch Live Coding From Scratch — evals", meta: "Bangkok Kunsthalle, 2025", url: "/art/from-scratch-live-coding" },
      { label: "From Scratch Live Coding From Scratch — Para Cartography", meta: "Nina Next Space, Ho Chi Minh City, 2025", url: "/art/from-scratch-live-coding#vina-v" },
      { label: "UNFEST2025", meta: "with Pasuth Sa-ingthong, Unformat, Bangkok, 2025", url: "/art/unfest2025" },
      { label: "Algorapture", meta: "Jakarta, 2025" },
      { label: "Interlude", meta: "Ho Chi Minh City, 2025" },
      { label: "AlgoSeoul", meta: "Seoul, 2025" },
      { label: "UNBOUND", meta: "sound artist, Theatre Night (Bad Vibes Battle), Host Bangkok, 2025" },
      { label: "Diage Festival", meta: "with CRSRCRSR, ShowDC, Bangkok, 2023" },
      { label: "Road to Diage & Diage Festival", meta: "with CRSRCRSR, Bangkok CityCity Gallery, 2023" },
      { label: "Synecdoche, Synesthesia", meta: "Live coding & AV showcase, Bangkok Kunsthalle, w/ Goethe-Institut Thailand, 2026" },
      { label: "Flux", meta: "2026" },
      { label: "FLOW (Hepna × Saudade)", meta: "Audio-visual night on movement, sound & light in transition, Speaker Box, 2026" },
      { label: "RE:SYNC 2023", meta: "VJ, People of Ari, Bangkok, 2023" },
    ],
    footnote: "Also: Ghost2565 (Bangkok) · NonNonNon Bangkok",
  },
  {
    title: "Curatorial Practice & Organizing",
    items: [
      { label: "Player 2 Has Entered The Server", meta: "co-curator w/ Pathompong Manakitsomboon, as Stack, Goethe-Institut Thailand, 2025", url: "https://stackth.xyz/" },
      { label: "PATCH NOTES THAT REFUSE A SETTLED WORLD", meta: "co-curator, as Stack, with Team Stimulant, in collaboration with Goethe-Institut Thailand, 2026", url: "https://stackth.xyz/" },
      { label: "STACK TOKYO", meta: "as Stack, first live performance in Japan, w/ @kakiaraarai, WPU HOTEL, Shinjuku, Tokyo, 2025", url: "https://stackth.xyz/" },
      { label: "Cornea Cochlear Club", meta: "co-organizer, curator, ongoing", url: "https://www.instagram.com/corneacochlearclub/" },
      { label: "BYOB Bangkok (Bring Your Own Beamer)", meta: "co-organizer, as JAAG, ongoing", url: "/art/byob" },
      { label: "TouchDesigner Bangkok Meetup (TDBKK)", meta: "co-organizer, ongoing", url: "https://tdbkk.xyz/" },
      { label: "Mal Studio", meta: "co-founder, event space, past", url: "https://www.instagram.com/mal._.bkk/" },
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

function WorksList() {
  return (
    <div>
      {BIO_SECTIONS.map((section, si) => (
        <div key={section.title} style={{ marginBottom: "3.2rem" }}>
          <p
            className="kicker"
            style={{
              display: "flex",
              gap: "1em",
              color: "var(--ink)",
              borderTop: "3px solid var(--ink)",
              paddingTop: "0.8rem",
              marginBottom: "0.9rem",
            }}
          >
            <span style={{ color: "var(--soft)" }}>{String(si + 1).padStart(2, "0")}</span>
            {section.title}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {section.items.map((item, i) => (
              <li
                key={i}
                className="about-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.4em 1fr",
                  alignItems: "baseline",
                  borderTop: "1px solid var(--line)",
                  padding: "0.8rem 0",
                  margin: 0,
                }}
              >
                <span style={{ fontFamily: pixel, fontSize: "12px", color: "var(--soft)" }}>→</span>
                <span>
                  {item.url ? (
                    <a
                      href={item.url}
                      className="about-link"
                      target={item.url.startsWith("/") ? undefined : "_blank"}
                      rel={item.url.startsWith("/") ? undefined : "noopener noreferrer"}
                    >
                      {item.label}
                    </a>
                  ) : (
                    item.label
                  )}
                  {item.meta && (
                    <span style={{ display: "block", fontFamily: dataMono, fontSize: "13px", lineHeight: 1.6, color: "var(--soft)", marginTop: "0.2rem" }}>
                      {item.meta}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {section.footnote && (
            <p style={{ fontFamily: dataMono, fontSize: "13px", lineHeight: 1.6, color: "var(--soft)", borderTop: "1px dashed var(--soft)", paddingTop: "0.7rem" }}>
              {section.footnote}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

/** Section toggle: a pixel-font button, inverted while its section is open. */
function Toggle({ open, onClick, openLabel, closedLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`btn${open ? " is-active" : ""}`}
      style={{ marginTop: "2.4rem" }}
    >
      <span aria-hidden="true">{open ? "–" : "+"}</span>
      <span>{open ? openLabel : closedLabel}</span>
    </button>
  )
}

// side-notes hang off a dashed rule
const NOTE = {
  borderLeft: "1px dashed var(--soft)",
  paddingLeft: "1.6rem",
  marginTop: "1.4rem",
}

// ── Page ──────────────────────────────────────────────────────────────

const About = () => {
  const [showFull, setShowFull] = useState(false)
  const [showWorks, setShowWorks] = useState(true)
  const [showPlan, setShowPlan] = useState(true)

  return (
    <div
      className="relative z-10 w-full pb-16"
      style={{ fontFamily: "var(--f-body)", color: "var(--ink)", fontSize: "16px", lineHeight: 1.45 }}
    >
      <style>{`
        .about-link { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
        .about-link:hover { background: var(--ink); color: var(--bg); text-decoration: none; }
        .plan-1bit svg { shape-rendering: crispEdges; filter: url(#one-bit); }
        /* desktop: bio on the left, works & activity on the right */
        .about-cols { max-width: 48rem; padding: 2rem 2rem 0; margin-bottom: 3rem; }
        @media (min-width: 1024px) {
          .about-cols { max-width: 96rem; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 4rem; align-items: start; }
          /* the title row spans both columns, so works & activity starts level
             with the first paragraph (the pull cancels the Toggle's top margin) */
          .about-head { grid-column: 1 / -1; }
          .about-works { margin-top: -2.4rem; }
        }
      `}</style>
      <div className="about-cols">
        <div className="about-head">
        <h1 className="wipe" style={{ margin: "2.5rem 0 2.4rem" }}>About</h1>

        <div className="flex wipe" style={{ marginBottom: "3.5rem" }}>
          {[
            { href: "/cv", label: "CV" },
            { href: "/resume", label: "Resume" },
          ].map(({ href, label }, i) => (
            <a key={href} href={href} className="btn" style={{ marginLeft: i === 0 ? 0 : "-1px" }}>
              {label} <span aria-hidden="true">→</span>
            </a>
          ))}
        </div>
        </div>

        <div>
        <div className="space-y-5 wipe">
        <p className="lead" style={{ fontSize: "clamp(18px, 1.7vw, 22px)" }}>
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
        </div>

        <Toggle open={showFull} onClick={() => setShowFull(v => !v)} openLabel="collapse bio" closedLabel="extended bio" />
        {showFull && (
          <div style={NOTE}>
            <FullBio />
          </div>
        )}

        {/* floor plan toggle */}
        <div>
          <Toggle open={showPlan} onClick={() => setShowPlan(v => !v)} openLabel="close plan" closedLabel="floor plan" />
        </div>
        {showPlan && (
          <div style={{ marginTop: "1.5rem" }}>
            <CombinedPlan />
          </div>
        )}
        </div>

        <div className="about-works">
        <div>
          <Toggle open={showWorks} onClick={() => setShowWorks(v => !v)} openLabel="collapse works & activity" closedLabel="works & activity" />
        </div>
        {showWorks && (
          <div style={{ marginTop: "2.4rem" }}>
            <WorksList />
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default About
