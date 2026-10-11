import { useState, useRef, useCallback } from "react"

const mono = "'DepartureMono', monospace"
const display = "'403Mesapholic', monospace"
// match the top nav (navigator.astro) for the step title/description
const navFont = "'PragmataPro Mono', ui-monospace, Menlo, monospace"
// match .art-detail-body: 12px body text scaled by --ui-scale
const fs = (px) => `calc(${px}px * var(--ui-scale, 1))`

function useSoftPress() {
  const ref = useRef(null)
  const animRef = useRef(null)
  const velRef = useRef(0)
  const posRef = useRef(0)
  const pressedRef = useRef(false)

  const spring = useCallback((target, stiffness = 160, damping = 16) => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const force = -stiffness * (posRef.current - target) - damping * velRef.current
      velRef.current += force * dt
      posRef.current += velRef.current * dt
      if (ref.current) {
        ref.current.style.transform = `scaleY(${1 + posRef.current})`
      }
      if (Math.abs(posRef.current - target) > 0.001 || Math.abs(velRef.current) > 0.001) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        posRef.current = target
        velRef.current = 0
        if (ref.current) ref.current.style.transform = `scaleY(${1 + target})`
      }
    }
    animRef.current = requestAnimationFrame(tick)
  }, [])

  const onMouseDown = useCallback(() => {
    pressedRef.current = true
    posRef.current = -0.18
    velRef.current = 0
    if (ref.current) ref.current.style.transform = `scaleY(0.82)`
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }, [])

  const onMouseUp = useCallback(() => {
    pressedRef.current = false
    spring(0)
  }, [spring])

  return { ref, onMouseDown, onMouseUp, onMouseLeave: onMouseUp }
}

let _feltId = 0
function SoftButton({ onClick, disabled, children, accent = "var(--ink)" }) {
  const { ref, onMouseDown, onMouseUp, onMouseLeave } = useSoftPress()
  const idRef = useRef(`felt-${++_feltId}`)
  const filterId = idRef.current
  const disabledColor = "var(--line)"
  const color = disabled ? disabledColor : accent

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseDown={disabled ? undefined : onMouseDown}
      onMouseUp={disabled ? undefined : onMouseUp}
      onMouseLeave={disabled ? undefined : onMouseLeave}
      style={{
        position: "relative",
        fontFamily: mono,
        fontSize: fs(9),
        letterSpacing: "0.12em",
        color: disabled ? disabledColor : "var(--ink)",
        background: "none",
        border: "none",
        padding: 0,
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span
        ref={ref}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 14px",
          background: "transparent",
          border: `1px solid ${color}`,
          transformOrigin: "center bottom",
          overflow: "hidden",
          position: "relative",
          minWidth: "72px",
        }}
      >
        <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
      </span>
    </button>
  )
}

const CELLS = [
  {
    id: 1, row: 0, col: 0,
    label: "Presence of pain",
    verdict: "BAD",
    color: "var(--ink)",
    note: "Suffering is a negative state for the person experiencing it.",
  },
  {
    id: 3, row: 0, col: 1,
    label: "Absence of pain",
    verdict: "GOOD",
    color: "var(--soft)",
    note: "The lack of pain is good — even without a subject to benefit from it. Non-existence cannot be harmed.",
  },
  {
    id: 2, row: 1, col: 0,
    label: "Presence of pleasure",
    verdict: "GOOD",
    color: "var(--soft)",
    note: "Joy, connection, and fulfilment are positive states for the person who lives.",
  },
  {
    id: 4, row: 1, col: 1,
    label: "Absence of pleasure",
    verdict: "NOT BAD",
    color: "var(--soft)",
    note: "There is no one to be deprived. A non-existent person cannot miss what they never had.",
  },
]

const STEPS = [
  {
    active: new Set([1]),
    title: "① Pain exists",
    body: "When a person comes into existence, they will experience pain — illness, grief, boredom, loss. This is straightforwardly BAD.",
  },
  {
    active: new Set([1, 2]),
    title: "② Pleasure exists",
    body: "They also experience pleasure — love, beauty, achievement. This is GOOD. Both are real, felt by a real person.",
  },
  {
    active: new Set([1, 2, 3]),
    title: "③ Absence of pain",
    body: "If X is never born, pain is absent. Benatar holds this is GOOD — even without a subject to benefit. The absence of suffering has positive value on its own.",
  },
  {
    active: new Set([1, 2, 3, 4]),
    title: "④ Absence of pleasure",
    body: "Pleasure is also absent in non-existence. But this is NOT BAD — there is nobody being deprived. Only an absence, with no subject left to mourn it.",
  },
  {
    active: new Set([1, 2, 3, 4]),
    asymmetry: true,
    title: "The asymmetry",
    body: "③ GOOD ≠ ④ NOT BAD. Non-existence eliminates the certain harm of pain (always GOOD) while the loss of pleasure is not bad (no deprivation). Coming into existence is therefore always a harm.",
  },
]

