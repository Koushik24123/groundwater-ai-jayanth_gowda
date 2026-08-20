import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExplainabilitySummary, getHealth, getProjectInfo, getRechargeSummary } from '../services/api'

const projectTitle = 'Predictive Modeling of Ground Water Depletion and Artificial Recharge Potential'

function Home() {
  const [health, setHealth] = useState({ loading: true, available: false, data: null, error: '' })
  const [project, setProject] = useState({ loading: true, data: null, error: '' })
  const [recharge, setRecharge] = useState({ loading: true, data: null, error: '' })
  const [explainability, setExplainability] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      const [healthResult, projectResult, rechargeResult, explainabilityResult] = await Promise.allSettled([
        getHealth(),
        getProjectInfo(),
        getRechargeSummary(),
        getExplainabilitySummary(),
      ])

      if (!isMounted) return

      setHealth({
        loading: false,
        available: healthResult.status === 'fulfilled' && healthResult.value?.status === 'ok',
        data: healthResult.status === 'fulfilled' ? healthResult.value : null,
        error: healthResult.status === 'rejected' ? 'Backend unavailable' : '',
      })

      setProject({
        loading: false,
        data: projectResult.status === 'fulfilled' ? projectResult.value : null,
        error: projectResult.status === 'rejected' ? 'Project information unavailable' : '',
      })

      setRecharge({
        loading: false,
        data: rechargeResult.status === 'fulfilled' ? rechargeResult.value : null,
        error: rechargeResult.status === 'rejected' ? 'Recharge summary unavailable' : '',
      })

      setExplainability({
        loading: false,
        data: explainabilityResult.status === 'fulfilled' ? explainabilityResult.value : null,
        error: explainabilityResult.status === 'rejected' ? 'Explainability summary unavailable' : '',
      })
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [])

  const statusLabel = health.loading ? 'Checking backend connection...' : health.available ? 'Backend Connected' : 'Backend Unavailable'
  const statusTone = health.available ? 'success' : 'warning'

  return (
    <div className="page-shell dashboard-shell">
      <header className="page-header">
        <span className="eyebrow">Project Dashboard</span>
        <h1>{projectTitle}</h1>
      </header>

      <div className={`status-banner ${statusTone}`}>
        {statusLabel}
        {!health.loading && health.data?.timestamp && ` · ${new Date(health.data.timestamp).toLocaleString()}`}
      </div>

      {!health.available && !health.loading && (
        <p className="info-note warning-note">
          API-powered project data cannot currently be loaded because the backend is unavailable.
        </p>
      )}

      <p className="lead-text">
        This academic project predicts groundwater levels using the trained machine learning model,
        presents artificial recharge potential assessment results, and provides model explainability
        results for research and decision support.
      </p>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <div className="card-header">
            <h2>Model Information</h2>
          </div>

          {project.loading ? (
            <p className="card-loading">Loading model information...</p>
          ) : project.error ? (
            <p className="card-error">{project.error}</p>
          ) : project.data ? (
            <dl className="detail-list">
              <div>
                <dt>Model name</dt>
                <dd>{project.data.model_name || 'Unavailable'}</dd>
              </div>
              <div>
                <dt>Input features</dt>
                <dd>{project.data.feature_count ?? 'Unavailable'}</dd>
              </div>
              <div>
                <dt>Model status</dt>
                <dd>{project.data.model_exists ? 'Available in project' : 'Unavailable'}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="dashboard-card">
          <div className="card-header">
            <h2>Artificial Recharge Potential Assessment</h2>
          </div>

          {recharge.loading ? (
            <p className="card-loading">Loading recharge summary...</p>
          ) : recharge.error ? (
            <p className="card-error">{recharge.error}</p>
          ) : recharge.data ? (
            <>
              <dl className="detail-list">
                <div>
                  <dt>Total stations</dt>
                  <dd>{recharge.data.total_stations ?? 'Unavailable'}</dd>
                </div>
                <div>
                  <dt>Average score</dt>
                  <dd>{Number(recharge.data.average_recharge_score ?? 0).toFixed(2)}</dd>
                </div>
              </dl>

              <div className="category-list">
                {Object.entries(recharge.data.categories || {}).map(([label, value]) => (
                  <div className="category-item" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <p className="info-note">
                {recharge.data.methodology_note || 'This summary reflects the project methodology for recharge potential assessment.'}
              </p>
            </>
          ) : null}
        </section>

        <section className="dashboard-card">
          <div className="card-header">
            <h2>Model Explainability</h2>
          </div>

          {explainability.loading ? (
            <p className="card-loading">Loading explainability summary...</p>
          ) : explainability.error ? (
            <p className="card-error">{explainability.error}</p>
          ) : explainability.data ? (
            <>
              <dl className="detail-list">
                <div>
                  <dt>Model</dt>
                  <dd>{explainability.data.model_name || 'Unavailable'}</dd>
                </div>
                <div>
                  <dt>Available methods</dt>
                  <dd>{(explainability.data.available_methods || []).join(', ') || 'Unavailable'}</dd>
                </div>
                <div>
                  <dt>Features counted</dt>
                  <dd>{explainability.data.feature_count ?? 'Unavailable'}</dd>
                </div>
              </dl>

              <div className="feature-list">
                <h3>Most influential features in the trained model</h3>
                {(explainability.data.top_features_by_abs_coefficient || []).slice(0, 5).map((featureData) => (
                  <div className="feature-item" key={featureData.feature}>
                    <span>{featureData.feature}</span>
                    <strong>{Number(featureData.abs_coefficient).toFixed(4)}</strong>
                  </div>
                ))}
              </div>

              <p className="info-note">
                {explainability.data.interpretation_note || 'Feature importance reflects model influence within the trained model and is not proof of physical causation.'}
              </p>
            </>
          ) : null}
        </section>
      </div>

      <section className="quick-links">
        <h2>Project sections</h2>
        <div className="link-row">
          <Link className="action-link" to="/prediction">Prediction</Link>
          <Link className="action-link" to="/recharge">Recharge Assessment</Link>
          <Link className="action-link" to="/explainability">Explainability</Link>
        </div>
      </section>
    </div>
  )
}

export default Home
