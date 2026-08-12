export type Primitive = {
  id: number
  name: string
  description?: string
}

export type Pair = {
  id: string
  a: Primitive
  b: Primitive
}

export type SimilarityLevel = 'clear' | 'moderate' | 'weak' | 'none'

export type Judgement = {
  pairId: string
  level: SimilarityLevel
  ratedAt: string
}
