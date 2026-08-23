const COLOR_BY_KEY = { green: '#16a34a', yellow: '#d97706', red: '#dc2626' }

function SpatialScatterMap({ stations, selectedStation, onSelect }) {
  if (!stations || stations.length === 0) {
    return <p className="empty-state">No station coordinates are available to plot.</p>
  }

  const width = 640
  const height = 420
  const padding = 30

  const lats = stations.map((station) => station.latitude)
  const lngs = stations.map((station) => station.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 1
  const lngRange = maxLng - minLng || 1

  const project = (station) => {
    const x = padding + ((station.longitude - minLng) / lngRange) * (width - padding * 2)
    const y = height - padding - ((station.latitude - minLat) / latRange) * (height - padding * 2)
    return { x, y }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="spatial-map-svg" role="img" aria-label="Station spatial map">
      <rect x="0" y="0" width={width} height={height} className="spatial-map-bg" />
      {stations.map((station) => {
        const { x, y } = project(station)
        const isSelected = station.station === selectedStation
        const fill = COLOR_BY_KEY[station.color] || '#64748b'
        return (
          <g
            key={station.station}
            transform={`translate(${x}, ${y})`}
            className="spatial-map-point"
            onClick={() => onSelect(station.station)}
          >
            <circle
              r={isSelected ? 9 : 6}
              fill={fill}
              stroke={isSelected ? '#0f172a' : '#ffffff'}
              strokeWidth={isSelected ? 2 : 1}
            />
            {isSelected && <text x="10" y="4" className="spatial-map-label">{station.station}</text>}
          </g>
        )
      })}
    </svg>
  )
}

export default SpatialScatterMap