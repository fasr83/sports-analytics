from pydantic_settings import BaseSettings

# All leagues use API-Football v3 (api-sports.io)
# season = year the season started (2025 = 2025/26)
LEAGUES = {
    "PL":  {"name": "Premier League",   "country": "England",  "api_football_id": 39,  "season": 2025},
    "PD":  {"name": "La Liga",          "country": "Spain",    "api_football_id": 140, "season": 2025},
    "BL1": {"name": "Bundesliga",       "country": "Germany",  "api_football_id": 78,  "season": 2025},
    "SA":  {"name": "Serie A",          "country": "Italy",    "api_football_id": 135, "season": 2025},
    "FL1": {"name": "Ligue 1",          "country": "France",   "api_football_id": 61,  "season": 2025},
    "CL":  {"name": "Champions League", "country": "Europe",   "api_football_id": 2,   "season": 2025},
    "EL":  {"name": "Europa League",    "country": "Europe",   "api_football_id": 3,   "season": 2025},
    "CO1": {"name": "Liga BetPlay",     "country": "Colombia", "api_football_id": 239, "season": 2025},
}

ODDS_SPORT_KEYS = {
    "PL":  "soccer_epl",
    "PD":  "soccer_spain_la_liga",
    "BL1": "soccer_germany_bundesliga",
    "SA":  "soccer_italy_serie_a",
    "FL1": "soccer_france_ligue_1",
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
