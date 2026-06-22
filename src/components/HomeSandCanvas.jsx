import { useEffect, useRef } from "react"
import { startSandSketch } from "../home/sandSketch.js"

export default function HomeSandCanvas() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    const sketch = startSandSketch(container)
    return () => sketch?.destroy()
  }, [])

  return (
    <div
      ref={containerRef}
      id="home-canvas"
      className="fixed top-16 left-0 right-0 bottom-0 w-full bg-white overflow-hidden"
      style={{ height: "calc(100vh - 4rem)", zIndex: 1 }}
    />
  )
}
