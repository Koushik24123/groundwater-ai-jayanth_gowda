from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RECHARGE_RESULT_PATH = PROJECT_ROOT / "outputs" / "recharge" / "artificial_recharge_assessment.csv"

REQUIRED_COLUMNS = [
    "Station",
    "Latitude",
    "Longitude",
    "Observations",
    "Avg_Depth",
    "Min_Depth",
    "Max_Depth",
    "Depth_Std",
    "Depth_Range",
    "Avg_RollingStd4",
    "Avg_RL_MSL",
    "Depth_Trend_Slope",
    "Depth_Score",
    "Fluctuation_Combined",
    "Trend_Score",
    "RL_MSL_Score",
    "Recharge_Score",
    "Recharge_Category",
]


@lru_cache(maxsize=1)
def load_recharge_data() -> pd.DataFrame:
    """Load the saved station-level artificial recharge assessment results."""
    if not RECHARGE_RESULT_PATH.exists():
        raise FileNotFoundError(
            f"Recharge assessment results not found at {RECHARGE_RESULT_PATH}. "
            "Run the notebook logic or generate the CSV artifact before using the recharge API."
        )

    df = pd.read_csv(RECHARGE_RESULT_PATH)
    missing = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(
            "Recharge assessment file is missing required columns: " + ", ".join(missing)
        )

    return df.copy()


def _clean_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    return value


def _clean_record(record: Dict[str, Any]) -> Dict[str, Any]:
    return {key: _clean_value(value) for key, value in record.items()}


def get_recharge_summary() -> Dict[str, Any]:
    """Return concise summary counts and score statistics for the recharge assessment."""
    df = load_recharge_data()
    categories = df["Recharge_Category"].value_counts().sort_index().to_dict()

    return {
        "total_stations": int(len(df)),
        "categories": {str(key): int(value) for key, value in categories.items()},
        "average_recharge_score": float(df["Recharge_Score"].mean()),
        "min_recharge_score": float(df["Recharge_Score"].min()),
        "max_recharge_score": float(df["Recharge_Score"].max()),
    }


def get_recharge_stations() -> List[Dict[str, Any]]:
    """Return the station-level recharge potential records for a frontend or analysis client."""
    df = load_recharge_data()
    selected = df[
        [
            "Station",
            "Latitude",
            "Longitude",
            "Observations",
            "Avg_Depth",
            "Depth_Std",
            "Depth_Range",
            "Depth_Trend_Slope",
            "Recharge_Score",
            "Recharge_Category",
        ]
    ].copy()
    return [_clean_record(record) for record in selected.to_dict(orient="records")]


def get_station_recharge(station_id: str) -> Optional[Dict[str, Any]]:
    """Return a station record for a single station ID, or None if it does not exist."""
    df = load_recharge_data()
    normalized = station_id.strip()
    match = df[df["Station"].str.lower() == normalized.lower()]
    if match.empty:
        return None
    return _clean_record(match.iloc[0].to_dict())
