interface ProgressBarProps {
  percent: number
}

export function ProgressBar({ percent }: ProgressBarProps) {
  const rounded = Math.round(percent)

  return (
    <div className="progress-bar">
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${rounded}%` }} />
      </div>
      <span className="progress-bar-label">{rounded}% coverage</span>
    </div>
  )
}
