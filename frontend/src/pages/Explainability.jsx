import { useEffect, useState } from 'react'
import {
  getExplainabilitySummary,
  getFeatureImportance,
  getPermutationImportance,
} from '../services/api'

const numberFormatter = (value, digits = 4) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A'
  }

  return Number(value).toFixed(digits)
}

function Explainability() {
  const [summary, setSummary] = useState({ loading: true, data: null, error: '' })
  const [coefficient, setCoefficient] = useState({ loading: true, data: null, error: '' })
  const [permutation, setPermutation] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let isMounted = true

    const loadExplainability = async () => {
      const [summaryResult, coefficientResult, permutationResult] = await Promise.allSettled([
        getExplainabilitySummary(),
        getFeatureImportance(),
        getPermutationImportance(),
      ])

      if (!isMounted) return

      setSummary({
        loading: false,
        data: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
        error: summaryResult.status === 'rejected' ? 'Summary unavailable from the backend.' : '',
      })

      setCoefficient({
        loading: false,
        data: coefficientResult.status === 'fulfilled' ? coefficientResult.value : null,
        error: coefficientResult.status === 'rejected' ? 'Coefficient importance could not be loaded.' : '',
      })

      setPermutation({
        loading: false,
        data: permutationResult.status === 'fulfilled' ? permutationResult.value : null,
        error: permutationResult.status === 'rejected' ? 'Permutation importance could not be loaded.' : '',
      })
    }

    loadExplainability()

    return () => {
      isMounted = false
    }
  }, [])

  const coefficientResults = coefficient.data?.results || []
  const permutationResults = permutation.data?.results || []

  const coefficientMax = coefficientResults.reduce(
    (max, item) => Math.max(max, Math.abs(Number(item.abs_coefficient ?? item.coefficient ?? 0))),
    0,
  )

  const permutationMax = permutationResults.reduce(
    (max, item) => Math.max(max, Number(item.importance_mean ?? 0)),
    0,
  )

  const sharedTopFeatures = (() => {
    const coefficientFeatures = (summary.data?.top_features_by_abs_coefficient || []).map((item) => item.feature)
    const permutationFeatures = (summary.data?.top_features_by_permutation_importance || []).map((item) => item.feature)

    return coefficientFeatures.filter((feature) => permutationFeatures.includes(feature)).slice(0, 5)
  })()

  return (
    <div className="page-shell">
      <header className="page-header">
        <span className="eyebrow">Model Explainability</span>
        <h1>Model Explainability</h1>
      </header>

      <p className="lead-text">
        This page summarises the explainability results for the trained Linear Regression groundwater
        model. It helps understand which features influence model predictions within the project&apos;s
        trained feature representation, without claiming physical causation.
      </p>

      {summary.loading ? (
        <p className="card-loading">Loading explainability summary...</p>
      ) : summary.error ? (
        <p className="card-error">{summary.error}</p>
      ) : summary.data ? (
        <div className="summary-grid">
          <section className="dashboard-card">
            <div className="card-header">
              <h2>Model overview</h2>
            </div>

            <dl className="detail-list">
              <div>
                <dt>Model</dt>
                <dd>{summary.data.model_name || 'Unavailable'}</dd>
              </div>
              <div>
                <dt>Features</dt>
                <dd>{summary.data.feature_count ?? 'Unavailable'}</dd>
              </div>
              <div>
                <dt>Available methods</dt>
                <dd>{(summary.data.available_methods || []).join(', ') || 'Unavailable'}</dd>
              </div>
            </dl>
          </section>

          <section className="dashboard-card">
            <div className="card-header">
              <h2>Available explainability methods</h2>
            </div>

            <div className="method-tag-list">
              {(summary.data.available_methods || []).map((method) => (
                <span key={method} className="method-tag">
                  {method}
                </span>
              ))}
            </div>

            <p className="info-note">
              {summary.data.interpretation_note ||
                'Feature importance reflects model influence within the trained model; it is not proof of physical causation.'}
            </p>
          </section>

          <section className="dashboard-card">
            <div className="card-header">
              <h2>Top features from project summary</h2>
            </div>

            <div className="feature-list compact-list">
              {(summary.data.top_features_by_abs_coefficient || []).slice(0, 5).map((item) => (
                <div key={item.feature} className="feature-item">
                  <span>{item.feature}</span>
                  <strong>{numberFormatter(item.abs_coefficient, 4)}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <section className="data-section">
        <h2>Coefficient-based feature importance</h2>
        <p className="section-copy">
          Coefficient-based importance describes how each feature contributes within the trained Linear
          Regression model and its engineered feature representation. This is a model-influence view,
          not proof that a feature physically causes groundwater change.
        </p>

        {coefficient.loading ? (
          <p className="card-loading">Loading coefficient-based importance...</p>
        ) : coefficient.error ? (
          <p className="card-error">{coefficient.error}</p>
        ) : coefficientResults.length ? (
          <>
            <div className="importance-chart">
              {coefficientResults.map((item) => {
                const value = Number(item.coefficient ?? 0)
                const width = coefficientMax > 0 ? (Math.abs(value) / coefficientMax) * 100 : 0

                return (
                  <div key={item.feature} className="bar-row">
                    <div className="bar-row-header">
                      <span>{item.feature}</span>
                      <strong>{numberFormatter(value, 4)}</strong>
                    </div>
                    <div className="bar-track">
                      <span
                        className={`bar-fill ${value >= 0 ? 'positive' : 'negative'}`}
                        style={{ width: `${Math.max(6, width)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Coefficient</th>
                    <th>Absolute coefficient</th>
                  </tr>
                </thead>
                <tbody>
                  {coefficientResults.map((item) => (
                    <tr key={item.feature}>
                      <td>{item.feature}</td>
                      <td>{numberFormatter(item.coefficient, 6)}</td>
                      <td>{numberFormatter(item.abs_coefficient, 6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="empty-state">No coefficient importance results were returned by the backend.</p>
        )}
      </section>

      <section className="data-section">
        <h2>Permutation importance</h2>
        <p className="section-copy">
          Permutation importance measures how model performance changes when a feature&apos;s values are
          shuffled. It reflects model behavior under the project&apos;s Notebook 11 methodology and does
          not establish physical causation.
        </p>

        {permutation.loading ? (
          <p className="card-loading">Loading permutation importance...</p>
        ) : permutation.error ? (
          <p className="card-error">{permutation.error}</p>
        ) : permutationResults.length ? (
          <>
            <div className="importance-chart">
              {permutationResults.map((item) => {
                const value = Number(item.importance_mean ?? 0)
                const width = permutationMax > 0 ? (value / permutationMax) * 100 : 0

                return (
                  <div key={item.feature} className="bar-row">
                    <div className="bar-row-header">
                      <span>{item.feature}</span>
                      <strong>{numberFormatter(value, 6)}</strong>
                    </div>
                    <div className="bar-track">
                      <span className="bar-fill positive" style={{ width: `${Math.max(6, width)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Importance mean</th>
                    <th>Importance std.</th>
                  </tr>
                </thead>
                <tbody>
                  {permutationResults.map((item) => (
                    <tr key={item.feature}>
                      <td>{item.feature}</td>
                      <td>{numberFormatter(item.importance_mean, 8)}</td>
                      <td>{numberFormatter(item.importance_std, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="empty-state">No permutation importance results were returned by the backend.</p>
        )}
      </section>

      {(summary.data || permutation.data || coefficient.data) && (
        <section className="data-section">
          <h2>Method comparison</h2>
          <div className="comparison-grid">
            <div className="dashboard-card mini-card">
              <h3>Top by coefficient magnitude</h3>
              <ul className="comparison-list">
                {(summary.data?.top_features_by_abs_coefficient || []).slice(0, 5).map((item) => (
                  <li key={item.feature}>
                    {item.feature} · {numberFormatter(item.abs_coefficient, 4)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="dashboard-card mini-card">
              <h3>Top by permutation importance</h3>
              <ul className="comparison-list">
                {(summary.data?.top_features_by_permutation_importance || []).slice(0, 5).map((item) => (
                  <li key={item.feature}>
                    {item.feature} · {numberFormatter(item.importance_mean, 4)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {sharedTopFeatures.length ? (
            <p className="info-note">
              Features appearing prominently in both methods: {sharedTopFeatures.join(', ')}.
            </p>
          ) : (
            <p className="info-note">
              Different explainability methods can rank features differently because they measure model
              behaviour in different ways.
            </p>
          )}
        </section>
      )}

      <section className="data-section">
        <h2>SHAP analysis</h2>
        {summary.data?.shap_images_available?.length ? (
          <>
            <p className="section-copy">
              SHAP visual artifacts were generated during Notebook 11 and are present in the project
              outputs folder. The current backend exposes the numerical coefficient and permutation
              importance results used on this page; the SHAP image files are not currently served as a
              dedicated frontend endpoint in this phase.
            </p>
            <ul className="artifact-list">
              {summary.data.shap_images_available.map((fileName) => (
                <li key={fileName}>{fileName}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="section-copy">
            SHAP visual artifacts are not exposed through the active API responses for this frontend, so
            the page displays the numerical model explainability results available from the backend.
          </p>
        )}
      </section>

      <section className="data-section">
        <h2>Scientific interpretation and limitations</h2>
        <p className="section-copy">
          Feature importance reflects model influence within the selected trained model and the project&apos;s
          engineered feature representation. It does not prove physical causation. A feature with high
          importance in this model does not automatically mean it is the direct hydrogeological cause of
          groundwater depletion or recharge patterns. Results should be interpreted alongside domain
          knowledge and the project dataset rather than treated as standalone scientific proof.
        </p>
      </section>
    </div>
  )
}

export default Explainability
