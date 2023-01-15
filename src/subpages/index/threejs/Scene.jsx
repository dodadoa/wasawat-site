import React, { useRef, useState, forwardRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Model } from "../../../models/crt"

export default function Scene(props) {

  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)

  return (
    <>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Model />
    </>
  )
}
