import { useCallback, useEffect, useRef, useState } from 'react'
import type { Point, Primitive, Region, Tool } from '../types/types'
import { MenuIcon } from './icons'

const CLOSE_VERTEX_RADIUS = 10
const ACTIVE_COLOR = '#1e4fd1'
const COMPLETE_COLOR = '#157a42'
const UNASSIGNED_COLOR = '#6b7280'

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

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function findRegionAtPoint(regions: Region[], point: Point): Region | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    const region = regions[i]
    if (region.closed && isPointInPolygon(point, region.points)) return region
  }
  return null
}

interface CanvasViewerProps {
  imageSrc: string
  primitives: Primitive[]
  regions: Region[]
  selectedRegionIds: string[]
  activePrimitiveId: number | null
  activeTool: Tool
  onRegionsChange: (regions: Region[]) => void
  onSelectRegions: (regionIds: string[]) => void
  onToggleMetadata: () => void
}

export function CanvasViewer({
  imageSrc,
  primitives,
  regions,
  selectedRegionIds,
  activePrimitiveId,
  activeTool,
  onRegionsChange,
  onSelectRegions,
  onToggleMetadata,
}: CanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [imageLoaded, setImageLoaded] = useState(false)
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null)
  const [draggingRegionId, setDraggingRegionId] = useState<string | null>(null)
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    for (const region of regions) {
      if (region.points.length === 0) continue

      const isSelected = selectedRegionIds.includes(region.id)
      const color = isSelected ? ACTIVE_COLOR : region.primitiveId !== null ? COMPLETE_COLOR : UNASSIGNED_COLOR

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash(isSelected && !region.closed ? [6, 4] : [])
      ctx.beginPath()
      ctx.moveTo(region.points[0].x, region.points[0].y)
      for (const point of region.points.slice(1)) {
        ctx.lineTo(point.x, point.y)
      }
      if (region.closed) {
        ctx.closePath()
        ctx.fillStyle = isSelected ? 'rgba(30, 79, 209, 0.15)' : 'rgba(21, 122, 66, 0.12)'
        ctx.fill()
      } else if (isSelected && cursorPoint) {
        ctx.lineTo(cursorPoint.x, cursorPoint.y)
      }
      ctx.stroke()

      if (isSelected) {
        for (const [index, point] of region.points.entries()) {
          const isCloseTarget = index === 0 && !region.closed
          ctx.beginPath()
          ctx.arc(point.x, point.y, isCloseTarget ? CLOSE_VERTEX_RADIUS : 4, 0, Math.PI * 2)
          ctx.fillStyle = isCloseTarget ? 'rgba(30, 79, 209, 0.25)' : color
          ctx.fill()
        }
      }

      if (region.closed) {
        const center = centroid(region.points)
        const primitive = primitives.find((p) => p.id === region.primitiveId)
        const label = primitive?.name ?? 'Unlabelled'
        ctx.font = '13px sans-serif'
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
  }, [primitives, regions, selectedRegionIds, cursorPoint])

  useEffect(() => {
    setImageLoaded(false)
    setCursorPoint(null)
    setDraggingRegionId(null)
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
    if (!canvas || !imageLoaded) return
    const point = getCanvasPoint(canvas, event.clientX, event.clientY)
    const editingRegion = regions.find((r) => selectedRegionIds.includes(r.id) && !r.closed) ?? null

    if (activeTool === 'move') {
      const selectedClosedRegions = regions.filter((r) => selectedRegionIds.includes(r.id) && r.closed)
      for (const region of selectedClosedRegions) {
        const nearestIndex = findNearestVertex(region.points, point)
        if (nearestIndex !== null) {
          setDraggingRegionId(region.id)
          setDraggingVertexIndex(nearestIndex)
          return
        }
      }
      const hit = findRegionAtPoint(regions, point)
      onSelectRegions(hit ? [hit.id] : [])
      return
    }

    if (editingRegion) {
      if (editingRegion.points.length >= 3 && distance(point, editingRegion.points[0]) <= CLOSE_VERTEX_RADIUS) {
        onRegionsChange(regions.map((r) => (r.id === editingRegion.id ? { ...r, closed: true } : r)))
      } else {
        onRegionsChange(regions.map((r) => (r.id === editingRegion.id ? { ...r, points: [...r.points, point] } : r)))
      }
      return
    }

    const hit = findRegionAtPoint(regions, point)
    if (hit) {
      onSelectRegions([hit.id])
      return
    }

    const newRegion: Region = {
      id: crypto.randomUUID(),
      primitiveId: activePrimitiveId,
      points: [point],
      closed: false,
    }
    setCursorPoint(null)
    onRegionsChange([...regions, newRegion])
    onSelectRegions([newRegion.id])
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const point = getCanvasPoint(canvas, event.clientX, event.clientY)

    if (activeTool === 'move' && draggingRegionId !== null && draggingVertexIndex !== null) {
      const region = regions.find((r) => r.id === draggingRegionId)
      if (region) {
        const points = region.points.map((p, index) => (index === draggingVertexIndex ? point : p))
        onRegionsChange(regions.map((r) => (r.id === draggingRegionId ? { ...r, points } : r)))
      }
      return
    }

    const editingRegion = regions.find((r) => selectedRegionIds.includes(r.id) && !r.closed) ?? null
    if (activeTool === 'select' && editingRegion && editingRegion.points.length > 0) {
      setCursorPoint(point)
    }
  }

  const handlePointerUp = () => {
    setDraggingRegionId(null)
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
    </div>
  )
}
