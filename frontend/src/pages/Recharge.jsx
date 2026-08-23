import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRechargeGuidance, getRechargeStations, getRechargeSummary } from '../services/api'
import ReasonList from '../components/ReasonList'
import RecommendationList from '../components/RecommendationList'

const CATEGORY_TONE = {
  'High Recharge Potential': 'badge-success',
  'Medium Recharge Potential': 'badge-warning',
  'Low Recharge Potential': 'badge-danger',
}

function Recharge() {
  const [searchParams, setSearchParams] = useSearchParams()
  const presetStation = searchParams.get('station') || ''

  const [summary, setSummary] = useState({ loading: true, data: null, error: '' })
  const [stations, setStations] = useState({ loading: true, data: [], error: '' })
  const [guidance, setGuidance] = useState({ loading: false, data: null, error: '' })
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStationName, setSelectedStationName] = useState(presetStation)

  useEffect(() => {
    let isMounted = true

    getRechargeSummary()
      .then((response) => { if (isMounted) setSummary({ loading: false, data: response, error: '' }) })
      .catch((error) => {
        if (isMounted) setSummary({ loading: false, data: null, error: error?.message || 'Recharge summary could not be loaded.' })
      })

    getRechargeStations()
      .then((response) => {
        if (!isMounted) return
        const stationList = response?.stations || []
        setStations({ loading: false, data: stationList, error: '' })
        const defaultStation = stationList.find((item) => item.Station === presetStation) || stationList[0]
        if (defaultStation) setSelectedStationName(defaultStation.Station)
      })
      .catch((error) => {
        if (isMounted) setStations({ loading: false, data: [], error: error?.message || 'Station data could not be loaded.' })
      })

    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedStationName) return
    let isMounted = true

    setGuidance({ loading: true, data: null, error: '' })
    getRechargeGuidance(selectedStationName)
      .then((response) => { if (isMounted) setGuidance({ loading: false, data: response, error: '' }) })
      .catch((error) => {
        if (isMounted) setGuidance({ loading: false, data: null, error: error?.message || 'Recharge guidance could not be loaded.' })
      })

    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('station', selectedStationName)
      return next
    }, { replace: true })

    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationName])

  const categories = useMemo(() => {
    const uniqueCategories = new Set()
    stations.data.forEach((station) => { if (station.Recharge_Category) uniqueCategories.add(station.Recharge_Category) })
    return Array.from(uniqueCategories)
  }, [stations.data])

  const filteredStations = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return stations.data.filter((station) => {
      const matchesSearch = !query || String(station.Station || '').toLowerCase().includes(query)
      const matchesCategory = selectedCategory === 'all' || station.Recharge_Category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchText, selectedCategory, stations.data])

  const summaryData = summary.data
  const guidanceData = guidance.data

  return (
    <div className="page-shell recharge-shell">
      <header className="page-header">
        <span className="eyebrow">Artificial Recharge Assessment</span>
        <h1>Recharge Assessment</h1>
      </header>

      <div className="summary-card">
        <h2>Artificial Recharge Potential Assessment</h2>
        {summary.loading ? (
          <p className="card-loading">Loading recharge summary...</p>
        ) : summary.error ? (
          <p className="card-error">{summary.error}</p>
        ) : summaryData ? (
          <>
            <div className="summary-grid">
              <div className="summary-item"><span>Total Stations</span><strong>{summaryData.total_stations ?? '—'}</strong></div>
              <div className="summary-item"><span>Average Recharge Score</span><strong>{Number(summaryData.average_recharge_score ?? 0).toFixed(2)}</strong></div>
              <div className="summary-item"><span>Minimum Score</span><strong>{Number(summaryData.min_recharge_score ?? 0).toFixed(2)}</strong></div>
              <div className="summary-item"><span>Maximum Score</span><strong>{Number(summaryData.max_recharge_score ?? 0).toFixed(2)}</strong></div>
            </div>
            <div className="category-grid">
              {Object.entries(summaryData.categories || {}).map(([label, value]) => (
                <div key={label} className="category-box"><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
            <p className="info-note">
              {summaryData.methodology_note ||
                "This assessment indicates relative artificial recharge potential based on the project's rule-based methodology. It does not represent measured recharge."}
            </p>
          </>
        ) : null}
      </div>

      <div className="recharge-layout">
        <section className="recharge-panel">
          <div className="panel-header"><h2>Station Results</h2></div>

          <div className="filter-row">
            <label className="search-box">
              <span>Search station</span>
              <input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by station name" />
            </label>

            <label className="filter-box">
              <span>Category</span>
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
          </div>

          {stations.loading ? (
            <p className="card-loading">Loading station results...</p>
          ) : stations.error ? (
            <p className="card-error">{stations.error}</p>
          ) : filteredStations.length === 0 ? (
            <p className="empty-state">No matching stations found for the current search and filter.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Station</th><th>Avg Depth</th><th>Recharge Score</th><th>Category</th></tr></thead>
                <tbody>
                  {filteredStations.map((station) => (
                    <tr
                      key={station.Station}
                      className={selectedStationName === station.Station ? 'selected-row' : ''}
                      onClick={() => setSelectedStationName(station.Station)}
                    >
                      <td>{station.Station}</td>
                      <td>{station.Avg_Depth != null ? Number(station.Avg_Depth).toFixed(2) : '—'}</td>
                      <td>{station.Recharge_Score != null ? Number(station.Recharge_Score).toFixed(2) : '—'}</td>
                      <td>{station.Recharge_Category ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="station-detail-panel">
          <h2>Recharge Guidance</h2>

          {guidance.loading ? (
            <p className="card-loading">Loading recharge guidance...</p>
          ) : guidance.error ? (
            <p className="card-error">{guidance.error}</p>
          ) : guidanceData ? (
            <>
              <div className="guidance-heading">
                <h3>{guidanceData.station}</h3>
                <span className={`status-badge ${CATEGORY_TONE[guidanceData.category] || 'badge-neutral'}`}>
                  {guidanceData.category}
                </span>
              </div>
              <p className="result-note">{guidanceData.headline}</p>

              <ReasonList title="Why this assessment" items={guidanceData.reasons} />

              <h4>Recommended Actions</h4>
              <RecommendationList items={guidanceData.recommendations} />

              <p className="info-note">{guidanceData.methodology_note}</p>
            </>
          ) : (
            <p className="empty-state">Select a station to view its recharge guidance.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default Recharge