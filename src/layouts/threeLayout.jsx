import { createRoot } from "react-dom/client"
import Scene from "../subpages/index/threejs/scene"
import { Canvas } from "@react-three/fiber"
import { FontLoader } from "three/examples/jsm/loaders/FontLoader"
import fontDamione from "../assets/fonts/DaMiOne_Regular.json"

// Preload font before rendering
const preloadFont = () => {
  const loader = new FontLoader()
  return loader.parse(fontDamione)
}

// Preload font immediately
const font = preloadFont()

export const render = () =>
  createRoot(document.getElementById("root")).render(
    <>
      <Canvas>
        <Scene preloadedFont={font} />
      </Canvas>
    </>
  )
