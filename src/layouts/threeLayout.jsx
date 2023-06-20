import { createRoot } from "react-dom/client"
import Scene from "../subpages/index/threejs/scene"
import { Canvas } from "@react-three/fiber"

export const render = () =>
  createRoot(document.getElementById("root")).render(
    <>
      <Canvas>
        <Scene />
      </Canvas>
    </>
  )
