const API_BASE_URL = 'http://127.0.0.1:8000'

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null
        ? data.detail?.message || data.detail || data.message || 'Request failed'
        : data

    throw new Error(typeof message === 'string' ? message : 'Request failed')
  }

  return data
}

export async function getProjectInfo() {
  return request('/')
}

export async function getHealth() {
  return request('/health')
}

export async function predictGroundwater(data) {
  return request('/predict', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getRechargeSummary() {
  return request('/recharge/summary')
}

export async function getRechargeStations() {
  return request('/recharge/stations')
}

export async function getRechargeStation(stationId) {
  return request(`/recharge/stations/${stationId}`)
}

export async function getExplainabilitySummary() {
  return request('/explainability/summary')
}

export async function getFeatureImportance() {
  return request('/explainability/feature-importance')
}

export async function getPermutationImportance() {
  return request('/explainability/permutation-importance')
}
export async function getStations() {
  return request('/stations')
}

export async function getStation(stationName) {
  return request(`/stations/${encodeURIComponent(stationName)}`)
}

export async function getStationHistory(stationName, limit = 180) {
  return request(`/stations/${encodeURIComponent(stationName)}/history?limit=${limit}`)
}

export async function predictSimple({ station, date, time }) {
  return request('/predict/simple', {
    method: 'POST',
    body: JSON.stringify({ station, date, time }),
  })
}

export async function getDashboardOverview() {
  return request('/dashboard/overview')
}

export async function getSpatialStations() {
  return request('/spatial/stations')
}

export async function getRechargeGuidance(stationId) {
  return request(`/recharge/stations/${encodeURIComponent(stationId)}/guidance`)
}

export async function getExplainabilityPlainLanguage() {
  return request('/explainability/plain-language')
}