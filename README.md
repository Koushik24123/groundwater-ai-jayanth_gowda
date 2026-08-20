# Predictive Modeling of Ground Water Depletion and Artificial Recharge Potential

## Project overview

This repository contains a complete academic groundwater AI project focused on predicting groundwater depletion and assessing artificial recharge potential. It includes the full machine learning workflow, a FastAPI backend, and a React + Vite frontend application for exploring project outputs and interacting with the trained model.

## Problem statement and motivation

Groundwater resources are vital for water security, and understanding depletion patterns is important for planning and sustainable management. This project develops a predictive modeling workflow for groundwater levels using historical data, engineered temporal and spatial features, and a saved trained regression model. It also includes an artificial recharge potential assessment and model explainability analysis to help interpret model behavior.

## Main objectives

- Explore and clean groundwater monitoring data from the project dataset.
- Engineer relevant features for temporal, lag, rolling, and cyclical behavior.
- Train and compare candidate regression models.
- Save the selected model and metadata for reuse in a production-style application.
- Provide a prediction API for groundwater level estimation.
- Provide a recharge assessment API that presents artificial recharge potential by station.
- Provide explainability results for coefficient-based and permutation-based feature importance.
- Deliver a simple web frontend for project review and exploration.

## High-level workflow

1. Data exploration and preprocessing
2. Exploratory data analysis
3. Feature engineering
4. Baseline model development
5. Model training and comparison
6. Model evaluation
7. Spatial analysis
8. Prediction pipeline
9. Artificial recharge assessment
10. Model explainability

## Selected model

The saved project metadata confirms the selected model is:

- Linear Regression

The model artifact and metadata are stored in:

- models/best_model.pkl
- models/best_model_meta.json

## Repository structure

```text
groundwater-ai/
├── backend/
│   ├── app/
│   ├── README.md
│   └── requirements.txt
├── data/
│   ├── raw/
│   ├── processed/
│   └── sample/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
├── models/
│   ├── best_model.pkl
│   └── best_model_meta.json
├── notebooks/
├── outputs/
│   ├── explainability/
│   └── recharge/
├── .gitignore
├── LICENSE
├── README.md
├── requirements.txt
└── backend/requirements.txt
```

## Machine learning workflow summary

The notebooks implement the project pipeline for:

- data exploration
- data cleaning and preprocessing
- exploratory data analysis
- feature engineering
- baseline modeling
- model training and comparison
- model evaluation
- spatial analysis
- prediction pipeline
- artificial recharge assessment
- model explainability

The trained model is saved and reused by the backend and frontend rather than retrained during application use.

## Backend overview

The backend is implemented in FastAPI and serves:

- project metadata and health checks
- groundwater prediction using the saved trained model
- recharge assessment data and station detail
- explainability summary, coefficient importance, and permutation importance

## Frontend overview

The frontend is a React + Vite application with routes for:

- Home
- Prediction
- Recharge Assessment
- Explainability
- About

The UI is designed to be readable, responsive, and suitable for academic project demonstration.

## Main application features

- Groundwater prediction from the saved model using the required feature contract
- Artificial recharge potential assessment overview and station-level results
- Model explainability using coefficient and permutation importance results
- Summary cards and data-driven page elements from live backend APIs
- Responsive academic project interface with project documentation and interpretation notes

## API overview

The active project endpoints are:

- GET /
- GET /health
- POST /predict
- GET /recharge/summary
- GET /recharge/stations
- GET /recharge/stations/{station_id}
- GET /explainability/summary
- GET /explainability/feature-importance
- GET /explainability/permutation-importance

The frontend calls these endpoints from the central API service in frontend/src/services/api.js.

## Installation and setup

### Backend

```bash
cd /workspaces/groundwater-ai
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
pip install -r requirements.txt
```

Start the backend:

```bash
cd /workspaces/groundwater-ai
source .venv/bin/activate
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

### Frontend

```bash
cd /workspaces/groundwater-ai/frontend
npm install
```

Start the frontend in development mode:

```bash
cd /workspaces/groundwater-ai/frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Production build:

```bash
cd /workspaces/groundwater-ai/frontend
npm run build
```

## Expected local URLs

- Frontend: http://127.0.0.1:5173
- Backend: http://127.0.0.1:8000

Run backend and frontend in separate terminals during local development.

## Prediction workflow

The prediction flow uses the saved trained model and the model metadata contract defined in models/best_model_meta.json. The frontend prepares the required numeric fields, including derived temporal and cyclical features such as weekday, week-of-year, quarter, and trig-encoded time values before submitting to POST /predict.

## Recharge assessment workflow

The recharge module presents the project&apos;s artificial recharge potential assessment results. These outputs are based on the project&apos;s rule-based assessment methodology and are intended as relative recharge potential indicators rather than directly measured recharge quantities.

## Explainability workflow

The explainability module presents real backend results from:

- coefficient-based feature importance
- permutation importance
- SHAP visual artifacts generated during project analysis where they are available in outputs/explainability/

Explainability is interpreted as model influence and trained-model behavior, not proof of physical causation.

## Technology stack

This project uses the following verified technologies:

- Python
- FastAPI
- React
- Vite
- JavaScript
- scikit-learn
- XGBoost
- Pandas
- NumPy
- Matplotlib
- Seaborn
- Jupyter
- SHAP visual artifacts generated during analysis

## Scientific limitations and responsible interpretation

This project is designed as an academic AI and decision-support workflow. Important limitations include:

- Predictions depend on the saved trained model, engineered feature representation, and project dataset context.
- Recharge outputs represent a rule-based artificial recharge potential assessment and are not measured recharge values.
- Explainability results reflect model influence within the trained model and should not be interpreted as proof of physical causation.
- Results should be interpreted alongside domain knowledge and the project methodology rather than treated as standalone scientific proof.

## Project status

The project is functionally complete for the academic ML, backend, and frontend workflow described above. The repository is ready for local verification, demonstration, and continuation under the project&apos;s current methodology and data artifacts.
