import { ChevronLeftIcon, ChevronRightIcon } from './icons'

interface NavigationControlsProps {
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  canNext: boolean
}

export function NavigationControls({ onPrev, onNext, canPrev, canNext }: NavigationControlsProps) {
  return (
    <div className="navigation-controls">
      <button type="button" className="nav-button" onClick={onPrev} disabled={!canPrev} aria-label="Previous scan">
        <ChevronLeftIcon className="nav-icon" />
      </button>
      <button type="button" className="nav-button" onClick={onNext} disabled={!canNext} aria-label="Next scan">
        <ChevronRightIcon className="nav-icon" />
      </button>
    </div>
  )
}
