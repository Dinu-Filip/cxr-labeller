import type { Primitive, Region } from '../types/types'

interface PrimitivesPanelProps {
  primitives: Primitive[]
  activePrimitiveId: number | null
  regions: Region[]
  onSelectPrimitive: (id: number) => void
}

export function PrimitivesPanel({ primitives, activePrimitiveId, regions, onSelectPrimitive }: PrimitivesPanelProps) {
  return (
    <div className="primitives-panel">
      {primitives.map((primitive) => {
        const isComplete = regions.some((region) => region.primitiveId === primitive.id && region.closed)
        const isActive = primitive.id === activePrimitiveId

        return (
          <div key={primitive.id} className={`primitive-row ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
            <button
              type="button"
              className="primitive-button"
              aria-pressed={isActive}
              onClick={() => onSelectPrimitive(primitive.id)}
              title={primitive.description}
            >
              {primitive.name}
            </button>
          </div>
        )
      })}
    </div>
  )
}
