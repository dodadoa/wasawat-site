import Phaser from "phaser"
import {
  GROUND_KEYS,
  OVERLAY_ELEMENTS,
  TILE_SIZE,
  FONT_SIZE,
  THEME,
  getGround,
} from "../config/elements.js"
import { MAP_DATA, PLAYER_SPAWN, TREE_POSITIONS } from "../config/map.js"
import { INTERACTABLES } from "../config/interactables.js"

/**
 * @typedef {import('../config/elements.js').GroundType} GroundType
 * @typedef {{ kind: 'tree' } | { kind: 'interactable', data: import('../config/interactables.js').Interactable }} OverlayRef
 * @typedef {{ ground: GroundType, overlay: OverlayRef | null }} Cell
 */

export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: "WorldScene" })
    /** @type {(e: KeyboardEvent) => void} */
    this.onKeyDown = (e) => this.handleKeyDown(e)
  }

  create() {
    this.mapHeight = MAP_DATA.length
    this.mapWidth = MAP_DATA[0].length
    this.interactableMap = new Map()
    this.cells = this.buildCellMap()

    this.groundLayer = this.add.container(0, 0)
    this.overlayLayer = this.add.container(0, 0)
    this.actorLayer = this.add.container(0, 0)

    this.renderGroundLayer()
    this.renderOverlays()

    this.player = this.createActor(PLAYER_SPAWN.x, PLAYER_SPAWN.y, "@", THEME.player)
    this.playerGridX = PLAYER_SPAWN.x
    this.playerGridY = PLAYER_SPAWN.y
    this.lastHudKey = ""

    this.dialogOpen = false
    this.dialogIndex = 0
    this.activeInteractable = null

    this.input.on("pointerdown", (pointer) => this.onMapClick(pointer))

    window.addEventListener("keydown", this.onKeyDown)

    this.createHud()
    this.createDialogBox()

    this.worldW = this.mapWidth * TILE_SIZE
    this.worldH = this.mapHeight * TILE_SIZE
    this.cameras.main.setBackgroundColor(THEME.background)
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH)
    this.cameras.main.startFollow(this.player, true, 1, 1)

    this.fitCameraZoom()
    this.cameras.main.centerOn(this.player.x, this.player.y)

    this.scale.on("resize", () => {
      this.fitCameraZoom()
      this.repositionDialogBox()
    })
  }

  fitCameraZoom() {
    const fitZoom = Math.min(this.scale.width / this.worldW, this.scale.height / this.worldH, 2)
    // Snap to 0.5 steps so scaled glyphs stay sharp with nearest-neighbor filtering
    const zoom = Math.max(0.5, Math.round(fitZoom * 2) / 2)
    this.cameras.main.setZoom(zoom)
  }

  repositionDialogBox() {
    if (!this.dialogBg) return

    const w = Math.min(this.scale.width - 40, 520)
    const h = 100
    const x = (this.scale.width - w) / 2
    const y = this.scale.height - h - 20

    this.dialogBg.setPosition(x + w / 2, y + h / 2)
    this.dialogName.setPosition(x + 16, y + 12)
    this.dialogText.setPosition(x + 16, y + 34)
    this.dialogHint.setPosition(x + w - 16, y + h - 14)
  }

  shutdown() {
    window.removeEventListener("keydown", this.onKeyDown)
  }

  /** @param {KeyboardEvent} e */
  handleKeyDown(e) {
    if (e.repeat) return

    if (e.key === "Escape") {
      if (this.dialogOpen) {
        e.preventDefault()
        this.closeDialog()
      }
      return
    }

    if (e.key === " " || e.code === "Space") {
      if (this.dialogOpen) {
        e.preventDefault()
        this.advanceDialog()
      }
      return
    }

    if (e.key === "e" || e.key === "E") {
      e.preventDefault()
      this.tryInteract()
      return
    }

    if (this.dialogOpen) return

    let dx = 0
    let dy = 0
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        dx = -1
        break
      case "ArrowRight":
      case "d":
      case "D":
        dx = 1
        break
      case "ArrowUp":
      case "w":
      case "W":
        dy = -1
        break
      case "ArrowDown":
      case "s":
      case "S":
        dy = 1
        break
      default:
        return
    }

    e.preventDefault()
    this.stepTo(this.playerGridX + dx, this.playerGridY + dy)
  }

  textStyle(color, size = FONT_SIZE) {
    return {
      fontFamily: "JetBrains Mono, monospace",
      fontSize: `${size}px`,
      color,
    }
  }

  applyCrispText(text) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    text.setResolution(dpr)
    return text
  }

  buildCellMap() {
    /** @type {Cell[][]} */
    const grid = []

    for (let y = 0; y < MAP_DATA.length; y++) {
      const row = []
      for (let x = 0; x < MAP_DATA[y].length; x++) {
        const ch = MAP_DATA[y][x]
        const ground = ch === "@" ? "grass" : (GROUND_KEYS[ch] ?? "land")
        row.push({ ground, overlay: null })
      }
      grid.push(row)
    }

    for (const { x, y } of TREE_POSITIONS) {
      if (!this.inBounds(x, y)) continue
      grid[y][x].overlay = { kind: "tree" }
    }

    for (const obj of INTERACTABLES) {
      if (!this.inBounds(obj.x, obj.y)) continue
      grid[obj.y][obj.x].overlay = { kind: "interactable", data: obj }
      this.interactableMap.set(`${obj.x},${obj.y}`, obj)
    }

    return grid
  }

  getCell(x, y) {
    if (!this.inBounds(x, y)) return null
    return this.cells[y][x]
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.mapWidth && y < this.mapHeight
  }

  isWalkable(x, y) {
    const cell = this.getCell(x, y)
    if (!cell) return false
    if (!getGround(cell.ground).walkable) return false
    if (cell.overlay?.kind === "tree") return false
    return true
  }

  gridToWorld(x, y) {
    return {
      x: x * TILE_SIZE + TILE_SIZE / 2,
      y: y * TILE_SIZE + TILE_SIZE / 2,
    }
  }

  worldToGrid(worldX, worldY) {
    return {
      x: Math.floor(worldX / TILE_SIZE),
      y: Math.floor(worldY / TILE_SIZE),
    }
  }

  renderGroundLayer() {
    const tileBg = this.add.graphics()

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const ground = getGround(this.cells[y][x].ground)
        tileBg.fillStyle(ground.fill, 1)
        tileBg.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      }
    }

    this.groundLayer.add(tileBg)

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const ground = getGround(this.cells[y][x].ground)
        const pos = this.gridToWorld(x, y)
        const text = this.applyCrispText(
          this.add.text(pos.x, pos.y, ground.char, this.textStyle(ground.color)).setOrigin(0.5),
        )
        this.groundLayer.add(text)
      }
    }
  }

  renderOverlays() {
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const overlay = this.cells[y][x].overlay
        if (!overlay) continue

        const pos = this.gridToWorld(x, y)

        if (overlay.kind === "tree") {
          const tree = OVERLAY_ELEMENTS.tree
          const text = this.applyCrispText(
            this.add.text(pos.x, pos.y, tree.char, this.textStyle(tree.color)).setOrigin(0.5).setDepth(5),
          )
          this.overlayLayer.add(text)
          continue
        }

        if (overlay.kind === "interactable") {
          const obj = overlay.data
          const text = this.applyCrispText(
            this.add.text(pos.x, pos.y, obj.char, this.textStyle(obj.color)).setOrigin(0.5).setDepth(5),
          )
          this.overlayLayer.add(text)
        }
      }
    }
  }

  createActor(gridX, gridY, char, color) {
    const pos = this.gridToWorld(gridX, gridY)
    const text = this.applyCrispText(
      this.add.text(pos.x, pos.y, char, this.textStyle(color)).setOrigin(0.5).setDepth(10),
    )
    this.actorLayer.add(text)
    return text
  }

  createHud() {
    const padding = 12
    this.hudText = this.applyCrispText(
      this.add
        .text(padding, padding, "", {
          ...this.textStyle(THEME.hud, 12),
          lineSpacing: 4,
        })
        .setScrollFactor(0)
        .setDepth(100),
    )

    this.updateHud()
  }

  updateHud() {
    const cell = this.getCell(this.playerGridX, this.playerGridY)
    if (!cell) return

    const ground = getGround(cell.ground)
    const overlayLabel =
      cell.overlay?.kind === "interactable" ? `  |  On: ${cell.overlay.data.name}` : ""

    const hudKey = `${this.playerGridX},${this.playerGridY},${cell.ground},${cell.overlay?.kind ?? ""}`
    if (hudKey === this.lastHudKey) return
    this.lastHudKey = hudKey

    const nearby = this.findNearbyInteractable()
    const interactHint = nearby ? `\n[E] Talk to ${nearby.name}` : ""

    this.hudText.setText(
      `Walking on: ${ground.label} (${ground.char})${overlayLabel}\nPos: ${this.playerGridY}, ${this.playerGridX}  |  Arrows / WASD / Click adjacent  |  E talk  |  Esc close${interactHint}`,
    )
  }

  createDialogBox() {
    const w = Math.min(this.scale.width - 40, 520)
    const h = 100
    const x = (this.scale.width - w) / 2
    const y = this.scale.height - h - 20

    this.dialogBg = this.add
      .rectangle(x + w / 2, y + h / 2, w, h, THEME.dialogBg, 0.96)
      .setStrokeStyle(1, THEME.dialogBorder)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false)

    this.dialogName = this.applyCrispText(
      this.add
        .text(x + 16, y + 12, "", this.textStyle(THEME.dialogName, 13))
        .setScrollFactor(0)
        .setDepth(201)
        .setVisible(false),
    )

    this.dialogText = this.applyCrispText(
      this.add
        .text(x + 16, y + 34, "", {
          ...this.textStyle(THEME.dialogText, 14),
          wordWrap: { width: w - 32 },
        })
        .setScrollFactor(0)
        .setDepth(201)
        .setVisible(false),
    )

    this.dialogHint = this.applyCrispText(
      this.add
        .text(x + w - 16, y + h - 14, "[Space] continue  [Esc] close", this.textStyle(THEME.dialogHint, 11))
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(201)
        .setVisible(false),
    )
  }

  stepTo(targetX, targetY) {
    if (!this.isWalkable(targetX, targetY)) return

    this.playerGridX = targetX
    this.playerGridY = targetY
    const pos = this.gridToWorld(targetX, targetY)
    this.player.setPosition(pos.x, pos.y)
    this.updateHud()
  }

  onMapClick(pointer) {
    if (this.dialogOpen) return

    const grid = this.worldToGrid(pointer.worldX, pointer.worldY)
    if (!this.inBounds(grid.x, grid.y)) return

    const dx = grid.x - this.playerGridX
    const dy = grid.y - this.playerGridY
    if (Math.abs(dx) + Math.abs(dy) !== 1) return

    this.stepTo(grid.x, grid.y)
  }

  findNearbyInteractable() {
    for (const obj of INTERACTABLES) {
      const dist = Math.abs(obj.x - this.playerGridX) + Math.abs(obj.y - this.playerGridY)
      if (dist <= 1) return obj
    }
    return null
  }

  tryInteract() {
    if (this.dialogOpen) {
      this.advanceDialog()
      return
    }

    const nearby = this.findNearbyInteractable()
    if (!nearby) return

    this.openDialog(nearby)
  }

  openDialog(interactable) {
    this.dialogOpen = true
    this.activeInteractable = interactable
    this.dialogIndex = 0

    this.dialogBg.setVisible(true)
    this.dialogName.setVisible(true)
    this.dialogText.setVisible(true)
    this.dialogHint.setVisible(true)

    this.showDialogLine()
  }

  showDialogLine() {
    if (!this.activeInteractable) return
    this.dialogName.setText(this.activeInteractable.name)
    this.dialogText.setText(this.activeInteractable.lines[this.dialogIndex] ?? "")
  }

  advanceDialog() {
    if (!this.dialogOpen || !this.activeInteractable) return

    this.dialogIndex++
    if (this.dialogIndex >= this.activeInteractable.lines.length) {
      this.closeDialog()
      return
    }
    this.showDialogLine()
  }

  closeDialog() {
    this.dialogOpen = false
    this.activeInteractable = null
    this.dialogIndex = 0

    this.dialogBg.setVisible(false)
    this.dialogName.setVisible(false)
    this.dialogText.setVisible(false)
    this.dialogHint.setVisible(false)
  }
}
