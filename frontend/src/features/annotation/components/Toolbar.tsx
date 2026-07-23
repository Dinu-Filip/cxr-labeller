import type { Tool } from '../types/types'
import { MoveVertexIcon, SelectIcon } from './icons'

interface ToolbarProps {
  activeTool: Tool
  onSelectTool: (tool: Tool) => void
}

export function Toolbar({ activeTool, onSelectTool }: ToolbarProps) {
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
    </div>
  )
}
