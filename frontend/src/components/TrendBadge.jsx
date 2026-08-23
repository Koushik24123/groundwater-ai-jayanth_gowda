const ICON_BY_DIRECTION = { down: '↓', up: '↑', steady: '→', unknown: '·' }
const TONE_BY_DIRECTION = {
  down: 'badge-danger',
  up: 'badge-success',
  steady: 'badge-neutral',
  unknown: 'badge-neutral',
}
const DIRECTION_BY_LABEL = { Declining: 'down', Recovering: 'up', Stable: 'steady' }

function TrendBadge({ label, direction }) {
  const resolvedDirection = (direction || DIRECTION_BY_LABEL[label] || 'unknown').toLowerCase()
  const icon = ICON_BY_DIRECTION[resolvedDirection] || '·'
  const tone = TONE_BY_DIRECTION[resolvedDirection] || 'badge-neutral'
  return (
    <span className={`status-badge ${tone}`}>
      <span aria-hidden="true">{icon}</span> {label || 'Unknown'}
    </span>
  )
}

export default TrendBadge