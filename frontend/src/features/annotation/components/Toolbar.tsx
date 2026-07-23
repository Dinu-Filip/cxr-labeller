import type { Tool } from '../types/types'
import { DrawIcon, PointerIcon, TrashIcon } from './icons'

interface ToolbarProps {
  activeTool: Tool
  onSelectTool: (tool: Tool) => void
  canDeleteRegion: boolean
  onDeleteRegion: () => void
}

export function Toolbar({ activeTool, onSelectTool, canDeleteRegion, onDeleteRegion }: ToolbarProps) {
  return (
    <div className="annotation-toolbar" role="toolbar" aria-label="Annotation tools">
      <button
        type="button"
        className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
        aria-pressed={activeTool === 'select'}
        title="Draw region"
        onClick={() => onSelectTool('select')}
      >
        <DrawIcon className="tool-icon" />
      </button>
      <button
        type="button"
        className={`tool-button ${activeTool === 'move' ? 'active' : ''}`}
        aria-pressed={activeTool === 'move'}
        title="Select / move region"
        onClick={() => onSelectTool('move')}
      >
        <PointerIcon className="tool-icon" />
      </button>
      <button
        type="button"
        className="tool-button tool-button-delete"
        title="Delete selected region"
        disabled={!canDeleteRegion}
        onClick={onDeleteRegion}
      >
        <TrashIcon className="tool-icon" />
      </button>
    </div>
  )
}
