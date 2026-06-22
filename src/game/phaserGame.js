import Phaser from "phaser"
import { WorldScene } from "./scenes/WorldScene.js"

const NAV_HEIGHT = 64

/** @param {string} containerId */
export function startGame(containerId) {
  const container = document.getElementById(containerId)
  if (!container) return null

  const getSize = () => ({
    width: container.clientWidth || window.innerWidth,
    height: container.clientHeight || window.innerHeight - NAV_HEIGHT,
  })

  const { width, height } = getSize()

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width,
    height,
    parent: containerId,
    backgroundColor: "#FFFFFF",
    scene: [WorldScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
  })

  const onResize = () => {
    const size = getSize()
    if (game.scale) {
      game.scale.resize(size.width, size.height)
    }
  }

  window.addEventListener("resize", onResize)

  return game
}
