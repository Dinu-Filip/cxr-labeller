export interface Point {
  x: number
  y: number
}

export interface Region {
  points: Point[]
  closed: boolean
}

export interface Primitive {
  id: number
  name: string
  description: string
}

export interface ScanMetadata {
  scanId: string
  patientId: string
  timestamp: string
}

export interface ScanRecord {
  metadata: ScanMetadata
  imageSrc: string
  comment: string
  regionsByPrimitiveId: Record<number, Region>
}

export type Tool = 'select' | 'move'
