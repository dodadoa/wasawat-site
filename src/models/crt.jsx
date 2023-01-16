import React, { useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'

export function Model(props) {
  const { nodes, materials } = useGLTF('/models/crt/scene-transformed.glb')
  const ref = useRef()
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)

  const { position } = useSpring({ 
    position: clicked ? [-2, 0, 0]: [0, 0, 0]
  })

  useFrame((state, delta) => {
    ref.current.rotation.y -= 0.005
  })

  return (
    <animated.group {...props} position={position} dispose={null} ref={ref} onClick={() => click(!clicked)}>
      <group scale={0.05}>
        <group position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={10}>
          <mesh geometry={nodes.CRT_Monitor_monitor_glass_0.geometry} material={materials.monitor_glass} />
          <mesh geometry={nodes.CRT_Monitor_monitor_plastic_0.geometry} material={materials.monitor_plastic} />
        </group>
      </group>
    </animated.group>
  )
}

useGLTF.preload('/models/crt/scene.gltf')
