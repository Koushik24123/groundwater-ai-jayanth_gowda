const TONE_BY_LABEL = { high: 'badge-success', medium: 'badge-warning', low: 'badge-danger' }

function ConfidenceTag({ label }) {
  const tone = TONE_BY_LABEL[(label || '').toLowerCase()] || 'badge-neutral'
  return <span className={`status-badge ${tone}`}>Confidence: {label || 'Unknown'}</span>
}

export default ConfidenceTag