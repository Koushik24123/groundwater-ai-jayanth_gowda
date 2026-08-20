"""FastAPI backend for the Groundwater Intelligence decision-support system.

Existing prediction, recharge, and explainability routes are preserved. New routes
build engineered features internally and return decision-support payloads.
"""
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.decision_service import (
    build_dashboard_overview,
    build_plain_explainability,
    build_recharge_guidance,
    build_spatial_stations,
    build_station_intelligence,
)
from backend.app.explainability_service import (
    get_explainability_summary,
    get_feature_importance_results,
    get_permutation_importance_results,
)
from backend.app.model_service import get_model_features, get_model_name, predict_groundwater_level
from backend.app.recharge_service import (
    get_recharge_stations,
    get_recharge_summary,
    get_station_recharge,
)
from backend.app.schemas import PredictionRequest, SimplePredictionRequest
from backend.app.station_service import (
    InsufficientHistoryError,
    StationLookupError,
    build_model_features,
    get_station_catalog,
    get_station_history,
    get_station_record,
    parse_request_timestamp,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUTS_DIR = PROJECT_ROOT / "outputs"

app = FastAPI(
    title="Groundwater Intelligence System API",
    version="0.5.0",
    description="Decision-support backend for groundwater condition, prediction, recharge assessment, and spatial review.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _http_error(status_code: int, message: str, error_type: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"status": "error", "message": message, "error_type": error_type},
    )


@app.get("/", tags=["info"])
async def root_info():
    """Return basic project and API information."""
    models_dir = PROJECT_ROOT / "models"
    model_file = models_dir / "best_model.pkl"

    return {
        "project": "Predictive Modeling of Ground Water Depletion and Artificial Recharge Potential",
        "application": "Groundwater Intelligence System",
        "phase": "Decision Support System",
        "api_version": "0.5.0",
        "models_dir": str(models_dir),
        "model_file": str(model_file),
        "model_exists": model_file.exists(),
        "model_name": get_model_name(),
        "feature_count": len(get_model_features()),
        "station_count": len(get_station_catalog()),
        "recharge_artifact": "outputs/recharge/artificial_recharge_assessment.csv",
        "explainability_artifacts": [
            "outputs/explainability/feature_importance.csv",
            "outputs/explainability/permutation_importance.csv",
            "outputs/explainability/shap_bar.png",
            "outputs/explainability/shap_summary.png",
            "outputs/explainability/shap_waterfall.png",
        ],
        "note": "The trained model is used as an engine behind station-based decision support.",
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}


@app.get("/stations", tags=["stations"])
async def list_stations():
    """Return monitoring stations with location, history range, and trend."""
    try:
        stations = get_station_catalog()
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "dataset_missing") from exc
    return {"status": "success", "stations": stations}


@app.get("/stations/{station_name}/history", tags=["stations"])
async def station_history(station_name: str, limit: int = Query(180, ge=20, le=500)):
    """Return recent groundwater observations for charts."""
    try:
        history = get_station_history(station_name, limit=limit)
        station = get_station_record(station_name)
    except StationLookupError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, str(exc), "station_not_found") from exc
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "dataset_missing") from exc
    return {"status": "success", "station": station["station"], "history": history}


@app.get("/stations/{station_name}", tags=["stations"])
async def station_detail(station_name: str):
    """Return catalog metadata for a single monitoring station."""
    try:
        station = get_station_record(station_name)
    except StationLookupError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, str(exc), "station_not_found") from exc
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "dataset_missing") from exc
    return {"status": "success", "station": station}


@app.post("/predict", tags=["prediction"])
async def predict(request: PredictionRequest):
    """Predict groundwater level using the saved trained model and metadata-driven feature order."""
    try:
        prediction_value = predict_groundwater_level(request.dict())
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "missing_model_file") from exc
    except KeyError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "missing_features") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "invalid_input") from exc
    except RuntimeError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "model_prediction_failed") from exc
    except Exception as exc:  # pragma: no cover
        raise _http_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Unexpected model prediction error.",
            "unexpected_error",
        ) from exc

    return {
        "status": "success",
        "predicted_groundwater_level": prediction_value,
        "model_name": get_model_name(),
        "feature_count": len(get_model_features()),
    }


def _simple_prediction_payload(station: str, date_value: str, time_value: str):
    timestamp = parse_request_timestamp(date_value, time_value)
    station_meta = get_station_record(station)
    features, provenance = build_model_features(station_meta["station"], timestamp)
    prediction_value = predict_groundwater_level(features)
    history = get_station_history(station_meta["station"], limit=180)
    return build_station_intelligence(station_meta, prediction_value, features, provenance, history)


@app.post("/predict/simple", tags=["prediction"])
async def predict_simple(request: SimplePredictionRequest):
    """Predict from station, date, and time. Engineered features are generated internally."""
    try:
        payload = _simple_prediction_payload(request.station, request.date, request.time)
    except StationLookupError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, str(exc), "station_not_found") from exc
    except InsufficientHistoryError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "insufficient_history") from exc
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "missing_artifact") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "invalid_input") from exc
    except Exception as exc:  # pragma: no cover
        raise _http_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Unexpected model prediction error.",
            "unexpected_error",
        ) from exc
    return {"status": "success", **payload}


