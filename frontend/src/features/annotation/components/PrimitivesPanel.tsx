import type { Primitive, Region } from '../types/types'
import { CloseIcon } from './icons'

interface PrimitivesPanelProps {
  primitives: Primitive[]
  activePrimitiveId: number | null
  regionsByPrimitiveId: Record<number, Region>
  onSelectPrimitive: (id: number) => void
  onClearPrimitive: (id: number) => void
}

export function PrimitivesPanel({
  primitives,
  activePrimitiveId,
  regionsByPrimitiveId,
  onSelectPrimitive,
  onClearPrimitive,
}: PrimitivesPanelProps) {
  return (
    <div className="primitives-panel">
      {primitives.map((primitive) => {
        const region = regionsByPrimitiveId[primitive.id]
        const isComplete = Boolean(region?.closed)
        const isActive = primitive.id === activePrimitiveId

        return (
          <div
            key={primitive.id}
            className={`primitive-row ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
          >
            <button
              type="button"
              className="primitive-button"
              aria-pressed={isActive}
              onClick={() => onSelectPrimitive(primitive.id)}
              title={primitive.description}
            >
              {primitive.name}
            </button>
            {region && region.points.length > 0 && (
              <button
                type="button"
                className="primitive-clear"
                title={`Clear ${primitive.name} region`}
                onClick={() => onClearPrimitive(primitive.id)}
              >
                <CloseIcon className="primitive-clear-icon" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
