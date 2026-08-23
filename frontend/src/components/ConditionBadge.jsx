const TONE_BY_LEVEL = {
  normal: 'badge-success',
  moderate: 'badge-warning',
  critical: 'badge-danger',
}

function ConditionBadge({ label, level }) {
  const resolvedLevel = (level || label || '').toString().toLowerCase()
  const tone = TONE_BY_LEVEL[resolvedLevel] || 'badge-neutral'
  return <span className={`status-badge ${tone}`}>{label || 'Unknown'}</span>
}

export default ConditionBadge