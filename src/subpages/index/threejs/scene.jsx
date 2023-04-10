import React, { useState } from "react"
import { Model } from "../../../models/crt"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry"
import { FontLoader } from "three/examples/jsm/loaders/FontLoader"
import { extend } from "@react-three/fiber"
import fontDamione from "../../../assets/fonts/DaMiOne_Regular.json"
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing"

extend({ TextGeometry })

export default function Scene() {
  const font = new FontLoader().parse(fontDamione)

  const handleClickCrt = () => {
    console.log("click")
  }

  const [crtHover, setCrtHover] = useState(false)
  const handlePointerEnterCrt = () => setCrtHover(true)
  const handlePointerLeaveCrt = () => setCrtHover(false)

  return (
    <>
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
          {!crtHover && <Noise opacity={0.08} />}
        </EffectComposer>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Model
          handleClickCrt={handleClickCrt}
          handlePointerEnterCrt={handlePointerEnterCrt}
          handlePointerLeaveCrt={handlePointerLeaveCrt}
        />
      </group>
      {crtHover && (
        <>
          <mesh position={[-4.1, 0.1, 2]}>
            <textGeometry
              args={["wasawat somno", { font, size: 0.5, height: 0.08 }]}
            />
          </mesh>
        </>
      )}
      <fog
        attach="fog"
        color="blue"
        near={crtHover ? 0 : 2}
        far={crtHover ? 30 : 5}
      />
    </>
  )
}