@app.get("/predict/simple", tags=["prediction"])
async def predict_simple_get(
    station: str = Query(..., description="Monitoring station name."),
    date: Optional[str] = Query(None, description="YYYY-MM-DD. Defaults to the last observation date."),
    time: Optional[str] = Query(None, description="HH:MM. Defaults to the last observation time."),
):
    """GET convenience endpoint for dashboards. Omitting date/time uses the latest station record."""
    try:
        station_meta = get_station_record(station)
        last = station_meta["last_observation"]
        last_ts = parse_request_timestamp(last[:10], last[11:16] if len(last) >= 16 else "00:00")
        date_value = date or last_ts.strftime("%Y-%m-%d")
        time_value = time or last_ts.strftime("%H:%M")
        payload = _simple_prediction_payload(station_meta["station"], date_value, time_value)
    except StationLookupError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, str(exc), "station_not_found") from exc
    except InsufficientHistoryError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "insufficient_history") from exc
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "missing_artifact") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "invalid_input") from exc
    except Exception as exc:  # pragma: no cover
        raise _http_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Unexpected model prediction error.",
            "unexpected_error",
        ) from exc
    return {"status": "success", **payload}


@app.get("/dashboard/overview", tags=["dashboard"])
async def dashboard_overview():
    """Network-level condition, trend, and recharge counts for the dashboard."""
    try:
        overview = build_dashboard_overview()
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "missing_artifact") from exc
    return {"status": "success", **overview}


@app.get("/spatial/stations", tags=["spatial"])
async def spatial_stations():
    """Station markers with condition colour, trend, and recharge potential."""
    try:
        stations = build_spatial_stations()
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "missing_artifact") from exc
    return {"status": "success", "stations": stations}


@app.get("/recharge/summary", tags=["recharge"])
async def recharge_summary():
    """Return summary statistics for the rule-based artificial recharge assessment."""
    try:
        summary = get_recharge_summary()
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "recharge_results_missing") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "malformed_recharge_data") from exc
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
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "recharge_results_missing") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "malformed_recharge_data") from exc
    return {"status": "success", "stations": stations}


@app.get("/recharge/stations/{station_id}/guidance", tags=["recharge"])
async def recharge_station_guidance(station_id: str):
    """Return recharge category, reasons, and recommended actions for a station."""
    try:
        guidance = build_recharge_guidance(station_id)
    except StationLookupError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, str(exc), "station_not_found") from exc
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "recharge_results_missing") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "malformed_recharge_data") from exc

    if guidance is None:
        raise _http_error(
            status.HTTP_404_NOT_FOUND,
            f"Station '{station_id}' was not found in the recharge assessment results.",
            "station_not_found",
        )
    return {"status": "success", **guidance}


@app.get("/recharge/stations/{station_id}", tags=["recharge"])
async def recharge_station_detail(station_id: str):
    """Return a single station's recharge assessment details."""
    try:
        station = get_station_recharge(station_id)
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "recharge_results_missing") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "malformed_recharge_data") from exc

    if station is None:
        raise _http_error(
            status.HTTP_404_NOT_FOUND,
            f"Station '{station_id}' was not found in the recharge assessment results.",
            "station_not_found",
        )

    return {"status": "success", "station": station}


@app.get("/explainability/summary", tags=["explainability"])
async def explainability_summary():
    """Return a concise summary of the model explainability artifacts available in the project."""
    try:
        summary = get_explainability_summary()
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "explainability_artifact_missing") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "malformed_explainability_data") from exc
    summary["shap_image_urls"] = [
        f"/artifacts/explainability/{name}" for name in summary.get("shap_images_available", [])
    ]
    return {"status": "success", **summary}


@app.get("/explainability/plain-language", tags=["explainability"])
async def explainability_plain_language():
    """Grouped, non-technical explanation of what the trained model relies on."""
    try:
        payload = build_plain_explainability()
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "explainability_artifact_missing") from exc
    return {"status": "success", **payload}


@app.get("/explainability/feature-importance", tags=["explainability"])
async def explainability_feature_importance():
    """Serve the actual coefficient-based importance results generated by Notebook 11."""
    try:
        results = get_feature_importance_results()
    except FileNotFoundError as exc:
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "feature_importance_missing") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "malformed_explainability_data") from exc
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
        raise _http_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "permutation_importance_missing") from exc
    except ValueError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc), "malformed_explainability_data") from exc
    return {
        "status": "success",
        "model_name": "Linear Regression",
        "method": "permutation_importance",
        "feature_count": len(results),
        "results": results,
        "interpretation_note": "Permutation importance indicates the drop in model performance when a feature is shuffled; it reflects model behavior, not physical causation.",
    }


if OUTPUTS_DIR.exists():
    app.mount("/artifacts", StaticFiles(directory=str(OUTPUTS_DIR)), name="artifacts")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
