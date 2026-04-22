from pydantic_settings import BaseSettings

LEAGUES = {
    "PL":  {"name": "Premier League",   "country": "England",  "source": "football-data"},
    "PD":  {"name": "La Liga",          "country": "Spain",    "source": "football-data"},
    "CL":  {"name": "Champions League", "country": "Europe",   "source": "football-data"},
    "EL":  {"name": "Europa League",    "country": "Europe",   "source": "football-data"},
    "CO1": {"name": "Liga BetPlay",     "country": "Colombia", "source": "api-football", "api_football_id": 239},
}

ODDS_SPORT_KEYS = {
    "PL":  "soccer_epl",
    "PD":  "soccer_spain_la_liga",
    "CL":  "soccer_uefa_champs_league",
    "EL":  "soccer_uefa_europa_league",
    "CO1": "soccer_colombia_primera_a",
}

class Settings(BaseSettings):
    FOOTBALL_DATA_API_KEY: str = ""
    ODDS_API_KEY: str = ""
    API_FOOTBALL_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./sports_analytics.db"

    model_config = {"env_file": ".env"}

settings = Settings()
