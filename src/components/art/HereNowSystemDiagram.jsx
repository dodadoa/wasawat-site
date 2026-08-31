import { useState, useRef, useCallback, useMemo, useId, useEffect } from "react"

const mono = "'DepartureMono', monospace"
const display = "'TimesNewerRoman', 'Times New Roman', serif"
const fs = (px) => `calc(${px}px * var(--ui-scale, 1))`

const VW = 900
const VH = 1180
const CLOSE_THRESHOLD = 150

const TRI = { top: 40, bottom: 300, left: 60, right: 840 }

const INITIAL = {
  RU: { x: 640, y: 70, label: "RU", sub: "RUSSIA" },
  CN: { x: 800, y: 250, label: "CN", sub: "CHINA" },
  USA: { x: 90, y: 250, label: "USA", sub: "UNITED STATE" },
}

const PLANTS = [
  { life: "SHORT LIFESPAN", name: "Blue globe thistle" },
  { life: "MEDIUM LIFESPAN", name: "Citrus reticulata (mandarin) tree with roots" },
  { life: "LONG LIFESPAN", name: "Salix vines" },
]

const EXHIBITS = [
  { id: "A", x: 60, title: "Log history, our possible future", note: "The archived text — a compounding record fed back into the next prompt, building continuous memory across sessions." },
  { id: "B", x: 340, title: "Orbital diagram and their coordinates", note: "The live positions and distances of RU / CN / USA, read out as an orbital diagram — this drawing, in effect." },
  { id: "C", x: 620, title: "Moving image, generated realtime", note: "StreamDiffusion visuals prompted from the current story, projected on the top screen and printed below." },
]

const COUNTRY_NAME = { RU: "Russia", CN: "China", USA: "the United States" }

const CLOSE_TEMPLATES = [
  "{A} and {B} draw within striking distance — markets shudder as envoys cancel their flights.",
  "Satellites over {A} track {B}'s fleet; the corridor between them narrows to a single contested lane.",
  "{A} accuses {B} of provocation as their orbits cross. The archive logs another near-miss.",
  "A border of light appears between {A} and {B} — too close, the analysts say, for either to look away.",
  "Trade routes between {A} and {B} freeze overnight. Every nation is asked, quietly, to choose a side.",
]
const FAR_TEMPLATES = [
  "{A} and {B} drift to opposite arcs of the sky; back-channel talks resume over dinner.",
  "The distance between {A} and {B} widens. Trade routes reopen, and the tension in the log finally eases.",
  "{A} watches {B} recede past the horizon. A fragile quiet settles over both capitals.",
  "With {A} and {B} far apart, the archive records a rare season of stability.",
  "{A} and {B}, no longer in each other's shadow, exchange the first friendly cable in months.",
]

