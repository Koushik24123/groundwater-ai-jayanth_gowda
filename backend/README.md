# Backend for the groundwater AI project

This FastAPI backend serves the completed project API for the groundwater depletion and recharge assessment workflow.

## Included functionality

- Project metadata at GET /
- Health check at GET /health
- Groundwater prediction at POST /predict using the saved model and metadata-driven feature order
- Artificial recharge potential overview and station results
- Explainability summary and numerical importance results from the saved project artifacts

## Setup

```bash
cd /workspaces/groundwater-ai
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
pip install -r requirements.txt
```

## Run the backend

```bash
cd /workspaces/groundwater-ai
source .venv/bin/activate
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

## Active API endpoints

- GET /
  - Returns project metadata, model availability, and artifact paths.

- GET /health
  - Returns backend health status with a timestamp.

- POST /predict
  - Uses the trained model and the exact feature contract defined in models/best_model_meta.json.
  - The 21-feature payload must match the saved metadata order exactly.

- GET /recharge/summary
  - Returns summary statistics for the artificial recharge potential assessment.

- GET /recharge/stations
  - Returns all recharge assessment station records.

- GET /recharge/stations/{station_id}
  - Returns a single station&apos;s recharge assessment details.

- GET /explainability/summary
  - Returns summary information about model explainability methods and artifact availability.

- GET /explainability/feature-importance
  - Returns the coefficient-based importance results from the saved explainability artifact.

- GET /explainability/permutation-importance
  - Returns permutation-importance results from the saved artifact.

## Scientific notes

- Recharge endpoints represent the project&apos;s artificial recharge potential assessment, not measured recharge.
- Explainability outputs describe model influence and behavior in the trained model, not physical causation.
- Do not modify notebooks, datasets, model artifacts, or explainability methodology.
