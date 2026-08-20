"""FastAPI backend for the groundwater depletion prediction project.

Phase 1 provided the backend shell and health endpoints. This file now hosts
Phase 2 prediction functionality while keeping the original route behavior intact.
"""
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.app.explainability_service import (
    get_explainability_summary,
    get_feature_importance_results,
    get_permutation_importance_results,
)
from backend.app.model_service import get_model_name, get_model_features, predict_groundwater_level
from backend.app.recharge_service import (
    get_recharge_summary,
    get_recharge_stations,
    get_station_recharge,
)
from backend.app.schemas import PredictionRequest

PROJECT_ROOT = Path(__file__).resolve().parents[2]

app = FastAPI(
    title="Groundwater Depletion & Recharge API",
    version="0.4.0",
    description="Academic project backend for groundwater depletion prediction, recharge assessment, and model explainability.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/", tags=["info"])
async def root_info():
    """Return basic project and API information."""
    models_dir = PROJECT_ROOT / "models"
    model_file = models_dir / "best_model.pkl"
    model_exists = model_file.exists()

    return {
        "project": "Predictive Modeling of Ground Water Depletion and Artificial Recharge Potential",
        "phase": "Phase 4 - Explainability API",
        "api_version": "0.4.0",
        "models_dir": str(models_dir),
        "model_file": str(model_file),
        "model_exists": model_exists,
        "model_name": get_model_name(),
        "feature_count": len(get_model_features()),
        "recharge_artifact": "outputs/recharge/artificial_recharge_assessment.csv",
        "explainability_artifacts": [
            "outputs/explainability/feature_importance.csv",
            "outputs/explainability/permutation_importance.csv",
            "outputs/explainability/shap_bar.png",
            "outputs/explainability/shap_summary.png",
            "outputs/explainability/shap_waterfall.png",
        ],
        "note": "Prediction, recharge assessment, and explainability endpoints are available.",
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}


@app.post("/predict", tags=["prediction"])
async def predict(request: PredictionRequest):
    """Predict groundwater level using the saved trained model and metadata-driven feature order."""
    try:
        prediction_value = predict_groundwater_level(request.dict())
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": str(exc), "error_type": "missing_model_file"},
        ) from exc
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"status": "error", "message": str(exc), "error_type": "missing_features"},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"status": "error", "message": str(exc), "error_type": "invalid_input"},
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": str(exc), "error_type": "model_prediction_failed"},
        ) from exc
    except Exception as exc:  # pragma: no cover - broad safety net for unexpected issues.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": "Unexpected model prediction error.", "error_type": "unexpected_error"},
        ) from exc

    return {
        "status": "success",
        "predicted_groundwater_level": prediction_value,
        "model_name": get_model_name(),
        "feature_count": len(get_model_features()),
    }


@app.get("/recharge/summary", tags=["recharge"])
async def recharge_summary():
    """Return summary statistics for the rule-based artificial recharge assessment."""
    try:
        summary = get_recharge_summary()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": str(exc), "error_type": "recharge_results_missing"},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"status": "error", "message": str(exc), "error_type": "malformed_recharge_data"},
        ) from exc
    return {
        "status": "success",
        "assessment_type": "artificial recharge potential assessment",
        "total_stations": summary["total_stations"],
        "categories": summary["categories"],
        "average_recharge_score": summary["average_recharge_score"],
        "min_recharge_score": summary["min_recharge_score"],
        "max_recharge_score": summary["max_recharge_score"],
        "methodology_note": "This is a decision-support potential assessment derived from rule-based station conditions; it is not measured recharge.",
    }


@app.get("/recharge/stations", tags=["recharge"])
async def recharge_stations():
    """Return all station-level recharge potential results."""
    try:
        stations = get_recharge_stations()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": str(exc), "error_type": "recharge_results_missing"},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"status": "error", "message": str(exc), "error_type": "malformed_recharge_data"},
        ) from exc
    return {"status": "success", "stations": stations}


@app.get("/recharge/stations/{station_id}", tags=["recharge"])
async def recharge_station_detail(station_id: str):
    """Return a single station's recharge assessment details."""
    try:
        station = get_station_recharge(station_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": str(exc), "error_type": "recharge_results_missing"},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"status": "error", "message": str(exc), "error_type": "malformed_recharge_data"},
        ) from exc

    if station is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"status": "error", "message": f"Station '{station_id}' was not found in the recharge assessment results.", "error_type": "station_not_found"},
        )

    return {"status": "success", "station": station}


@app.get("/explainability/summary", tags=["explainability"])
async def explainability_summary():
    """Return a concise summary of the model explainability artifacts available in the project."""
    try:
        summary = get_explainability_summary()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": str(exc), "error_type": "explainability_artifact_missing"},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"status": "error", "message": str(exc), "error_type": "malformed_explainability_data"},
        ) from exc
    return {"status": "success", **summary}


@app.get("/explainability/feature-importance", tags=["explainability"])
async def explainability_feature_importance():
    """Serve the actual coefficient-based importance results generated by Notebook 11."""
    try:
        results = get_feature_importance_results()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": str(exc), "error_type": "feature_importance_missing"},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"status": "error", "message": str(exc), "error_type": "malformed_explainability_data"},
        ) from exc
    return {
        "status": "success",
        "model_name": "Linear Regression",
        "method": "coefficient_importance",
        "feature_count": len(results),
        "results": results,
        "interpretation_note": "Coefficient magnitude indicates model influence within the trained model; it is not proof of physical causation.",
    }


@app.get("/explainability/permutation-importance", tags=["explainability"])
async def explainability_permutation_importance():
    """Serve the actual permutation importance results generated by Notebook 11."""
    try:
        results = get_permutation_importance_results()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": str(exc), "error_type": "permutation_importance_missing"},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"status": "error", "message": str(exc), "error_type": "malformed_explainability_data"},
        ) from exc
    return {
        "status": "success",
        "model_name": "Linear Regression",
        "method": "permutation_importance",
        "feature_count": len(results),
        "results": results,
        "interpretation_note": "Permutation importance indicates the drop in model performance when a feature is shuffled; it reflects model behavior, not physical causation.",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
