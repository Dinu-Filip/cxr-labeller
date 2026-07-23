import type { Tool } from '../types/types'
import { MoveVertexIcon, SelectIcon, TrashIcon } from './icons'

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
        title="Select / draw region"
        onClick={() => onSelectTool('select')}
      >
        <SelectIcon className="tool-icon" />
      </button>
      <button
        type="button"
        className={`tool-button ${activeTool === 'move' ? 'active' : ''}`}
        aria-pressed={activeTool === 'move'}
        title="Move region points"
        onClick={() => onSelectTool('move')}
      >
        <MoveVertexIcon className="tool-icon" />
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
