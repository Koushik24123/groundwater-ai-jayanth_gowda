import { useEffect, useMemo, useState } from 'react'
import {
  getRechargeStation,
  getRechargeStations,
  getRechargeSummary,
} from '../services/api'

function Recharge() {
  const [summary, setSummary] = useState({ loading: true, data: null, error: '' })
  const [stations, setStations] = useState({ loading: true, data: [], error: '' })
  const [selectedStation, setSelectedStation] = useState({ loading: false, data: null, error: '' })
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    let isMounted = true

    const loadSummary = async () => {
      try {
        const response = await getRechargeSummary()
        if (isMounted) {
          setSummary({ loading: false, data: response, error: '' })
        }
      } catch (error) {
        if (isMounted) {
          setSummary({
            loading: false,
            data: null,
            error: error?.message || 'Recharge summary could not be loaded.',
          })
        }
      }
    }

    const loadStations = async () => {
      try {
        const response = await getRechargeStations()
        if (isMounted) {
          const stationList = response?.stations || []
          setStations({ loading: false, data: stationList, error: '' })
          if (stationList.length > 0) {
            setSelectedStation({ loading: true, data: null, error: '' })
            void loadStationDetail(stationList[0].Station)
          }
        }
      } catch (error) {
        if (isMounted) {
          setStations({
            loading: false,
            data: [],
            error: error?.message || 'Station data could not be loaded.',
          })
        }
      }
    }

    const loadStationDetail = async (stationName) => {
      try {
        const response = await getRechargeStation(stationName)
        if (isMounted) {
          setSelectedStation({ loading: false, data: response?.station || null, error: '' })
        }
      } catch (error) {
        if (isMounted) {
          setSelectedStation({
            loading: false,
            data: null,
            error: error?.message || 'Station details could not be loaded.',
          })
        }
      }
    }

    void loadSummary()
    void loadStations()

    return () => {
      isMounted = false
    }
  }, [])

  const categories = useMemo(() => {
    const uniqueCategories = new Set()
    stations.data.forEach((station) => {
      if (station.Recharge_Category) uniqueCategories.add(station.Recharge_Category)
    })
    return Array.from(uniqueCategories)
  }, [stations.data])

  const filteredStations = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return stations.data.filter((station) => {
      const matchesSearch =
        !query ||
        String(station.Station || '').toLowerCase().includes(query) ||
        String(station.Latitude ?? '').toLowerCase().includes(query) ||
        String(station.Longitude ?? '').toLowerCase().includes(query)

      const matchesCategory =
        selectedCategory === 'all' || station.Recharge_Category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchText, selectedCategory, stations.data])

  const handleSelectStation = async (stationName) => {
    setSelectedStation({ loading: true, data: null, error: '' })

    try {
      const response = await getRechargeStation(stationName)
      setSelectedStation({ loading: false, data: response?.station || null, error: '' })
    } catch (error) {
      setSelectedStation({
        loading: false,
        data: null,
        error: error?.message || 'Station details could not be loaded.',
      })
    }
  }

  const summaryData = summary.data

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
              <div className="summary-item">
                <span>Total Stations</span>
                <strong>{summaryData.total_stations ?? '—'}</strong>
              </div>
              <div className="summary-item">
                <span>Average Recharge Score</span>
                <strong>{Number(summaryData.average_recharge_score ?? 0).toFixed(2)}</strong>
              </div>
              <div className="summary-item">
                <span>Minimum Score</span>
                <strong>{Number(summaryData.min_recharge_score ?? 0).toFixed(2)}</strong>
              </div>
              <div className="summary-item">
                <span>Maximum Score</span>
                <strong>{Number(summaryData.max_recharge_score ?? 0).toFixed(2)}</strong>
              </div>
            </div>

            <div className="category-grid">
              {Object.entries(summaryData.categories || {}).map(([label, value]) => (
                <div key={label} className="category-box">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <p className="info-note">
              {summaryData.methodology_note ||
                'This assessment indicates relative artificial recharge potential based on the project\'s rule-based methodology. It does not represent measured recharge.'}
            </p>
          </>
        ) : null}
      </div>

      <section className="recharge-panel">
        <div className="panel-header">
          <h2>Station Results</h2>
        </div>

        <div className="filter-row">
          <label className="search-box">
            <span>Search station</span>
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by station name or coordinates"
            />
          </label>

          <label className="filter-box">
            <span>Category</span>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
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
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Avg Depth</th>
                  <th>Recharge Score</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredStations.map((station) => (
                  <tr
                    key={station.Station}
                    className={selectedStation.data?.Station === station.Station ? 'selected-row' : ''}
                    onClick={() => handleSelectStation(station.Station)}
                  >
                    <td>{station.Station}</td>
                    <td>{station.Latitude ?? '—'}</td>
                    <td>{station.Longitude ?? '—'}</td>
                    <td>{station.Avg_Depth ?? '—'}</td>
                    <td>{station.Recharge_Score ?? '—'}</td>
                    <td>{station.Recharge_Category ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="station-detail-panel">
        <h2>Selected Station Detail</h2>

        {selectedStation.loading ? (
          <p className="card-loading">Loading station details...</p>
        ) : selectedStation.error ? (
          <p className="card-error">{selectedStation.error}</p>
        ) : selectedStation.data ? (
          <div className="detail-grid">
            {Object.entries(selectedStation.data).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span>{key}</span>
                <strong>{value ?? '—'}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">Select a station to view its assessment details.</p>
        )}
      </section>
    </div>
  )
}

export default Recharge
