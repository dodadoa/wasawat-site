import React, { Fragment, useRef, useState, forwardRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Model } from "../../../models/crt"

export default function Scene(props) {
  return (
    <Fragment>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Model />
    </Fragment>
  )
}
