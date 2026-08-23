function StationSelect({ stations, value, onChange, disabled }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="" disabled>Select a station</option>
      {stations.map((station) => (
        <option key={station.station} value={station.station}>
          {station.station}
        </option>
      ))}
    </select>
  )
}

export default StationSelect