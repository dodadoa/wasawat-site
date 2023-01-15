import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from "@react-three/fiber"

export function Model(props) {
  const { nodes, materials } = useGLTF('/models/crt/scene-transformed.glb')
  const ref = useRef()

  useFrame((state, delta) => {
    console.log(ref)
    ref.current.rotation.y -= 0.01
  })

  return (
    <group {...props} dispose={null} ref={ref}>
      <group scale={0.05}>
        <group position={[0, -7.13, 5.52]} rotation={[-Math.PI / 2, 0, 0]} scale={10}>
          <mesh geometry={nodes.CRT_Monitor_monitor_glass_0.geometry} material={materials.monitor_glass} />
          <mesh geometry={nodes.CRT_Monitor_monitor_plastic_0.geometry} material={materials.monitor_plastic} />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/models/crt/scene.gltf')
