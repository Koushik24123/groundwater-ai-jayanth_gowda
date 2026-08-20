"""Station catalog, history, and feature construction from the saved project dataset.

Engineered model inputs (lags, rolling statistics, cyclical encodings) are built here
so the frontend never asks users for those fields.
"""
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FEATURE_DATA_PATH = PROJECT_ROOT / "data" / "processed" / "groundwater_feature_engineered.csv"

TARGET_COL = "Groundwater Level Telemetry 6 Hourly (meter)"
TIME_COL = "Data Acquisition Time"

FEATURE_COLUMNS = [
    "Latitude",
    "Longitude",
    "RL_MSL",
    "Year",
    "Month",
    "Day",
    "Hour",
    "DayOfWeek",
    "WeekOfYear",
    "Quarter",
    "IsWeekend",
    "Lag_1",
    "Lag_4",
    "Lag_28",
    "RollingMean_4",
    "RollingStd_4",
    "Hour_sin",
    "Hour_cos",
    "Month_sin",
    "Month_cos",
    "Station_ID",
]


class StationLookupError(ValueError):
    """Raised when a station name cannot be resolved."""


class InsufficientHistoryError(ValueError):
    """Raised when a station does not have enough prior observations for lags."""


def _clean(value: Any) -> Any:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    return value


@lru_cache(maxsize=1)
def load_feature_dataset() -> pd.DataFrame:
    if not FEATURE_DATA_PATH.exists():
        raise FileNotFoundError(f"Feature-engineered dataset not found: {FEATURE_DATA_PATH}")

    df = pd.read_csv(FEATURE_DATA_PATH, parse_dates=[TIME_COL])
    df = df.dropna(subset=["Station", TIME_COL, TARGET_COL]).copy()
    df = df.sort_values(["Station", TIME_COL]).reset_index(drop=True)
    return df


def _normalize_station_name(name: str) -> str:
    return " ".join(str(name).strip().split()).lower()


def resolve_station_name(station: str) -> str:
    df = load_feature_dataset()
    wanted = _normalize_station_name(station)
    names = df["Station"].dropna().unique().tolist()
    for name in names:
        if _normalize_station_name(name) == wanted:
            return str(name)
    raise StationLookupError(f"Station '{station}' was not found in the project dataset.")


def get_station_frame(station: str) -> pd.DataFrame:
    canonical = resolve_station_name(station)
    df = load_feature_dataset()
    return df[df["Station"] == canonical].sort_values(TIME_COL).reset_index(drop=True)


def _trend_label(change: float) -> Dict[str, Any]:
    if change <= -0.75:
        return {
            "label": "Declining",
            "direction": "down",
            "interpretation": "Recent groundwater levels are lower than the previous period, which indicates declining conditions at this station.",
        }
    if change >= 0.75:
        return {
            "label": "Recovering",
            "direction": "up",
            "interpretation": "Recent groundwater levels are higher than the previous period, which indicates some recovery at this station.",
        }
    return {
        "label": "Stable",
        "direction": "steady",
        "interpretation": "Recent groundwater levels are close to the previous period, so the short-term trend is relatively stable.",
    }


