import type { Pair, Primitive } from '../types.ts'

const primitives = {
  consolidation: { id: 1, name: 'Consolidation' },
  groundGlass: { id: 2, name: 'Ground-glass opacity' },
  reticulation: { id: 3, name: 'Reticulation' },
  nodule: { id: 4, name: 'Nodule' },
  mass: { id: 5, name: 'Mass' },
  cavitation: { id: 6, name: 'Cavitation' },
  effusion: { id: 7, name: 'Pleural effusion' },
  pneumothorax: { id: 8, name: 'Pneumothorax' },
  atelectasis: { id: 9, name: 'Atelectasis' },
  honeycombing: { id: 10, name: 'Honeycombing' },
  septalThickening: { id: 11, name: 'Interlobular septal thickening' },
  airBronchogram: { id: 12, name: 'Air bronchogram' },
} satisfies Record<string, Primitive>

const pair = (a: Primitive, b: Primitive): Pair => ({
  id: `${a.id}-${b.id}`,
  a,
  b,
})

/** Stand-in for the backend pair queue until phase 4 wires up the API. */
export const MOCK_PAIRS: Pair[] = [
  pair(primitives.consolidation, primitives.groundGlass),
  pair(primitives.nodule, primitives.mass),
  pair(primitives.reticulation, primitives.honeycombing),
  pair(primitives.effusion, primitives.pneumothorax),
  pair(primitives.atelectasis, primitives.consolidation),
  pair(primitives.septalThickening, primitives.reticulation),
  pair(primitives.cavitation, primitives.nodule),
  pair(primitives.airBronchogram, primitives.consolidation),
  pair(primitives.groundGlass, primitives.septalThickening),
  pair(primitives.mass, primitives.effusion),
]
