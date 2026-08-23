function TrendSparkline({ history, height = 120 }) {
  if (!history || history.length < 2) {
    return <p className="empty-state">Not enough history to draw a trend line.</p>
  }

  const width = 600
  const padding = 12
  const levels = history.map((point) => point.level)
  const minLevel = Math.min(...levels)
  const maxLevel = Math.max(...levels)
  const range = maxLevel - minLevel || 1

  const points = history.map((point, index) => {
    const x = padding + (index / (history.length - 1)) * (width - padding * 2)
    const y = height - padding - ((point.level - minLevel) / range) * (height - padding * 2)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  const first = history[0]
  const last = history[history.length - 1]

  return (
    <div className="sparkline-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-svg" preserveAspectRatio="none">
        <polyline points={points.join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" />
      </svg>
      <div className="sparkline-labels">
        <span>{first.timestamp.slice(0, 10)}</span>
        <span>{last.timestamp.slice(0, 10)}</span>
      </div>
    </div>
  )
}

export default TrendSparkline