import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSpatialStations } from '../services/api'
import ConditionBadge from '../components/ConditionBadge'
import TrendBadge from '../components/TrendBadge'
import SpatialScatterMap from '../components/SpatialScatterMap'

function Spatial() {
  const [stations, setStations] = useState({ loading: true, data: [], error: '' })
  const [conditionFilter, setConditionFilter] = useState('all')
  const [selectedStationName, setSelectedStationName] = useState('')

  useEffect(() => {
    let isMounted = true
    getSpatialStations()
      .then((response) => {
        if (!isMounted) return
        const list = response?.stations || []
        setStations({ loading: false, data: list, error: '' })
        if (list.length > 0) setSelectedStationName(list[0].station)
      })
      .catch((error) => {
        if (isMounted) setStations({ loading: false, data: [], error: error?.message || 'Spatial station data could not be loaded.' })
      })
    return () => { isMounted = false }
  }, [])

  const filteredStations = useMemo(() => {
    if (conditionFilter === 'all') return stations.data
    return stations.data.filter((station) => station.condition === conditionFilter)
  }, [stations.data, conditionFilter])

  const selectedStation = useMemo(
    () => stations.data.find((station) => station.station === selectedStationName) || null,
    [stations.data, selectedStationName],
  )

  return (
    <div className="page-shell spatial-shell">
      <header className="page-header">
        <span className="eyebrow">Spatial Analysis</span>
        <h1>Spatial Groundwater Overview</h1>
      </header>

      <p className="lead-text">
        Each point represents a monitoring station plotted by its geographic coordinates and
        colour-coded by current groundwater condition. Select a station to review its condition,
        trend, and recharge category, then continue directly into prediction or recharge guidance.
      </p>

      {stations.loading ? (
        <p className="card-loading">Loading spatial station data...</p>
      ) : stations.error ? (
        <p className="card-error">{stations.error}</p>
      ) : (
        <div className="spatial-layout">
          <section className="spatial-map-panel">
            <div className="filter-row">
              <label className="filter-box">
                <span>Condition</span>
                <select value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}>
                  <option value="all">All conditions</option>
                  <option value="Normal">Normal</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Critical">Critical</option>
                </select>
              </label>
            </div>

            <SpatialScatterMap
              stations={filteredStations}
              selectedStation={selectedStationName}
              onSelect={setSelectedStationName}
            />

            <div className="map-legend">
              <span><i className="legend-dot legend-green" /> Normal</span>
              <span><i className="legend-dot legend-yellow" /> Moderate</span>
              <span><i className="legend-dot legend-red" /> Critical</span>
            </div>
          </section>

          <section className="station-detail-panel">
            <h2>Station Detail</h2>
            {selectedStation ? (
              <>
                <h3>{selectedStation.station}</h3>
                <div className="detail-grid">
                  <div className="detail-item"><span>Condition</span><ConditionBadge label={selectedStation.condition} level={selectedStation.condition} /></div>
                  <div className="detail-item"><span>Trend</span><TrendBadge label={selectedStation.trend} /></div>
                  <div className="detail-item"><span>Latest Level</span><strong>{Number(selectedStation.latest_level).toFixed(2)} m</strong></div>
                  <div className="detail-item"><span>Average Level</span><strong>{Number(selectedStation.avg_level).toFixed(2)} m</strong></div>
                  <div className="detail-item"><span>Recharge Category</span><strong>{selectedStation.recharge_category ?? '—'}</strong></div>
                  <div className="detail-item"><span>Recharge Score</span><strong>{selectedStation.recharge_score != null ? Number(selectedStation.recharge_score).toFixed(2) : '—'}</strong></div>
                  <div className="detail-item"><span>Observations</span><strong>{selectedStation.observations}</strong></div>
                </div>

                <div className="link-row">
                  <Link className="action-link" to={`/prediction?station=${encodeURIComponent(selectedStation.station)}`}>Run Prediction</Link>
                  <Link className="action-link" to={`/recharge?station=${encodeURIComponent(selectedStation.station)}`}>View Recharge Guidance</Link>
                </div>
              </>
            ) : (
              <p className="empty-state">Select a station on the map to view details.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default Spatial