import { Suspense, useEffect, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import GenreScene from "./home/GenreScene.jsx"
import { genreLayers } from "../data/homeQuadrant3d.js"

function SceneControls({ activeLayer }) {
  const controlsRef = useRef(null)
  const targetZ = useRef(genreLayers[0].z)
  const { camera } = useThree()

  useEffect(() => {
    targetZ.current = genreLayers[activeLayer].z
  }, [activeLayer])

  useFrame(() => {
    const z = targetZ.current
    if (controlsRef.current) {
      controlsRef.current.target.z += (z - controlsRef.current.target.z) * 0.12
      controlsRef.current.update()
    }
    const desiredCamZ = z + 10
    camera.position.z += (desiredCamZ - camera.position.z) * 0.12
    camera.lookAt(0, 0, controlsRef.current?.target.z ?? z)
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={5}
      maxDistance={24}
      minPolarAngle={Math.PI / 2 - 0.05}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}

export default function HomeGenre3DCanvas({ activeLayer }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center font-mono p-8"
        style={{ color: "#ababab" }}
      >
        <p className="text-center text-sm">
          3D view unavailable.{" "}
          <a href="/art" style={{ color: "#ffffff" }}>
            Go to archives →
          </a>
        </p>
      </div>
    )
  }

  return (
    <Canvas
      className="touch-none"
      style={{ width: "100%", height: "100%", display: "block" }}
      camera={{ position: [0, 0, 10], fov: 50, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: false }}
      onError={() => setFailed(true)}
    >
      <color attach="background" args={["#000000"]} />
      <Suspense fallback={null}>
        <GenreScene activeLayer={activeLayer} />
      </Suspense>
      <SceneControls activeLayer={activeLayer} />
    </Canvas>
  )
}