function pickStory(pair, isClose) {
  const templates = isClose ? CLOSE_TEMPLATES : FAR_TEMPLATES
  const t = templates[Math.floor(Math.random() * templates.length)]
  return t.replace("{A}", COUNTRY_NAME[pair.a]).replace("{B}", COUNTRY_NAME[pair.b])
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function initialVelocities() {
  return {
    RU: { vx: 34, vy: 10 },
    CN: { vx: -14, vy: 30 },
    USA: { vx: -20, vy: -34 },
  }
}

export default function HereNowSystemDiagram() {
  const [nodes, setNodes] = useState(INITIAL)
  const [dragging, setDragging] = useState(null)
  const [activeExhibit, setActiveExhibit] = useState(null)
  const [playing, setPlaying] = useState(true)
  const svgRef = useRef(null)
  const velRef = useRef(initialVelocities())
  const uid = useId().replace(/:/g, "")

  const pairs = useMemo(() => {
    const keys = Object.keys(nodes)
    const out = []
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        out.push({ a: keys[i], b: keys[j], d: dist(nodes[keys[i]], nodes[keys[j]]) })
      }
    }
    return out
  }, [nodes])

  const minPair = useMemo(() => pairs.reduce((m, p) => (p.d < m.d ? p : m), pairs[0]), [pairs])
  const isClose = minPair.d < CLOSE_THRESHOLD

  const centroid = useMemo(() => {
    const vals = Object.values(nodes)
    return {
      x: vals.reduce((s, v) => s + v.x, 0) / vals.length,
      y: vals.reduce((s, v) => s + v.y, 0) / vals.length,
    }
  }, [nodes])

  const toSvgPoint = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * VW
    const y = ((clientY - rect.top) / rect.height) * VH
    return {
      x: Math.max(TRI.left - 20, Math.min(TRI.right + 20, x)),
      y: Math.max(TRI.top - 10, Math.min(TRI.bottom, y)),
    }
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragging) return
    const p = toSvgPoint(e.clientX, e.clientY)
    setNodes((prev) => ({ ...prev, [dragging]: { ...prev[dragging], x: p.x, y: p.y } }))
  }, [dragging, toSvgPoint])

  const startDrag = useCallback((key) => (e) => {
    e.preventDefault()
    setDragging(key)
  }, [])
  const endDrag = useCallback(() => setDragging(null), [])

  // real gravitational three-body simulation, driving the diagram above
  const draggingRef = useRef(dragging)
  draggingRef.current = dragging

  useEffect(() => {
    if (!playing) return
    // setInterval rather than requestAnimationFrame: rAF is fully paused in
    // a backgrounded/hidden tab, which would freeze the orbit; a timer
    // keeps it (throttled but) progressing so the diagram stays live.
    let timer
    let last = performance.now()
    const G = 26000
    const damping = 0.999
    const softening = 34

    const step = () => {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      setNodes((prev) => {
        const keys = Object.keys(prev)
        const vel = velRef.current
        const acc = {}
        keys.forEach((k) => (acc[k] = { ax: 0, ay: 0 }))
        for (let i = 0; i < keys.length; i++) {
          for (let j = 0; j < keys.length; j++) {
            if (i === j) continue
            const a = prev[keys[i]], b = prev[keys[j]]
            const dx = b.x - a.x, dy = b.y - a.y
            const distSq = dx * dx + dy * dy + softening * softening
            const d = Math.sqrt(distSq)
            const f = G / distSq
            acc[keys[i]].ax += (f * dx) / d
            acc[keys[i]].ay += (f * dy) / d
          }
        }
        const next = {}
        keys.forEach((k) => {
          if (k === draggingRef.current) {
            next[k] = prev[k]
            return
          }
          vel[k].vx = (vel[k].vx + acc[k].ax * dt) * damping
          vel[k].vy = (vel[k].vy + acc[k].ay * dt) * damping
          let nx = prev[k].x + vel[k].vx * dt
          let ny = prev[k].y + vel[k].vy * dt
          if (nx < TRI.left - 20 || nx > TRI.right + 20) {
            vel[k].vx *= -0.9
            nx = Math.max(TRI.left - 20, Math.min(TRI.right + 20, nx))
          }
          if (ny < TRI.top - 10 || ny > TRI.bottom) {
            vel[k].vy *= -0.9
            ny = Math.max(TRI.top - 10, Math.min(TRI.bottom, ny))
          }
          next[k] = { ...prev[k], x: nx, y: ny }
        })
        return next
      })
    }
    timer = setInterval(step, 16)
    return () => clearInterval(timer)
  }, [playing])

  const resetSimulation = useCallback(() => {
    velRef.current = initialVelocities()
    setNodes(INITIAL)
  }, [])

  // fake speculative-fiction line, regenerated whenever the closest pair
  // or its close/far state changes — a stand-in for the real LLM step
  const [story, setStory] = useState(() => pickStory(minPair, isClose))
  const storyKeyRef = useRef(`${minPair.a}-${minPair.b}-${isClose}`)
  useEffect(() => {
    const key = `${minPair.a}-${minPair.b}-${isClose}`
    if (key !== storyKeyRef.current) {
      storyKeyRef.current = key
      setStory(pickStory(minPair, isClose))
    }
  }, [minPair.a, minPair.b, isClose])

  const accent = isClose ? "#c0392b" : "#2f7a4f"
  const flowSpeed = isClose ? "0.7s" : "2.4s"

  // ---- fixed layout coordinates for the flow diagram ----
  const storyBox = { x: 260, y: 340, w: 380, h: 70 }
  const branchFar = { x: 100, y: 460, w: 300, h: 46 }
  const branchClose = { x: 500, y: 460, w: 300, h: 46 }
  const resultFar = { x: 100, y: 520, w: 300, h: 78 }
  const resultClose = { x: 500, y: 520, w: 300, h: 78 }
  const logBox = { x: 260, y: 640, w: 380, h: 64 }
  const genBox = { x: 260, y: 740, w: 380, h: 60 }
  const exhibitY = 850
  const exhibitW = 240
  const exhibitH = 56

  const otherBox = { x: 700, y: 340, w: 180, h: 40 }
  const exhibitD = { x: 700, y: 400, w: 180, h: 100 }
  const plantsY0 = 520

  const activeResult = isClose ? resultClose : resultFar
  const activeBranch = isClose ? branchClose : branchFar
  const dimOpacity = 0.32

  return (
    <div style={{ fontFamily: mono, margin: "2rem 0" }}>
      <style>{`
        @keyframes hn-flow-${uid} {
          to { stroke-dashoffset: -24; }
        }
        @keyframes hn-pulse-${uid} {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .hn-flow-${uid} {
          stroke-dasharray: 5 7;
          animation: hn-flow-${uid} ${flowSpeed} linear infinite;
        }
        .hn-node-${uid} { cursor: grab; }
        .hn-node-${uid}:active { cursor: grabbing; }
        .hn-exhibit-${uid} { cursor: pointer; transition: transform 0.15s ease; }
        .hn-exhibit-${uid}:hover { transform: translateY(-2px); }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          style={{
            fontFamily: mono, fontSize: fs(9), letterSpacing: "0.06em",
            color: "var(--text, #1a1a1a)", background: "none",
            border: "1px solid var(--text, #1a1a1a)", padding: "5px 12px", cursor: "pointer",
          }}
        >
          {playing ? "⏸ pause orbit" : "▶ run orbit"}
        </button>
        <button
          type="button"
          onClick={resetSimulation}
          style={{
            fontFamily: mono, fontSize: fs(9), letterSpacing: "0.06em",
            color: "var(--text-muted, #666)", background: "none",
            border: "1px solid var(--border-subtle, #ccc)", padding: "5px 12px", cursor: "pointer",
          }}
        >
          ↺ reset
        </button>
        <div style={{ fontSize: fs(8), color: "var(--text-muted, #999)" }}>
          a real gravitational three-body simulation — drag any body to perturb it
        </div>
      </div>

      <div style={{
        border: "1px solid var(--border-subtle, #ddd)",
        background: "var(--bg-canvas, #fff)",
        touchAction: "none",
        position: "relative",
        overflow: "hidden",
      }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          onMouseMove={onPointerMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <defs>
            <pattern id={`dots-${uid}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.12" />
            </pattern>
            <marker id={`arrow-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" opacity="0.55" />
            </marker>
          </defs>

          <rect x="0" y="0" width={VW} height={VH} fill={`url(#dots-${uid})`} style={{ color: "var(--text-muted, #999)" }} />

          {/* ===== title ===== */}
          <text x="40" y="52" style={{ fontFamily: display, fontWeight: "bold", fontSize: "40px", fill: "var(--text, #1a1a1a)" }}>
            3 CELESTIAL BODIES
          </text>
          <text x="40" y="76" style={{ fontFamily: mono, fontSize: "10.5px", letterSpacing: "0.02em", fill: "var(--text-muted, #888)" }}>
            gravity moves RU / CN / USA — the closest pair drives the story below
          </text>

          {/* ===== triangle of nations ===== */}
          {pairs.map((p) => (
            <line
              key={p.a + p.b}
              x1={nodes[p.a].x} y1={nodes[p.a].y}
              x2={nodes[p.b].x} y2={nodes[p.b].y}
              stroke={p === minPair ? accent : "var(--text-muted, #bbb)"}
              strokeWidth={p === minPair ? 2 : 1}
              className={p === minPair ? `hn-flow-${uid}` : ""}
            />
          ))}
          {Object.values(nodes).map((n, i) => (
            <line key={"c" + i} x1={n.x} y1={n.y} x2={centroid.x} y2={centroid.y} stroke="var(--text-muted, #ddd)" strokeWidth="1" />
          ))}
          <circle cx={centroid.x} cy={centroid.y} r="3" fill="var(--text-muted, #999)" />
          {/* connector from centroid down to story box */}
          <path
            d={`M ${centroid.x} ${centroid.y} L ${storyBox.x + storyBox.w / 2} ${storyBox.y}`}
            fill="none" stroke={accent} strokeWidth="1.6" className={`hn-flow-${uid}`}
            markerEnd={`url(#arrow-${uid})`} style={{ color: accent }}
          />

          {Object.entries(nodes).map(([key, n]) => (
            <g key={key} transform={`translate(${n.x},${n.y})`} className={`hn-node-${uid}`} onMouseDown={startDrag(key)}>
              <rect x={-7} y={-7} width={14} height={14} fill="var(--text, #1a1a1a)" />
              <text x={0} y={-16} textAnchor="middle" style={{ fontFamily: mono, fontSize: "15px", fontWeight: "bold", fill: "var(--text, #1a1a1a)" }}>
                {n.label}
              </text>
              <text x={0} y={26} textAnchor="middle" style={{ fontFamily: mono, fontSize: "8.5px", letterSpacing: "0.08em", fill: "var(--text-muted, #999)" }}>
                [{n.sub}]
              </text>
            </g>
          ))}

          {/* ===== tension readout ===== */}
          <g transform={`translate(${VW - 300},${TRI.top - 10})`}>
            <rect x="0" y="0" width="260" height="46" fill="none" stroke={accent} strokeWidth="1.2" />
            <circle cx="16" cy="23" r="4" fill={accent}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur={flowSpeed} repeatCount="indefinite" />
            </circle>
            <text x="30" y="19" style={{ fontFamily: mono, fontSize: "9.5px", fontWeight: "bold", fill: accent }}>
              {minPair.a}–{minPair.b} · {isClose ? "CLOSE" : "FAR"}
            </text>
            <text x="30" y="33" style={{ fontFamily: mono, fontSize: "8px", fill: "var(--text-muted, #888)" }}>
              distance {minPair.d.toFixed(0)} · {isClose ? "conflict rising" : "tension easing"}
            </text>
          </g>

          {/* ===== story ===== */}
          <FlowBox {...storyBox} label="STORY" text="Story based on proximity at a time of celestial bodies" bold />
          <path d={`M ${storyBox.x + storyBox.w * 0.28} ${storyBox.y + storyBox.h} L ${branchFar.x + branchFar.w / 2} ${branchFar.y}`} fill="none" stroke="var(--text-muted,#999)" strokeWidth="1" markerEnd={`url(#arrow-${uid})`} />
          <path d={`M ${storyBox.x + storyBox.w * 0.72} ${storyBox.y + storyBox.h} L ${branchClose.x + branchClose.w / 2} ${branchClose.y}`} fill="none" stroke="var(--text-muted,#999)" strokeWidth="1" markerEnd={`url(#arrow-${uid})`} />

          <FlowBox {...branchFar} label="IF FAR AWAY" text="" active={!isClose} accent="#2f7a4f" small />
          <FlowBox {...branchClose} label="IF CLOSE" text="" active={isClose} accent="#c0392b" small />

          <line x1={branchFar.x + branchFar.w / 2} y1={branchFar.y + branchFar.h} x2={resultFar.x + resultFar.w / 2} y2={resultFar.y} stroke="var(--text-muted,#999)" strokeWidth="1" />
          <line x1={branchClose.x + branchClose.w / 2} y1={branchClose.y + branchClose.h} x2={resultClose.x + resultClose.w / 2} y2={resultClose.y} stroke="var(--text-muted,#999)" strokeWidth="1" />

          <FlowBox {...resultFar} label="" text="Suggests good diplomatic relationship — when they drift apart, tension eases." active={!isClose} accent="#2f7a4f" italic />
          <FlowBox {...resultClose} label="" text="Suggests conflict — trade wars, space rivalries, the slow pressure that forces every nation to choose a side." active={isClose} accent="#c0392b" italic />

          {/* converge to log */}
          <path d={`M ${resultFar.x + resultFar.w / 2} ${resultFar.y + resultFar.h} L ${logBox.x + logBox.w / 2} ${logBox.y}`} fill="none" stroke={!isClose ? accent : "var(--text-muted,#ccc)"} strokeWidth={!isClose ? 1.8 : 1} className={!isClose ? `hn-flow-${uid}` : ""} markerEnd={`url(#arrow-${uid})`} style={{ color: accent }} />
          <path d={`M ${resultClose.x + resultClose.w / 2} ${resultClose.y + resultClose.h} L ${logBox.x + logBox.w / 2} ${logBox.y}`} fill="none" stroke={isClose ? accent : "var(--text-muted,#ccc)"} strokeWidth={isClose ? 1.8 : 1} className={isClose ? `hn-flow-${uid}` : ""} markerEnd={`url(#arrow-${uid})`} style={{ color: accent }} />

          <FlowBox {...logBox} label="LOG" text="History, fiction narrative, stack of context — feeds back into the next prompt" />
          <path d={`M ${logBox.x + logBox.w / 2} ${logBox.y + logBox.h} L ${genBox.x + genBox.w / 2} ${genBox.y}`} fill="none" stroke={accent} strokeWidth="1.8" className={`hn-flow-${uid}`} markerEnd={`url(#arrow-${uid})`} style={{ color: accent }} />

          <FlowBox {...genBox} label="VISUAL GENERATE" text="Prompting the story from history and the current situation (LLM + StreamDiffusion)" fill="var(--text, #1a1a1a)" textColor="#fff" />

          {EXHIBITS.map((ex) => {
            const on = activeExhibit === ex.id
            return (
              <g key={ex.id} className={`hn-exhibit-${uid}`} onClick={() => setActiveExhibit(on ? null : ex.id)}>
                <path d={`M ${genBox.x + genBox.w / 2} ${genBox.y + genBox.h} L ${ex.x + exhibitW / 2} ${exhibitY}`} fill="none" stroke="var(--text-muted,#999)" strokeWidth="1" markerEnd={`url(#arrow-${uid})`} />
                <rect x={ex.x} y={exhibitY} width={exhibitW} height={exhibitH} fill={on ? "var(--text,#1a1a1a)" : "var(--bg-canvas,#fff)"} stroke="var(--text,#1a1a1a)" strokeWidth="1.2" />
                <text x={ex.x + 12} y={exhibitY + 20} style={{ fontFamily: mono, fontSize: "9px", fontWeight: "bold", fill: on ? "#fff" : "var(--text,#1a1a1a)" }}>
                  EXHIBIT {ex.id}
                </text>
                <text x={ex.x + 12} y={exhibitY + 38} style={{ fontFamily: mono, fontSize: "8px", fill: on ? "#ddd" : "var(--text-muted,#888)" }}>
                  {wrap(ex.title, 34)[0]}
                </text>
                <text x={ex.x + 12} y={exhibitY + 49} style={{ fontFamily: mono, fontSize: "8px", fill: on ? "#ddd" : "var(--text-muted,#888)" }}>
                  {wrap(ex.title, 34)[1] || ""}
                </text>
              </g>
            )
          })}

          {/* ===== other nations / floral branch ===== */}
          <FlowBox {...otherBox} label="OTHER NATIONS" text="" small centered />
          <path d={`M ${otherBox.x + otherBox.w / 2} ${otherBox.y + otherBox.h} L ${exhibitD.x + exhibitD.w / 2} ${exhibitD.y}`} fill="none" stroke="var(--text-muted,#999)" strokeWidth="1" markerEnd={`url(#arrow-${uid})`} />
          <g className={`hn-exhibit-${uid}`} onClick={() => setActiveExhibit(activeExhibit === "D" ? null : "D")}>
            <rect x={exhibitD.x} y={exhibitD.y} width={exhibitD.w} height={exhibitD.h} fill={activeExhibit === "D" ? "var(--text,#1a1a1a)" : "var(--bg-canvas,#fff)"} stroke="var(--text,#1a1a1a)" strokeWidth="1.2" />
            <text x={exhibitD.x + 10} y={exhibitD.y + 18} style={{ fontFamily: mono, fontSize: "9px", fontWeight: "bold", fill: activeExhibit === "D" ? "#fff" : "var(--text,#1a1a1a)" }}>EXHIBIT D</text>
            <text x={exhibitD.x + 10} y={exhibitD.y + 34} style={{ fontFamily: mono, fontSize: "8px", fill: activeExhibit === "D" ? "#ddd" : "var(--text-muted,#888)" }}>Floral</text>
            <text x={exhibitD.x + 10} y={exhibitD.y + 46} style={{ fontFamily: mono, fontSize: "8px", fill: activeExhibit === "D" ? "#ddd" : "var(--text-muted,#888)" }}>installation</text>
            <text x={exhibitD.x + 10} y={exhibitD.y + 62} style={{ fontFamily: mono, fontSize: "7px", fill: activeExhibit === "D" ? "#bbb" : "var(--text-muted,#aaa)" }}>tap for detail →</text>
          </g>
          <path d={`M ${exhibitD.x + exhibitD.w / 2} ${exhibitD.y + exhibitD.h} L ${exhibitD.x + exhibitD.w / 2} ${plantsY0}`} fill="none" stroke="var(--text-muted,#999)" strokeWidth="1" markerEnd={`url(#arrow-${uid})`} />
          {PLANTS.map((p, i) => (
            <g key={p.life} transform={`translate(${exhibitD.x},${plantsY0 + i * 44})`}>
              <rect x="0" y="0" width={exhibitD.w} height="34" fill="none" stroke="var(--text-muted,#bbb)" strokeWidth="1" />
              <text x="10" y="13" style={{ fontFamily: mono, fontSize: "7.5px", letterSpacing: "0.06em", fill: "var(--text-muted,#888)" }}>{p.life}</text>
              <text x="10" y="26" style={{ fontFamily: mono, fontSize: "7.5px", fill: "var(--text,#1a1a1a)" }}>{wrap(p.name, 26)[0]}</text>
            </g>
          ))}

          {/* ===== here-now hourglass ===== */}
          <g transform={`translate(${VW / 2 - 90}, ${VH - 190})`}>
            <text x="90" y="-14" textAnchor="middle" style={{ fontFamily: mono, fontSize: "8px", letterSpacing: "0.1em", fill: "var(--text-muted,#888)" }}>ABSOLUTE FUTURE</text>
            <path d="M 10 0 L 170 0 L 90 80 Z" fill="none" stroke="var(--text-muted,#999)" strokeWidth="1" />
            <path d="M 10 160 L 170 160 L 90 80 Z" fill="none" stroke="var(--text-muted,#999)" strokeWidth="1" />
            <circle cx="90" cy="80" r="5" fill={accent}>
              <animate attributeName="r" values="4;6;4" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <text x="90" y="72" textAnchor="middle" style={{ fontFamily: mono, fontSize: "8px", fontWeight: "bold", fill: "var(--text,#1a1a1a)" }}>HERE</text>
            <text x="90" y="102" textAnchor="middle" style={{ fontFamily: mono, fontSize: "8px", fontWeight: "bold", fill: "var(--text,#1a1a1a)" }}>NOW</text>
            <text x="-16" y="84" textAnchor="end" style={{ fontFamily: mono, fontSize: "7.5px", fill: "var(--text-muted,#888)" }}>ABSOLUTE</text>
            <text x="-16" y="94" textAnchor="end" style={{ fontFamily: mono, fontSize: "7.5px", fill: "var(--text-muted,#888)" }}>ELSEWHERE</text>
            <text x="196" y="84" textAnchor="start" style={{ fontFamily: mono, fontSize: "7.5px", fill: "var(--text-muted,#888)" }}>ABSOLUTE</text>
            <text x="196" y="94" textAnchor="start" style={{ fontFamily: mono, fontSize: "7.5px", fill: "var(--text-muted,#888)" }}>ELSEWHERE</text>
            <text x="90" y="176" textAnchor="middle" style={{ fontFamily: mono, fontSize: "8px", letterSpacing: "0.1em", fill: "var(--text-muted,#888)" }}>ABSOLUTE PAST</text>
          </g>
        </svg>
      </div>

      <div style={{
        marginTop: "1px",
        padding: "12px 14px",
        background: "var(--text, #1a1a1a)",
        color: "#fff",
        borderLeft: `3px solid ${accent}`,
      }}>
        <div style={{ fontSize: fs(8), letterSpacing: "0.14em", color: "#999", textTransform: "uppercase", marginBottom: "6px" }}>
          Visual generate · fake speculative fiction, live
        </div>
        <div style={{ fontSize: fs(10.5), lineHeight: 1.6, fontStyle: "italic" }}>
          "{story}"
        </div>
      </div>

      {activeExhibit && (
        <div style={{ marginTop: "10px", padding: "10px 14px", border: "1px solid var(--border-subtle,#ddd)", background: "var(--bg-canvas,#fff)" }}>
          <div style={{ fontSize: fs(10.5), color: "var(--text,#1a1a1a)", marginBottom: "4px", fontWeight: "bold" }}>
            Exhibit {activeExhibit} — {(EXHIBITS.find((e) => e.id === activeExhibit) || { title: "Floral installation" }).title}
          </div>
          <div style={{ fontSize: fs(9.5), color: "var(--text-muted,#666)", lineHeight: 1.6 }}>
            {activeExhibit === "D"
              ? "A symbol not only for us but for others and Thailand as well — nations that neither lead nor dominate, but whose proximity and posture quietly tilt the balance. Growing or wilting by the end of the exhibition."
              : EXHIBITS.find((e) => e.id === activeExhibit).note}
          </div>
        </div>
      )}
    </div>
  )
}

function wrap(str, n) {
  const words = str.split(" ")
  const lines = [""]
  for (const w of words) {
    const line = lines[lines.length - 1]
    if ((line + " " + w).trim().length > n) lines.push(w)
    else lines[lines.length - 1] = (line + " " + w).trim()
  }
  return lines
}

function FlowBox({ x, y, w, h, label, text, active = true, accent, small, italic, centered, fill, textColor }) {
  const border = accent && active ? accent : "var(--text, #1a1a1a)"
  const opacity = active ? 1 : 0.32
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} fill={fill || "var(--bg-canvas, #fff)"} stroke={border} strokeWidth={accent && active ? 1.6 : 1} />
      {label && (
        <text x={x + w / 2} y={y + (text ? 18 : h / 2 + 4)} textAnchor="middle" style={{ fontFamily: mono, fontSize: small ? "9px" : "10px", fontWeight: "bold", letterSpacing: "0.04em", fill: textColor || "var(--text, #1a1a1a)" }}>
          {label}
        </text>
      )}
      {text && (
        wrap(text, small ? 30 : 46).slice(0, 3).map((line, i) => (
          <text
            key={i}
            x={x + w / 2}
            y={y + (label ? 32 : 20) + i * 12}
            textAnchor="middle"
            style={{ fontFamily: mono, fontSize: "8px", fontStyle: italic ? "italic" : "normal", fill: textColor || "var(--text-muted, #666)" }}
          >
            {line}
          </text>
        ))
      )}
    </g>
  )
}