def compute_series_trend(levels: pd.Series) -> Dict[str, Any]:
    values = pd.to_numeric(levels, errors="coerce").dropna()
    if len(values) < 16:
        return {
            "label": "Insufficient history",
            "direction": "unknown",
            "recent_mean": None,
            "previous_mean": None,
            "change": None,
            "interpretation": "Not enough observations are available to describe a reliable recent trend.",
        }

    window = min(120, max(16, len(values) // 3))
    recent = values.iloc[-window:]
    previous = values.iloc[-2 * window : -window]
    recent_mean = float(recent.mean())
    previous_mean = float(previous.mean())
    change = recent_mean - previous_mean
    payload = _trend_label(change)
    payload.update(
        {
            "recent_mean": recent_mean,
            "previous_mean": previous_mean,
            "change": change,
            "window_observations": int(window),
        }
    )
    return payload


@lru_cache(maxsize=1)
def get_station_catalog() -> List[Dict[str, Any]]:
    df = load_feature_dataset()
    catalog: List[Dict[str, Any]] = []

    for station, part in df.groupby("Station", sort=True):
        part = part.sort_values(TIME_COL)
        levels = part[TARGET_COL]
        trend = compute_series_trend(levels)
        catalog.append(
            {
                "station": str(station),
                "station_id": int(part["Station_ID"].iloc[0]),
                "latitude": float(part["Latitude"].iloc[0]),
                "longitude": float(part["Longitude"].iloc[0]),
                "rl_msl": float(part["RL_MSL"].iloc[0]),
                "observations": int(len(part)),
                "first_observation": part[TIME_COL].iloc[0].isoformat(),
                "last_observation": part[TIME_COL].iloc[-1].isoformat(),
                "avg_level": float(levels.mean()),
                "min_level": float(levels.min()),
                "max_level": float(levels.max()),
                "latest_level": float(levels.iloc[-1]),
                "trend": trend,
            }
        )

    return catalog


def get_station_record(station: str) -> Dict[str, Any]:
    canonical = resolve_station_name(station)
    for record in get_station_catalog():
        if record["station"] == canonical:
            return record
    raise StationLookupError(f"Station '{station}' was not found in the project dataset.")


def get_station_history(station: str, limit: int = 180) -> List[Dict[str, Any]]:
    part = get_station_frame(station)
    if limit and len(part) > limit:
        # Keep a readable trend: one point per day from the tail, then cap.
        daily = (
            part.set_index(TIME_COL)[TARGET_COL]
            .resample("D")
            .mean()
            .dropna()
            .tail(limit)
        )
        return [
            {"timestamp": index.isoformat(), "level": float(value)}
            for index, value in daily.items()
        ]

    return [
        {"timestamp": row[TIME_COL].isoformat(), "level": float(row[TARGET_COL])}
        for _, row in part.tail(limit).iterrows()
    ]


def parse_request_timestamp(date_value: str, time_value: Optional[str] = None) -> pd.Timestamp:
    date_text = str(date_value).strip()
    time_text = (time_value or "00:00").strip()
    if len(time_text) == 5:
        time_text = f"{time_text}:00"
    try:
        timestamp = pd.to_datetime(f"{date_text} {time_text}")
    except (ValueError, TypeError) as exc:
        raise ValueError("Date and time must form a valid timestamp.") from exc
    if pd.isna(timestamp):
        raise ValueError("Date and time must form a valid timestamp.")
    return pd.Timestamp(timestamp)


def _temporal_features(timestamp: pd.Timestamp) -> Dict[str, float]:
    hour = int(timestamp.hour)
    month = int(timestamp.month)
    day_of_week = int(timestamp.dayofweek)
    iso = timestamp.isocalendar()
    week_of_year = int(getattr(iso, "week", iso[1]))

    return {
        "Year": int(timestamp.year),
        "Month": month,
        "Day": int(timestamp.day),
        "Hour": hour,
        "DayOfWeek": day_of_week,
        "WeekOfYear": week_of_year,
        "Quarter": int((month - 1) // 3 + 1),
        "IsWeekend": int(day_of_week >= 5),
        "Hour_sin": float(np.sin(2 * np.pi * hour / 24)),
        "Hour_cos": float(np.cos(2 * np.pi * hour / 24)),
        "Month_sin": float(np.sin(2 * np.pi * (month - 1) / 12)),
        "Month_cos": float(np.cos(2 * np.pi * (month - 1) / 12)),
    }


def build_model_features(station: str, timestamp: pd.Timestamp) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """Return the 21-feature model payload plus provenance metadata."""
    part = get_station_frame(station)
    canonical = resolve_station_name(station)
    meta = get_station_record(canonical)

    exact = part[part[TIME_COL] == timestamp]
    observed_level = None
    source = "constructed_from_history"
    extrapolated = bool(timestamp > part[TIME_COL].iloc[-1])

    if not exact.empty:
        row = exact.iloc[-1]
        features = {name: float(row[name]) for name in FEATURE_COLUMNS}
        observed_level = float(row[TARGET_COL])
        source = "historical_row"
        return features, {
            "station": canonical,
            "timestamp": timestamp.isoformat(),
            "observed_level": observed_level,
            "feature_source": source,
            "is_extrapolated": False,
            "last_observation": meta["last_observation"],
        }

    prior = part[part[TIME_COL] < timestamp]
    if len(prior) < 28:
        first = part[TIME_COL].iloc[0].strftime("%Y-%m-%d")
        last = part[TIME_COL].iloc[-1].strftime("%Y-%m-%d")
        raise InsufficientHistoryError(
            f"Station '{canonical}' needs at least 28 earlier observations. "
            f"Available records run from {first} to {last}."
        )

    lag_source = prior[TARGET_COL]
    last4 = lag_source.iloc[-4:]
    features = {
        "Latitude": float(meta["latitude"]),
        "Longitude": float(meta["longitude"]),
        "RL_MSL": float(meta["rl_msl"]),
        "Lag_1": float(lag_source.iloc[-1]),
        "Lag_4": float(lag_source.iloc[-4]),
        "Lag_28": float(lag_source.iloc[-28]),
        "RollingMean_4": float(last4.mean()),
        "RollingStd_4": float(last4.std(ddof=1)) if len(last4) > 1 else 0.0,
        "Station_ID": float(meta["station_id"]),
    }
    features.update(_temporal_features(timestamp))

    return features, {
        "station": canonical,
        "timestamp": timestamp.isoformat(),
        "observed_level": observed_level,
        "feature_source": source,
        "is_extrapolated": extrapolated,
        "last_observation": meta["last_observation"],
        "history_points_used": int(len(prior)),
    }
