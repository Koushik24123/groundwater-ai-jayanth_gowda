import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardOverview, getHealth, getProjectInfo } from '../services/api'
import ConditionBadge from '../components/ConditionBadge'

const projectTitle = 'Predictive Modeling of Ground Water Depletion and Artificial Recharge Potential'
const CONDITION_ORDER = ['Normal', 'Moderate', 'Critical']

function Home() {
  const [health, setHealth] = useState({ loading: true, available: false, data: null })
  const [project, setProject] = useState({ loading: true, data: null, error: '' })
  const [overview, setOverview] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      const [healthResult, projectResult, overviewResult] = await Promise.allSettled([
        getHealth(),
        getProjectInfo(),
        getDashboardOverview(),
      ])

      if (!isMounted) return

      setHealth({
        loading: false,
        available: healthResult.status === 'fulfilled' && healthResult.value?.status === 'ok',
        data: healthResult.status === 'fulfilled' ? healthResult.value : null,
      })

      setProject({
        loading: false,
        data: projectResult.status === 'fulfilled' ? projectResult.value : null,
        error: projectResult.status === 'rejected' ? 'Project information unavailable.' : '',
      })

      setOverview({
        loading: false,
        data: overviewResult.status === 'fulfilled' ? overviewResult.value : null,
        error: overviewResult.status === 'rejected' ? 'Network overview unavailable.' : '',
      })
    }

    load()
    return () => { isMounted = false }
  }, [])

  const statusLabel = health.loading
    ? 'Checking backend connection...'
    : health.available ? 'Backend Connected' : 'Backend Unavailable'
  const statusTone = health.available ? 'success' : 'warning'
  const overviewData = overview.data

  return (
    <div className="page-shell dashboard-shell">
      <header className="page-header">
        <span className="eyebrow">Groundwater Decision Support System</span>
        <h1>{projectTitle}</h1>
      </header>

      <div className={`status-banner ${statusTone}`}>
        {statusLabel}
        {!health.loading && health.data?.timestamp && ` · ${new Date(health.data.timestamp).toLocaleString()}`}
      </div>

      {!health.available && !health.loading && (
        <p className="info-note warning-note">
          Live data cannot currently be loaded because the backend is unavailable.
        </p>
      )}

      <p className="lead-text">
        This dashboard turns the trained groundwater model into a decision-support workflow: check
        current network conditions, run a station-level prediction, review artificial recharge
        recommendations, explore spatial patterns, and inspect model reasoning — all from real
        project data and the saved trained model.
      </p>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <div className="card-header"><h2>Model Information</h2></div>
          {project.loading ? (
            <p className="card-loading">Loading model information...</p>
          ) : project.error ? (
            <p className="card-error">{project.error}</p>
          ) : project.data ? (
            <dl className="detail-list">
              <div><dt>Model name</dt><dd>{project.data.model_name || 'Unavailable'}</dd></div>
              <div><dt>Input features</dt><dd>{project.data.feature_count ?? 'Unavailable'}</dd></div>
              <div><dt>Monitoring stations</dt><dd>{project.data.station_count ?? 'Unavailable'}</dd></div>
            </dl>
          ) : null}
        </section>

        <section className="dashboard-card">
          <div className="card-header"><h2>Network Condition</h2></div>
          {overview.loading ? (
            <p className="card-loading">Loading network condition...</p>
          ) : overview.error ? (
            <p className="card-error">{overview.error}</p>
          ) : overviewData ? (
            <div className="condition-summary-list">
              {CONDITION_ORDER.map((label) => (
                <div key={label} className="condition-summary-item">
                  <ConditionBadge label={label} level={label} />
                  <strong>{overviewData.condition_counts?.[label] ?? 0}</strong>
                  <span>stations</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="dashboard-card">
          <div className="card-header"><h2>Recharge Potential Overview</h2></div>
          {overview.loading ? (
            <p className="card-loading">Loading recharge overview...</p>
          ) : overview.error ? (
            <p className="card-error">{overview.error}</p>
          ) : overviewData ? (
            <>
              <dl className="detail-list">
                <div><dt>Average recharge score</dt><dd>{Number(overviewData.average_recharge_score ?? 0).toFixed(2)}</dd></div>
              </dl>
              <div className="category-list">
                {Object.entries(overviewData.recharge_categories || {}).map(([label, value]) => (
                  <div className="category-item" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>

      <section className="quick-links">
        <h2>Start a decision-support workflow</h2>
        <div className="link-row">
          <Link className="action-link" to="/prediction">1. Predict Groundwater Level</Link>
          <Link className="action-link" to="/recharge">2. Review Recharge Guidance</Link>
          <Link className="action-link" to="/spatial">3. Explore Spatial Patterns</Link>
          <Link className="action-link" to="/explainability">4. Inspect Model Reasoning</Link>
        </div>
      </section>
    </div>
  )
}

export default Home