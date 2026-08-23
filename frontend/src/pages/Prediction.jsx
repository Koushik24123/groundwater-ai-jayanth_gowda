import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getStations, predictSimple } from '../services/api'
import StationSelect from '../components/StationSelect'
import ConditionBadge from '../components/ConditionBadge'
import TrendBadge from '../components/TrendBadge'
import ConfidenceTag from '../components/ConfidenceTag'
import ReasonList from '../components/ReasonList'
import TrendSparkline from '../components/TrendSparkline'

function toDateInputValue(isoString) {
  if (!isoString) return ''
  return isoString.slice(0, 10)
}

function toTimeInputValue(isoString) {
  if (!isoString || isoString.length < 16) return '00:00'
  return isoString.slice(11, 16)
}

function Prediction() {
  const [searchParams] = useSearchParams()
  const presetStation = searchParams.get('station') || ''

  const [stations, setStations] = useState({ loading: true, data: [], error: '' })
  const [form, setForm] = useState({ station: '', date: '', time: '' })
  const [result, setResult] = useState({ loading: false, data: null, error: '' })

  useEffect(() => {
    let isMounted = true

    const loadStations = async () => {
      try {
        const response = await getStations()
        if (!isMounted) return
        const list = response?.stations || []
        setStations({ loading: false, data: list, error: '' })

        const initial = list.find((item) => item.station === presetStation) || list[0]
        if (initial) {
          setForm({
            station: initial.station,
            date: toDateInputValue(initial.last_observation),
            time: toTimeInputValue(initial.last_observation),
          })
        }
      } catch (error) {
        if (isMounted) {
          setStations({ loading: false, data: [], error: error?.message || 'Stations could not be loaded.' })
        }
      }
    }

    loadStations()
    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedStationMeta = useMemo(
    () => stations.data.find((item) => item.station === form.station) || null,
    [stations.data, form.station],
  )

  const handleStationChange = (stationName) => {
    const meta = stations.data.find((item) => item.station === stationName)
    setForm({
      station: stationName,
      date: meta ? toDateInputValue(meta.last_observation) : '',
      time: meta ? toTimeInputValue(meta.last_observation) : '00:00',
    })
    setResult({ loading: false, data: null, error: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.station || !form.date || !form.time) {
      setResult({ loading: false, data: null, error: 'Please select a station, date, and time.' })
      return
    }

    setResult({ loading: true, data: null, error: '' })
    try {
      const response = await predictSimple(form)
      setResult({ loading: false, data: response, error: '' })
    } catch (error) {
      setResult({ loading: false, data: null, error: error?.message || 'Prediction request failed.' })
    }
  }

  const data = result.data

  return (
    <div className="page-shell prediction-shell">
      <header className="page-header">
        <span className="eyebrow">Groundwater Prediction</span>
        <h1>Station-Level Groundwater Prediction</h1>
      </header>

      <p className="lead-text">
        Choose a monitoring station and a date and time. The trained model and the required
        historical, seasonal, and location features are prepared automatically in the backend —
        you only need to describe when and where.
      </p>

      <form className="prediction-form" onSubmit={handleSubmit}>
        <section className="form-section">
          <h2>Station and Time</h2>

          {stations.loading ? (
            <p className="card-loading">Loading monitoring stations...</p>
          ) : stations.error ? (
            <p className="card-error">{stations.error}</p>
          ) : (
            <div className="field-grid">
              <label className="field-group">
                <span>Monitoring Station</span>
                <StationSelect stations={stations.data} value={form.station} onChange={handleStationChange} />
              </label>

              <label className="field-group">
                <span>Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                />
              </label>

              <label className="field-group">
                <span>Time</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                />
              </label>
            </div>
          )}

          {selectedStationMeta && (
            <p className="info-note">
              Records for {selectedStationMeta.station} run from{' '}
              {selectedStationMeta.first_observation?.slice(0, 10)} to{' '}
              {selectedStationMeta.last_observation?.slice(0, 10)}. Dates after the last observation
              are treated as a forward-looking estimate.
            </p>
          )}
        </section>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={result.loading}>
            {result.loading ? 'Predicting...' : 'Run Prediction'}
          </button>
        </div>
      </form>

      {result.error && <div className="form-message error-message">{result.error}</div>}

      {data && (
        <div className="prediction-result">
          <h2>Prediction Result — {data.station?.name}</h2>

          <div className="result-grid">
            <div className="result-item highlight">
              <span>Predicted Groundwater Level</span>
              <strong>{Number(data.prediction?.value).toFixed(2)} m</strong>
            </div>
            <div className="result-item">
              <span>Groundwater Condition</span>
              <ConditionBadge label={data.condition?.label} level={data.condition?.level} />
            </div>
            <div className="result-item">
              <span>Trend</span>
              <TrendBadge label={data.trend?.label} direction={data.trend?.direction} />
            </div>
            <div className="result-item">
              <span>Prediction Confidence</span>
              <ConfidenceTag label={data.confidence?.label} />
            </div>
          </div>

          <p className="result-note">{data.condition?.interpretation}</p>
          <p className="result-note">{data.trend?.interpretation}</p>
          {data.confidence?.note && <p className="result-note">{data.confidence.note}</p>}
          {data.prediction?.is_extrapolated && (
            <p className="info-note warning-note">
              This date is beyond the last observed record, so the prediction is a forward-looking
              estimate built from the most recent available history.
            </p>
          )}

          {data.history?.length > 1 && (
            <div className="data-section">
              <h3>Recent Groundwater Trend</h3>
              <TrendSparkline history={data.history} />
            </div>
          )}

          <ReasonList title="What influenced this prediction" items={data.why} />

          {data.recharge && (
            <div className="recharge-teaser">
              <h3>Recharge Assessment: {data.recharge.category}</h3>
              <p>{data.recharge.headline}</p>
              <Link className="action-link" to={`/recharge?station=${encodeURIComponent(data.station?.name || '')}`}>
                View Full Recharge Guidance
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Prediction