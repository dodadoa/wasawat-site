import { useState, useMemo, useRef, useEffect } from "react"
import { Model } from "../../../models/crt"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry"
import { FontLoader } from "three/examples/jsm/loaders/FontLoader"
import { extend, useFrame } from "@react-three/fiber"
import fontDamione from "../../../assets/fonts/DaMiOne_Regular.json"
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing"
import * as THREE from "three"

extend({ TextGeometry })

// Individual animated text character component - fully preloaded with staggered appearance
function AnimatedTextChar({ position, font, material, initialChar, isHovering, changeInterval, delay }) {
  const [, setChar] = useState(initialChar)
  const [isVisible, setIsVisible] = useState(false)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
  const meshRef = useRef()
  
  // Pre-create geometry with initial character
  const geometry = useMemo(() => {
    return new TextGeometry(initialChar, { font, size: 0.15, height: 0.015 })
  }, [initialChar, font])
  
  // Update geometry when character changes (using ref for instant updates)
  const updateGeometry = (newChar) => {
    if (meshRef.current && meshRef.current.geometry) {
      meshRef.current.geometry.dispose()
      meshRef.current.geometry = new TextGeometry(newChar, { font, size: 0.15, height: 0.015 })
    }
  }

  // Staggered appearance - show character after delay when hovering
  useEffect(() => {
    if (!isHovering) {
      setIsVisible(false)
      return
    }
    
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [isHovering, delay])

  // Change character continuously while hovering and visible
  useEffect(() => {
    if (!isHovering || !isVisible) return
    
    const interval = setInterval(() => {
      const newChar = chars[Math.floor(Math.random() * chars.length)]
      setChar(newChar)
      updateGeometry(newChar)
    }, changeInterval)
    
    return () => clearInterval(interval)
  }, [isHovering, isVisible, changeInterval, font])

  // Control visibility through material opacity with staggered appearance
  useFrame(() => {
    if (material) {
      material.opacity = (isHovering && isVisible) ? material.userData.originalOpacity : 0
    }
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose()
      }
    }
  }, [])

  // Always render (preloaded) but control visibility
  return (
    <mesh ref={meshRef} position={position} material={material} geometry={geometry}>
    </mesh>
  )
}

export default function Scene() {
  const font = new FontLoader().parse(fontDamione)

  const handleClickCrt = () => {
    console.log("click")
  }

  const [crtHover, setCrtHover] = useState(false)
  
  const handlePointerEnterCrt = () => {
    setCrtHover(true)
  }
  
  const handlePointerLeaveCrt = () => {
    setCrtHover(false)
  }

  // Generate random characters in 20x20 grid (full screen - 100% width and height) - fully preloaded
  const textGrid = useMemo(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    const gridSize = 20
    const spacing = 2.2
    const startX = -20.9
    const startY = -20.9
    const startZ = -8
    
    const positions = []
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = startX + (i * spacing) + (Math.random() - 0.5) * 0.3
        const y = startY + (j * spacing) + (Math.random() - 0.5) * 0.3
        const z = startZ + (Math.random() - 0.5) * 4
        const opacity = 0.7 + Math.random() * 0.3
        const intensity = 1.5 + Math.random() * 0.5
        const initialChar = chars[Math.floor(Math.random() * chars.length)]
        const changeInterval = 100 + Math.random() * 200
        const delay = (i * gridSize + j) * 3 // Staggered delay: 3ms per character
        positions.push({ x, y, z, opacity, intensity, initialChar, changeInterval, delay })
      }
    }
    return positions
  }, [])

  // Pre-create materials for better performance (white bloom) - preloaded with opacity 0
  const materials = useMemo(() => {
    return textGrid.map((item) => {
      const material = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ffffff",
        emissiveIntensity: item.intensity,
        transparent: true,
        opacity: 0 // Start hidden (preloaded)
      })
      material.userData.originalOpacity = item.opacity // Store original opacity
      return material
    })
  }, [textGrid])

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
      {/* Name - preloaded, appears instantly */}
      <mesh position={[-4.1, 0.1, 2]} visible={crtHover}>
        <textGeometry
          args={["wasawat somno", { font, size: 0.5, height: 0.08 }]}
        />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
      </mesh>
      {/* Random text grid background - fully preloaded, appears one by one on hover */}
      <group>
        {textGrid.map((item, index) => (
          <AnimatedTextChar
            key={index}
            position={[item.x, item.y, item.z]}
            font={font}
            material={materials[index]}
            initialChar={item.initialChar}
            isHovering={crtHover}
            changeInterval={item.changeInterval}
            delay={item.delay}
          />
        ))}
      </group>
      <fog
        attach="fog"
        color="blue"
        near={crtHover ? 0 : 2}
        far={crtHover ? 30 : 5}
      />
    </>
  )
}
