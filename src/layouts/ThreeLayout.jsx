import { createRoot } from "react-dom/client"
import Box from "../components/Box"
import { Canvas } from "@react-three/fiber"

export const render = () =>
  createRoot(document.getElementById("root")).render(
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box position={[-1.2, 0, 0]} />
      <Box position={[1.2, 0, 0]} />
    </Canvas>
  )
