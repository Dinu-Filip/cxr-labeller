import type { ScanMetadata } from '../types/types'

interface ScanMetadataPanelProps {
  metadata: ScanMetadata
  comment: string
  onCommentChange: (comment: string) => void
  onClose: () => void
}

export function ScanMetadataPanel({ metadata, comment, onCommentChange, onClose }: ScanMetadataPanelProps) {
  return (
    <div className="scan-metadata-panel">
      <div className="scan-metadata-header">
        <span>Scan details</span>
        <button type="button" className="scan-metadata-close" onClick={onClose} aria-label="Close scan details">
          &times;
        </button>
      </div>
      <dl className="scan-metadata-list">
        <dt>Scan ID</dt>
        <dd>{metadata.scanId}</dd>
        <dt>Patient ID</dt>
        <dd>{metadata.patientId}</dd>
        <dt>Timestamp</dt>
        <dd>{new Date(metadata.timestamp).toLocaleString()}</dd>
      </dl>
      <label className="scan-metadata-comment-label" htmlFor="scan-comment">
        Comment
      </label>
      <textarea
        id="scan-comment"
        className="scan-metadata-comment"
        value={comment}
        placeholder="Add a note about this scan..."
        onChange={(event) => onCommentChange(event.target.value)}
      />
    </div>
  )
}
