import { Html } from "@react-three/drei"
import { genreLayers, QUADRANT_LABELS, XY_SCALE } from "../../data/homeQuadrant3d.js"

const labelStyle = {
  fontFamily: '"DepartureMono", monospace',
  fontSize: "12px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#e0e0e0",
  background: "#000000",
  border: "1px solid #666666",
  padding: "3px 8px",
  whiteSpace: "nowrap",
  pointerEvents: "auto",
  textDecoration: "none",
  display: "inline-block",
}

const dimLabel = {
  ...labelStyle,
  color: "#bbbbbb",
  border: "none",
  background: "transparent",
  pointerEvents: "none",
  whiteSpace: "pre-line",
  textAlign: "center",
  fontSize: "11px",
}

const axisStyle = {
  ...dimLabel,
  color: "#cccccc",
  fontSize: "12px",
  letterSpacing: "0.2em",
}

function WorkMarker({ work, active }) {
  const x = work.x * XY_SCALE
  const y = work.y * XY_SCALE

  return (
    <group position={[x, y, 0.15]}>
      <mesh>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color={active ? "#ffffff" : "#888888"}
          emissive={active ? "#ffffff" : "#444444"}
          emissiveIntensity={active ? 1.2 : 0.4}
        />
      </mesh>
      <Html center distanceFactor={10} zIndexRange={[active ? 200 : 50, 0]}>
        {work.slug ? (
          <a href={`/art/${work.slug}`} style={{ ...labelStyle, opacity: active ? 1 : 0.55 }}>
            {work.planeLabel ?? work.label}
          </a>
        ) : (
          <span style={{ ...labelStyle, opacity: active ? 1 : 0.55 }}>{work.planeLabel ?? work.label}</span>
        )}
      </Html>
    </group>
  )
}

function QuadrantPlane({ layer, active }) {
  const half = XY_SCALE + 0.5
  const opacity = active ? 0.22 : 0.04
  const isChronology = layer.layout === "chronology"

  return (
    <group position={[0, 0, layer.z]}>
      <mesh>
        <planeGeometry args={[half * 2, half * 2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity} side={2} />
      </mesh>

      <mesh>
        <boxGeometry args={[half * 2, 0.06, 0.06]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {!isChronology && (
        <mesh>
          <boxGeometry args={[0.06, half * 2, 0.06]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}

      {active && !isChronology &&
        QUADRANT_LABELS.map((q) => (
          <Html
            key={q.label}
            position={[q.x * XY_SCALE, q.y * XY_SCALE, 0.2]}
            center
            distanceFactor={12}
            zIndexRange={[100, 0]}
          >
            <span style={dimLabel}>{q.label}</span>
          </Html>
        ))}

      {layer.works.map((work) => (
        <WorkMarker key={work.label} work={work} active={active} />
      ))}

      <Html position={[0, half + 0.8, 0.3]} center distanceFactor={14} zIndexRange={[active ? 150 : 30, 0]}>
        <span
          style={{
            ...labelStyle,
            color: active ? "#ffffff" : "#888888",
            borderColor: active ? "#aaaaaa" : "#444444",
          }}
        >
          [{layer.title}]
        </span>
      </Html>
    </group>
  )
}

function AxisRig() {
  const half = XY_SCALE + 1.2
  const zTop = 2
  const zBottom = genreLayers[genreLayers.length - 1].z - 2

  return (
    <group>
      <Html position={[-half - 0.8, 0, genreLayers[0].z]} center distanceFactor={16}>
        <span style={axisStyle}>body</span>
      </Html>
      <Html position={[half + 0.8, 0, genreLayers[0].z]} center distanceFactor={16}>
        <span style={axisStyle}>machine</span>
      </Html>
      <Html position={[0, half + 0.5, genreLayers[0].z]} center distanceFactor={16}>
        <span style={axisStyle}>presence</span>
      </Html>
      <Html position={[0, -half - 0.5, genreLayers[0].z]} center distanceFactor={16}>
        <span style={axisStyle}>archive</span>
      </Html>

      <mesh position={[0, 0, (zTop + zBottom) / 2]}>
        <boxGeometry args={[0.06, 0.06, zTop - zBottom]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Html position={[0.7, 0, zTop - 0.5]} center distanceFactor={16}>
        <span style={axisStyle}>genre →</span>
      </Html>
    </group>
  )
}

export default function GenreScene({ activeLayer }) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 10, 6]} intensity={1.8} />
      <directionalLight position={[-5, 6, -4]} intensity={0.6} />
      <AxisRig />
      {genreLayers.map((layer, i) => (
        <QuadrantPlane key={layer.id} layer={layer} active={i === activeLayer} />
      ))}
    </>
  )
}
