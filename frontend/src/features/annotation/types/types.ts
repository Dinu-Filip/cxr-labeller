export interface Point {
  x: number
  y: number
}

export interface Region {
  points: Point[]
  closed: boolean
}
