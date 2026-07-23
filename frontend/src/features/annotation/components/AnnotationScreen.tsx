import { useCallback, useEffect, useRef, useState } from 'react'
import dummyScan from '../../../assets/dummy-scan.svg'
import '../styles/AnnotationScreen.css'
import type { Point, Region } from '../types/types'

const CLOSE_VERTEX_RADIUS = 10

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

export function AnnotationScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [imageLoaded, setImageLoaded] = useState(false)
  const [region, setRegion] = useState<Region>({ points: [], closed: false })
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null)

  const draw = useCallback((currentRegion: Region, hoverPoint: Point | null) => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const { points, closed } = currentRegion
    if (points.length === 0) return

    ctx.strokeStyle = '#4da3ff'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      ctx.lineTo(point.x, point.y)
    }
    if (closed) {
      ctx.closePath()
      ctx.fillStyle = 'rgba(77, 163, 255, 0.15)'
      ctx.fill()
    } else if (hoverPoint) {
      ctx.lineTo(hoverPoint.x, hoverPoint.y)
    }
    ctx.stroke()

    for (const [index, point] of points.entries()) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, index === 0 && !closed ? CLOSE_VERTEX_RADIUS : 4, 0, Math.PI * 2)
      ctx.fillStyle = index === 0 && !closed ? 'rgba(77, 163, 255, 0.25)' : '#4da3ff'
      ctx.fill()
    }
  }, [])

  useEffect(() => {
    const image = new Image()
    image.src = dummyScan
    image.onload = () => {
      imageRef.current = image
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
      }
      setImageLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (imageLoaded) draw(region, cursorPoint)
  }, [imageLoaded, region, cursorPoint, draw])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !imageLoaded || region.closed) return
    const point = getCanvasPoint(canvas, event.clientX, event.clientY)

    setRegion((prev) => {
      if (prev.points.length >= 3 && distance(point, prev.points[0]) <= CLOSE_VERTEX_RADIUS) {
        return { ...prev, closed: true }
      }
      return { ...prev, points: [...prev.points, point] }
    })
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || region.closed || region.points.length === 0) return
    setCursorPoint(getCanvasPoint(canvas, event.clientX, event.clientY))
  }

  const handleClear = () => {
    setRegion({ points: [], closed: false })
    setCursorPoint(null)
  }

  const statusText = () => {
    if (region.points.length === 0) {
      return 'No region drawn yet — click on the scan to place vertices.'
    }
    if (!region.closed) {
      return `Placing polygon: ${region.points.length} point(s) — click the first (highlighted) point to close the shape.`
    }
    return `Polygon region: ${region.points.length} points — ${region.points
      .map((p) => `(${Math.round(p.x)}, ${Math.round(p.y)})`)
      .join(', ')}`
  }

  return (
    <div className="annotation-screen">
      <div className="annotation-toolbar">
        <span className="annotation-tool-label">Tool: Draw polygon region</span>
        <button type="button" onClick={handleClear} disabled={region.points.length === 0}>
          Clear region
        </button>
      </div>

      <div className="annotation-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="annotation-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        />
      </div>

      <div className="annotation-status">{statusText()}</div>
    </div>
  )
}
