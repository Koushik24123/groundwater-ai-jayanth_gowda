from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    """Input schema for groundwater prediction.

    Field order matches the trained model metadata exactly.
    """

    Latitude: float = Field(..., description="Latitude coordinate of the groundwater station.")
    Longitude: float = Field(..., description="Longitude coordinate of the groundwater station.")
    RL_MSL: float = Field(..., description="Reduced level above mean sea level.")
    Year: int = Field(..., description="Year value extracted from the time stamp.")
    Month: int = Field(..., description="Month value extracted from the time stamp.")
    Day: int = Field(..., description="Day value extracted from the time stamp.")
    Hour: int = Field(..., description="Hour value extracted from the time stamp.")
    DayOfWeek: int = Field(..., description="Day of week encoded from the timestamp.")
    WeekOfYear: int = Field(..., description="Week of year extracted from the timestamp.")
    Quarter: int = Field(..., description="Quarter of the year.")
    IsWeekend: int = Field(..., description="Weekend flag (0 = weekday, 1 = weekend).")
    Lag_1: float = Field(..., description="Lagged groundwater level at 1 time step.")
    Lag_4: float = Field(..., description="Lagged groundwater level at 4 time steps.")
    Lag_28: float = Field(..., description="Lagged groundwater level at 28 time steps.")
    RollingMean_4: float = Field(..., description="Rolling mean of groundwater level over 4 periods.")
    RollingStd_4: float = Field(..., description="Rolling standard deviation over 4 periods.")
    Hour_sin: float = Field(..., description="Sinusoidal encoding of the hour.")
    Hour_cos: float = Field(..., description="Cosine encoding of the hour.")
    Month_sin: float = Field(..., description="Sinusoidal encoding of the month.")
    Month_cos: float = Field(..., description="Cosine encoding of the month.")
    Station_ID: int = Field(..., description="Numeric station identifier.")

    class Config:
        extra = "forbid"
