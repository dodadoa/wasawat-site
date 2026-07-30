import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { Line, Html } from "@react-three/drei"
import * as THREE from "three"

const PAIRS = [
  ["computational system", "ethical questions"],
  ["simulation",           "physical world"],
  ["interface",            "the body"],
  ["worm's connectome",    "consciousness"],
  ["screen",               "what it displays"],
  ["code",                 "material"],
]

// ── Plane geometry constants ──────────────────────────────────────────
const PW = 2.0     // plane width
const PH = 2.6     // plane height
const L_POS = new THREE.Vector3(-2.7, 0, 0)
const R_POS = new THREE.Vector3(2.7, 0, 0)
const L_ROT = new THREE.Euler(0.06, 0.52, 0)
const R_ROT = new THREE.Euler(0.06, -0.52, 0)
const Y_VALS = [-0.9, -0.54, -0.18, 0.18, 0.54, 0.9]

function toWorld(lx, ly, pos, rot) {
  return new THREE.Vector3(lx, ly, 0).applyEuler(rot).add(pos)
}

// Pre-built local-space grid lines (reused by both planes)
const GRID_H = Array.from({ length: 6 }, (_, i) => {
  const y = -PH / 2 + i * PH / 5
  return [[-PW / 2, y, 0], [PW / 2, y, 0]]
})
const GRID_V = Array.from({ length: 6 }, (_, i) => {
  const x = -PW / 2 + i * PW / 5
  return [[x, -PH / 2, 0], [x, PH / 2, 0]]
})
const BORDER = [
  [-PW / 2, -PH / 2, 0], [PW / 2, -PH / 2, 0],
  [PW / 2,  PH / 2, 0], [-PW / 2,  PH / 2, 0],
  [-PW / 2, -PH / 2, 0],
]

// ── Sub-components ────────────────────────────────────────────────────

function PlaneGroup({ pos, rot, side, active, onEnter, onLeave }) {
  const isLeft = side === "left"
  const dotX   = isLeft ? PW / 2 - 0.1  : -PW / 2 + 0.1
  const labelX = isLeft ? -PW * 0.21     :  PW * 0.21

  return (
    <group position={pos} rotation={rot}>
      {/* Plane surface */}
      <mesh>
        <planeGeometry args={[PW, PH]} />
        <meshBasicMaterial color="white" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>

      {/* Border */}
      <Line points={BORDER} color="black" lineWidth={0.9} transparent opacity={0.32} />

      {/* Grid */}
      {GRID_H.map((pts, i) => (
        <Line key={`h${i}`} points={pts} color="black" lineWidth={0.3} transparent opacity={0.11} />
      ))}
      {GRID_V.map((pts, i) => (
        <Line key={`v${i}`} points={pts} color="black" lineWidth={0.3} transparent opacity={0.11} />
      ))}

      {/* Concepts */}
      {Y_VALS.map((y, i) => {
        const isActive = active === i
        return (
          <group key={i}>
            {/* Invisible hit sphere */}
            <mesh
              position={[dotX, y, 0.1]}
              onPointerOver={() => onEnter(i)}
              onPointerOut={onLeave}
            >
              <sphereGeometry args={[0.2, 6, 6]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Visible dot */}
            <mesh position={[dotX, y, 0.01]}>
              <sphereGeometry args={[isActive ? 0.058 : 0.038, 10, 10]} />
              <meshBasicMaterial color="black" transparent opacity={isActive ? 0.88 : 0.28} />
            </mesh>

            {/* Label */}
            <Html
              position={[labelX, y, 0.02]}
              center
              distanceFactor={6.5}
              style={{ pointerEvents: "none" }}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                whiteSpace: "nowrap",
                color: "black",
                opacity: isActive ? 1 : 0.42,
                transition: "opacity 0.15s",
                userSelect: "none",
              }}>
                {isLeft ? PAIRS[i][0] : PAIRS[i][1]}
              </span>
            </Html>
          </group>
        )
      })}

      {/* Plane name */}
      <Html position={[0, -PH / 2 - 0.22, 0]} center distanceFactor={6.5} style={{ pointerEvents: "none" }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "7px",
          letterSpacing: "2px",
          color: "black",
          opacity: 0.3,
          userSelect: "none",
        }}>
          {isLeft ? "PLANE A" : "PLANE B"}
        </span>
      </Html>
    </group>
  )
}

function Connections({ active }) {
  return (
    <>
      {PAIRS.map((_, i) => {
        const from = toWorld(PW / 2 - 0.1, Y_VALS[i], L_POS, L_ROT)
        const to   = toWorld(-PW / 2 + 0.1, Y_VALS[i], R_POS, R_ROT)
        const mid  = new THREE.Vector3()
          .addVectors(from, to)
          .multiplyScalar(0.5)
          .add(new THREE.Vector3(0, 0.12, 0.6))

        const curve = new THREE.QuadraticBezierCurve3(from, mid, to)
        const pts   = curve.getPoints(22).map(p => [p.x, p.y, p.z])
        const isActive = active === i

        return (
          <Line
            key={i}
            points={pts}
            color="black"
            lineWidth={isActive ? 1.3 : 0.4}
            transparent
            opacity={isActive ? 0.78 : 0.16}
            dashed={!isActive}
            dashSize={0.09}
            gapSize={0.13}
          />
        )
      })}

      {/* mapping label */}
      <Html position={[0, 0.05, 0.8]} center distanceFactor={6.5} style={{ pointerEvents: "none" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "italic", fontSize: "10px", color: "black", opacity: 0.25 }}>
          f
        </span>
      </Html>
    </>
  )
}

function Scene({ active, setActive }) {
  return (
    <>
      <PlaneGroup
        pos={L_POS} rot={L_ROT} side="left"
        active={active}
        onEnter={setActive}
        onLeave={() => setActive(-1)}
      />
      <PlaneGroup
        pos={R_POS} rot={R_ROT} side="right"
        active={active}
        onEnter={setActive}
        onLeave={() => setActive(-1)}
      />
      <Connections active={active} />
    </>
  )
}

function MathPlanes3D() {
  const [active, setActive] = useState(-1)

  return (
    <div style={{ width: "72%", maxWidth: "640px", height: "260px", margin: "0 auto" }}>
      <Canvas
        camera={{ position: [0, 0.7, 8], fov: 40 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Scene active={active} setActive={setActive} />
      </Canvas>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

const About = () => (
  <div
    className="relative z-10 font-mono w-full mt-16 pb-16"
    style={{ color: "var(--text-body)", fontSize: "14px", lineHeight: 1.5 }}
  >
    <div className="px-8 lg:w-4/5 max-w-3xl font-thin space-y-3 mb-12">
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
    </div>

    <div style={{ width: "100%" }}>
      <MathPlanes3D />
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

export default About
