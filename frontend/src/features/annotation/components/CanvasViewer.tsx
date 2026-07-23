import { useCallback, useEffect, useRef, useState } from 'react'
import type { Point, Primitive, Region, Tool } from '../types/types'
import { MenuIcon } from './icons'

const CLOSE_VERTEX_RADIUS = 10
const ACTIVE_COLOR = '#2f6fed'
const COMPLETE_COLOR = '#1f9d55'

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function findNearestVertex(points: Point[], target: Point): number | null {
  let closestIndex: number | null = null
  let closestDistance = CLOSE_VERTEX_RADIUS
  for (const [index, point] of points.entries()) {
    const d = distance(point, target)
    if (d <= closestDistance) {
      closestDistance = d
      closestIndex = index
    }
  }
  return closestIndex
}

interface CanvasViewerProps {
  imageSrc: string
  primitives: Primitive[]
  regionsByPrimitiveId: Record<number, Region>
  activePrimitiveId: number | null
  activeTool: Tool
  onRegionChange: (primitiveId: number, region: Region) => void
  onToggleMetadata: () => void
}

export function CanvasViewer({
  imageSrc,
  primitives,
  regionsByPrimitiveId,
  activePrimitiveId,
  activeTool,
  onRegionChange,
  onToggleMetadata,
}: CanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [imageLoaded, setImageLoaded] = useState(false)
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null)
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    for (const primitive of primitives) {
      const region = regionsByPrimitiveId[primitive.id]
      if (!region || region.points.length === 0) continue

      const isActive = primitive.id === activePrimitiveId
      const color = isActive ? ACTIVE_COLOR : COMPLETE_COLOR

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash(isActive && !region.closed ? [6, 4] : [])
      ctx.beginPath()
      ctx.moveTo(region.points[0].x, region.points[0].y)
      for (const point of region.points.slice(1)) {
        ctx.lineTo(point.x, point.y)
      }
      if (region.closed) {
        ctx.closePath()
        ctx.fillStyle = isActive ? 'rgba(47, 111, 237, 0.15)' : 'rgba(31, 157, 85, 0.12)'
        ctx.fill()
      } else if (isActive && cursorPoint) {
        ctx.lineTo(cursorPoint.x, cursorPoint.y)
      }
      ctx.stroke()

      if (isActive) {
        for (const [index, point] of region.points.entries()) {
          const isCloseTarget = index === 0 && !region.closed
          ctx.beginPath()
          ctx.arc(point.x, point.y, isCloseTarget ? CLOSE_VERTEX_RADIUS : 4, 0, Math.PI * 2)
          ctx.fillStyle = isCloseTarget ? 'rgba(47, 111, 237, 0.25)' : color
          ctx.fill()
        }
      } else if (region.closed) {
        const center = centroid(region.points)
        ctx.font = '13px sans-serif'
        const label = primitive.name
        const padding = 4
        const metrics = ctx.measureText(label)
        ctx.fillStyle = 'rgba(15, 20, 26, 0.75)'
        ctx.fillRect(center.x - metrics.width / 2 - padding, center.y - 9, metrics.width + padding * 2, 18)
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, center.x, center.y)
      }
    }
  }, [primitives, regionsByPrimitiveId, activePrimitiveId, cursorPoint])

  useEffect(() => {
    setImageLoaded(false)
    setCursorPoint(null)
    setDraggingVertexIndex(null)

    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      imageRef.current = image
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
      }
      setImageLoaded(true)
    }
  }, [imageSrc])

  useEffect(() => {
    if (imageLoaded) draw()
  }, [imageLoaded, draw])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !imageLoaded || activePrimitiveId === null) return
    const point = getCanvasPoint(canvas, event.clientX, event.clientY)
    const region = regionsByPrimitiveId[activePrimitiveId] ?? { points: [], closed: false }

    if (activeTool === 'move') {
      if (!region.closed) return
      const nearestIndex = findNearestVertex(region.points, point)
      setDraggingVertexIndex(nearestIndex)
      return
    }

    if (region.closed) return
    if (region.points.length >= 3 && distance(point, region.points[0]) <= CLOSE_VERTEX_RADIUS) {
      onRegionChange(activePrimitiveId, { ...region, closed: true })
    } else {
      onRegionChange(activePrimitiveId, { ...region, points: [...region.points, point] })
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || activePrimitiveId === null) return
    const point = getCanvasPoint(canvas, event.clientX, event.clientY)
    const region = regionsByPrimitiveId[activePrimitiveId]

    if (activeTool === 'move' && draggingVertexIndex !== null && region) {
      const points = region.points.map((p, index) => (index === draggingVertexIndex ? point : p))
      onRegionChange(activePrimitiveId, { ...region, points })
      return
    }

    if (activeTool === 'select' && region && !region.closed && region.points.length > 0) {
      setCursorPoint(point)
    }
  }

  const handlePointerUp = () => {
    setDraggingVertexIndex(null)
  }

  return (
    <div className="canvas-viewer">
      <button type="button" className="canvas-menu-button" onClick={onToggleMetadata} aria-label="Scan details">
        <MenuIcon className="canvas-menu-icon" />
      </button>

      <canvas
        ref={canvasRef}
        className={`annotation-canvas tool-${activeTool}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {activePrimitiveId === null && (
        <div className="canvas-hint">Select a primitive on the right to begin labelling.</div>
      )}
    </div>
  )
}
