const workflowSteps = [
  'Data and preprocessing',
  'Feature engineering',
  'Model training and evaluation',
  'Groundwater prediction',
  'Artificial recharge potential assessment',
  'Model explainability',
]

const technologies = ['Python', 'FastAPI', 'React', 'Vite', 'scikit-learn', 'SHAP']

function About() {
  return (
    <div className="page-shell about-shell">
      <header className="page-header">
        <span className="eyebrow">About the Project</span>
        <h1>About</h1>
      </header>

      <div className="about-grid">
        <section className="about-card">
          <h2>Project Overview</h2>
          <p>
            This academic project focuses on <strong>Predictive Modeling of Ground Water Depletion and
            Artificial Recharge Potential</strong>. It combines historical groundwater information,
            machine learning prediction, and transparent model interpretation to support research and
            decision support within the project dataset and model workflow.
          </p>
        </section>

        <section className="about-card">
          <h2>Project Objective</h2>
          <p>
            The project aims to model groundwater depletion trends and assess artificial recharge
            potential using the trained project pipeline. The work is designed as a research-oriented
            application that helps demonstrate how data preparation, feature engineering, model
            selection, and explainability are used in an academic AI workflow.
          </p>
        </section>

        <section className="about-card about-full">
          <h2>Application Workflow</h2>
          <ol className="workflow-list">
            {workflowSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="about-card">
          <h2>Prediction Module</h2>
          <p>
            The prediction module uses the saved trained model and the project&apos;s required feature
            representation. The frontend prepares the necessary temporal and cyclical features from the
            selected date and time, following the project&apos;s feature engineering logic defined in the
            trained model metadata and backend contract.
          </p>
        </section>

        <section className="about-card">
          <h2>Recharge Assessment Module</h2>
          <p>
            The recharge module presents the project&apos;s artificial recharge potential assessment. The
            results are based on the project&apos;s rule-based assessment methodology and represent
            relative recharge potential rather than directly measured recharge values.
          </p>
        </section>

        <section className="about-card">
          <h2>Explainability Module</h2>
          <p>
            The explainability module presents coefficient-based and permutation-importance results from
            the trained model. These results describe model behavior and feature influence within the
            project&apos;s trained model representation. They do not prove physical causation.
          </p>
        </section>

        <section className="about-card">
          <h2>Technology Stack</h2>
          <div className="pill-list" aria-label="Technology stack">
            {technologies.map((technology) => (
              <span key={technology} className="tech-pill">
                {technology}
              </span>
            ))}
          </div>
        </section>

        <section className="about-card about-full">
          <h2>Project Limitations and Responsible Interpretation</h2>
          <p>
            Predictions depend on the trained model and the available project dataset. Recharge outputs
            represent the project&apos;s relative potential assessment under its defined methodology, not
            measured recharge. Model explainability reflects learned feature influence within the trained
            model and should be interpreted alongside hydrogeological knowledge, not treated as standalone
            proof of physical causation.
          </p>
        </section>
      </div>
    </div>
  )
}

export default About