export default function BenatarMatrix() {
  const [step, setStep] = useState(0)
  const [hoveredId, setHoveredId] = useState(null)

  const current = STEPS[step]
  const isActive = (id) => current.active.has(id)
  const isAsymmetry = current.asymmetry

  return (
    <div style={{ fontFamily: mono, maxWidth: "600px", margin: "2rem 0" }}>

      {/* matrix */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--line)", border: "1px solid var(--line)", marginBottom: "1px" }}>

        {/* column headers */}
        <div style={{ background: "var(--bg)", padding: "8px 12px", fontSize: fs(9), letterSpacing: "0.14em", color: "var(--soft)", textTransform: "uppercase" }}>
          Scenario A · exists
        </div>
        <div style={{ background: "var(--bg)", padding: "8px 12px", fontSize: fs(9), letterSpacing: "0.14em", color: "var(--soft)", textTransform: "uppercase" }}>
          Scenario B · never exists
        </div>

        {/* cells in order: [1,3] top row, [2,4] bottom row */}
        {[[1, 3], [2, 4]].map(([leftId, rightId]) =>
          [leftId, rightId].map((id) => {
            const cell = CELLS.find((c) => c.id === id)
            const active = isActive(id)
            const hovered = hoveredId === id
            const asymHighlight = isAsymmetry && (id === 3 || id === 4)

            return (
              <div
                key={id}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  padding: "16px 14px",
                  // inactive cells drop to dimmed ink; the pair under
                  // discussion gets a thick ink rule
                  background: "var(--bg)",
                  cursor: "default",
                  position: "relative",
                  outline: asymHighlight ? "3px solid var(--ink)" : "none",
                  outlineOffset: "-3px",
                }}
              >
                <div style={{ fontSize: fs(8), letterSpacing: "0.22em", color: "var(--soft)", marginBottom: "6px", textTransform: "uppercase" }}>
                  ({id})
                </div>
                <div style={{ fontSize: fs(10), color: active ? "var(--ink)" : "var(--soft)", marginBottom: "8px", lineHeight: 1.35 }}>
                  {cell.label}
                </div>
                <div style={{
                  display: "inline-block",
                  fontFamily: display,
                  fontSize: fs(9),
                  letterSpacing: "0.1em",
                  color: active ? cell.color : "var(--soft)",
                  borderBottom: active ? `1px solid ${cell.color}` : "1px solid transparent",
                  paddingBottom: "1px",
                }}>
                  {cell.verdict}
                </div>
                {hovered && active && (
                  <div style={{
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: 0,
                    width: "220px",
                    height: "72px",
                    background: "var(--bg)",
                    color: "var(--ink)",
                    border: "1px solid var(--ink)",
                    boxShadow: "6px 6px 0 -1px var(--bg), 6px 6px 0 0 var(--ink)",
                    fontSize: fs(9),
                    lineHeight: 1.6,
                    padding: "8px 10px",
                    zIndex: 10,
                    pointerEvents: "none",
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}>
                    {cell.note}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* asymmetry annotation */}
      {isAsymmetry && (
        <div style={{
          fontSize: fs(9),
          letterSpacing: "0.08em",
          color: "var(--soft)",
          padding: "5px 12px",
          borderLeft: "3px solid var(--ink)",
          marginBottom: "1px",
          background: "transparent",
        }}>
          asymmetry between ③ and ④
        </div>
      )}

      {/* step text */}
      <div style={{ padding: "14px 0 12px", borderTop: "1px solid var(--line)", marginTop: "12px" }}>
        <div style={{ fontFamily: navFont, fontSize: fs(12), letterSpacing: "0.06em", color: "var(--ink)", marginBottom: "7px" }}>
          {current.title}
        </div>
        <div style={{ fontFamily: navFont, fontSize: fs(12), color: "var(--soft)", lineHeight: 1.65 }}>
          {current.body}
        </div>
      </div>

      {/* navigation */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
        <SoftButton
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          accent="var(--ink)"
        >
          ← prev
        </SoftButton>
        <div style={{ flex: 1, display: "flex", gap: "4px", justifyContent: "center" }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: i === step ? "var(--ink)" : "transparent",
                border: "1px solid var(--ink)",
                padding: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <SoftButton
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          accent="var(--ink)"
        >
          next →
        </SoftButton>
      </div>
    </div>
  )
}
