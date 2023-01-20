import React, { useState } from "react"
import { Model } from "../../../models/crt"
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing"

export default function Scene() {
  const handleClickCrt = () => {
    console.log("click")
  }

  const [crtHover, setCrtHover] = useState(false)
  const handlePointerEnterCrt = () => setCrtHover(true)
  const handlePointerLeaveCrt = () => setCrtHover(false)

  return (
    <group>
      <EffectComposer>
        {crtHover && (
          <Bloom
            mipmapBlur
            radius={0.7}
            luminanceThreshold={0}
            luminanceSmoothing={1.3}
          />
        )}
        <Noise opacity={0.08} />
      </EffectComposer>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Model
        handleClickCrt={handleClickCrt}
        handlePointerEnterCrt={handlePointerEnterCrt}
        handlePointerLeaveCrt={handlePointerLeaveCrt}
      />
    </group>
  )
}
