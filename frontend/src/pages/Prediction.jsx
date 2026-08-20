import { useState } from 'react'
import { predictGroundwater } from '../services/api'

const exampleValues = {
  latitude: '13.07',
  longitude: '77.45',
  rlMsl: '849',
  date: '2021-10-06',
  time: '00:00',
  lag1: '-22.71',
  lag4: '-22.34',
  lag28: '-22.51',
  rollingMean4: '-22.8625',
  rollingStd4: '0.4192354151706821',
  stationId: '0',
}

function getIsoWeek(date) {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = tempDate.getUTCDay() || 7
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum)
  const startOfYear = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1))
  return Math.ceil((((tempDate - startOfYear) / 86400000) + 1) / 7)
}

function buildPredictionPayload(formData) {
  const dateValue = new Date(`${formData.date}T${formData.time}`)

  if (Number.isNaN(dateValue.getTime())) {
    throw new Error('The selected date and time are invalid.')
  }

  const month = dateValue.getMonth() + 1
  const hour = dateValue.getHours()
  const dayOfWeek = dateValue.getDay()

  return {
    Latitude: Number(formData.latitude),
    Longitude: Number(formData.longitude),
    RL_MSL: Number(formData.rlMsl),
    Year: dateValue.getFullYear(),
    Month: month,
    Day: dateValue.getDate(),
    Hour: hour,
    DayOfWeek: dayOfWeek,
    WeekOfYear: getIsoWeek(dateValue),
    Quarter: Math.floor((month - 1) / 3) + 1,
    IsWeekend: dayOfWeek >= 5 ? 1 : 0,
    Lag_1: Number(formData.lag1),
    Lag_4: Number(formData.lag4),
    Lag_28: Number(formData.lag28),
    RollingMean_4: Number(formData.rollingMean4),
    RollingStd_4: Number(formData.rollingStd4),
    Hour_sin: Math.sin((2 * Math.PI * hour) / 24),
    Hour_cos: Math.cos((2 * Math.PI * hour) / 24),
    Month_sin: Math.sin((2 * Math.PI * (month - 1)) / 12),
    Month_cos: Math.cos((2 * Math.PI * (month - 1)) / 12),
    Station_ID: Number(formData.stationId),
  }
}

function validateForm(formData) {
  const errors = {}

  const latitude = Number(formData.latitude)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.latitude = 'Latitude must be a number between -90 and 90.'
  }

  const longitude = Number(formData.longitude)
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.longitude = 'Longitude must be a number between -180 and 180.'
  }

  const rlMsl = Number(formData.rlMsl)
  if (!Number.isFinite(rlMsl)) {
    errors.rlMsl = 'RL_MSL must be a valid numeric value.'
  }

  const stationId = Number(formData.stationId)
  if (!Number.isInteger(stationId) || stationId < 0) {
    errors.stationId = 'Station_ID must be a non-negative integer.'
  }

  const requiredNumericFields = [
    ['lag1', 'Lag_1'],
    ['lag4', 'Lag_4'],
    ['lag28', 'Lag_28'],
    ['rollingMean4', 'RollingMean_4'],
    ['rollingStd4', 'RollingStd_4'],
  ]

  requiredNumericFields.forEach(([field, label]) => {
    const value = Number(formData[field])
    if (!Number.isFinite(value)) {
      errors[field] = `${label} must be a valid numeric value.`
    }
  })

  if (!formData.date) {
    errors.date = 'Date is required.'
  }

  if (!formData.time) {
    errors.time = 'Time is required.'
  }

  if (formData.date && formData.time) {
    const dateValue = new Date(`${formData.date}T${formData.time}`)
    if (Number.isNaN(dateValue.getTime())) {
      errors.date = 'Date and time must form a valid timestamp.'
    }
  }

  return errors
}

function Prediction() {
  const [formData, setFormData] = useState(exampleValues)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiMessage, setApiMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const loadExampleValues = () => {
    setFormData(exampleValues)
    setErrors({})
    setApiMessage('')
    setResult(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(formData)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setApiMessage('Please correct the highlighted fields before submitting.')
      setResult(null)
      return
    }

    setIsSubmitting(true)
    setApiMessage('')
    setErrors({})

    try {
      const payload = buildPredictionPayload(formData)
      const response = await predictGroundwater(payload)

      if (!response || response.status !== 'success') {
        throw new Error('The model did not return a successful prediction response.')
      }

      setResult(response)
      setApiMessage('')
    } catch (error) {
      setResult(null)
      setApiMessage(error?.message || 'Prediction request failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-shell prediction-shell">
      <header className="page-header">
        <span className="eyebrow">Groundwater Prediction</span>
        <h1>Groundwater Prediction</h1>
      </header>

      <p className="lead-text">
        Enter the location, timestamp, and recent groundwater values to generate a prediction from the
        trained project model. The form automatically derives the calendar and cyclical features required
        by the saved model metadata.
      </p>

      <form className="prediction-form" onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <h2>Location Information</h2>
          <div className="field-grid">
            <label className="field-group">
              <span>Latitude</span>
              <input name="latitude" type="number" step="any" value={formData.latitude} onChange={handleChange} />
              {errors.latitude && <small className="field-error">{errors.latitude}</small>}
            </label>

            <label className="field-group">
              <span>Longitude</span>
              <input name="longitude" type="number" step="any" value={formData.longitude} onChange={handleChange} />
              {errors.longitude && <small className="field-error">{errors.longitude}</small>}
            </label>

            <label className="field-group">
              <span>RL_MSL</span>
              <input name="rlMsl" type="number" step="any" value={formData.rlMsl} onChange={handleChange} />
              {errors.rlMsl && <small className="field-error">{errors.rlMsl}</small>}
            </label>

            <label className="field-group">
              <span>Station_ID</span>
              <input name="stationId" type="number" step="1" value={formData.stationId} onChange={handleChange} />
              {errors.stationId && <small className="field-error">{errors.stationId}</small>}
            </label>
          </div>
        </section>

        <section className="form-section">
          <h2>Observation Date and Time</h2>
          <div className="field-grid">
            <label className="field-group">
              <span>Date</span>
              <input name="date" type="date" value={formData.date} onChange={handleChange} />
              {errors.date && <small className="field-error">{errors.date}</small>}
            </label>

            <label className="field-group">
              <span>Time</span>
              <input name="time" type="time" value={formData.time} onChange={handleChange} />
              {errors.time && <small className="field-error">{errors.time}</small>}
            </label>
          </div>
        </section>

        <section className="form-section">
          <h2>Historical Groundwater Information</h2>
          <div className="field-grid">
            <label className="field-group">
              <span>Lag_1</span>
              <input name="lag1" type="number" step="any" value={formData.lag1} onChange={handleChange} />
              {errors.lag1 && <small className="field-error">{errors.lag1}</small>}
            </label>

            <label className="field-group">
              <span>Lag_4</span>
              <input name="lag4" type="number" step="any" value={formData.lag4} onChange={handleChange} />
              {errors.lag4 && <small className="field-error">{errors.lag4}</small>}
            </label>

            <label className="field-group">
              <span>Lag_28</span>
              <input name="lag28" type="number" step="any" value={formData.lag28} onChange={handleChange} />
              {errors.lag28 && <small className="field-error">{errors.lag28}</small>}
            </label>

            <label className="field-group">
              <span>RollingMean_4</span>
              <input name="rollingMean4" type="number" step="any" value={formData.rollingMean4} onChange={handleChange} />
              {errors.rollingMean4 && <small className="field-error">{errors.rollingMean4}</small>}
            </label>

            <label className="field-group">
              <span>RollingStd_4</span>
              <input name="rollingStd4" type="number" step="any" value={formData.rollingStd4} onChange={handleChange} />
              {errors.rollingStd4 && <small className="field-error">{errors.rollingStd4}</small>}
            </label>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={loadExampleValues}>
            Load Example Values
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Predicting...' : 'Predict Groundwater Level'}
          </button>
        </div>
      </form>

      {apiMessage && <div className="form-message error-message">{apiMessage}</div>}

      {result && (
        <div className="prediction-result">
          <h2>Prediction Result</h2>
          <div className="result-grid">
            <div className="result-item highlight">
              <span>Predicted Groundwater Level</span>
              <strong>{Number(result.predicted_groundwater_level).toFixed(4)} meters</strong>
            </div>
            <div className="result-item">
              <span>Model name</span>
              <strong>{result.model_name}</strong>
            </div>
            <div className="result-item">
              <span>Feature count</span>
              <strong>{result.feature_count}</strong>
            </div>
          </div>
          <p className="result-note">
            This value is produced by the trained model using the supplied location, time, and historical
            groundwater features. It reflects the project model output and is displayed according to the
            dataset’s project target convention.
          </p>
        </div>
      )}
    </div>
  )
}

export default Prediction
