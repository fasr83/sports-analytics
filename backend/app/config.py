from pydantic_settings import BaseSettings

# All leagues use API-Football v3 (api-sports.io)
# season = year the season started (2025 = 2025/26 for European leagues)
LEAGUES = {
    # ── Europa ──────────────────────────────────────────────────────────────
    "PL":    {"name": "Premier League",      "country": "England",      "api_football_id": 39,  "season": 2025, "group": "Europa"},
    "PD":    {"name": "La Liga",             "country": "Spain",        "api_football_id": 140, "season": 2025, "group": "Europa"},
    "BL1":   {"name": "Bundesliga",          "country": "Germany",      "api_football_id": 78,  "season": 2025, "group": "Europa"},
    "SA":    {"name": "Serie A",             "country": "Italy",        "api_football_id": 135, "season": 2025, "group": "Europa"},
    "FL1":   {"name": "Ligue 1",             "country": "France",       "api_football_id": 61,  "season": 2025, "group": "Europa"},
    "ERL":   {"name": "Eredivisie",          "country": "Netherlands",  "api_football_id": 88,  "season": 2025, "group": "Europa"},
    "PRL":   {"name": "Liga Portugal",       "country": "Portugal",     "api_football_id": 94,  "season": 2025, "group": "Europa"},
    "SUP":   {"name": "Süper Lig",           "country": "Turkey",       "api_football_id": 203, "season": 2025, "group": "Europa"},
    # ── Internacional ────────────────────────────────────────────────────────
    "CL":    {"name": "Champions League",    "country": "Europe",       "api_football_id": 2,   "season": 2025, "group": "Internacional"},
    "EL":    {"name": "Europa League",       "country": "Europe",       "api_football_id": 3,   "season": 2025, "group": "Internacional"},
    "LIB":   {"name": "Copa Libertadores",   "country": "Sudamérica",   "api_football_id": 13,  "season": 2025, "group": "Internacional"},
    "SUD":   {"name": "Copa Sudamericana",   "country": "Sudamérica",   "api_football_id": 11,  "season": 2025, "group": "Internacional"},
    # ── América ──────────────────────────────────────────────────────────────
    "CO1":   {"name": "Liga BetPlay",        "country": "Colombia",     "api_football_id": 239, "season": 2025, "group": "América"},
    "MLS":   {"name": "MLS",                 "country": "USA",          "api_football_id": 253, "season": 2025, "group": "América"},
    "LMX":   {"name": "Liga MX",             "country": "México",       "api_football_id": 262, "season": 2025, "group": "América"},
    "BRA":   {"name": "Brasileirao",         "country": "Brasil",       "api_football_id": 71,  "season": 2025, "group": "América"},
    "ARG":   {"name": "Argentine Primera",   "country": "Argentina",    "api_football_id": 128, "season": 2025, "group": "América"},
    # ── Mundial ──────────────────────────────────────────────────────────────
    "WCQC":  {"name": "Clasif. CONMEBOL",    "country": "Sudamérica",   "api_football_id": 31,  "season": 2026, "group": "Mundial"},
    "WCQU":  {"name": "Clasif. UEFA",        "country": "Europa",       "api_football_id": 32,  "season": 2026, "group": "Mundial"},
    # ── Otros ────────────────────────────────────────────────────────────────
    "SPL":   {"name": "Saudi Pro League",    "country": "Arabia S.",    "api_football_id": 307, "season": 2024, "group": "Otros"},
}

ODDS_SPORT_KEYS = {
    "PL":   "soccer_epl",
    "PD":   "soccer_spain_la_liga",
    "BL1":  "soccer_germany_bundesliga",
    "SA":   "soccer_italy_serie_a",
    "FL1":  "soccer_france_ligue_1",
    "CL":   "soccer_uefa_champs_league",
    "EL":   "soccer_uefa_europa_league",
    "CO1":  "soccer_colombia_primera_a",
    "MLS":  "soccer_usa_mls",
    "LMX":  "soccer_mexico_ligamx",
    "BRA":  "soccer_brazil_campeonato",
    "ARG":  "soccer_argentina_primera_division",
    "ERL":  "soccer_netherlands_eredivisie",
    "PRL":  "soccer_portugal_primeira_liga",
}


class Settings(BaseSettings):
    FOOTBALL_DATA_API_KEY: str = ""
    ODDS_API_KEY: str = ""
    API_FOOTBALL_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./sports_analytics.db"
    model_config = {"env_file": ".env"}


settings = Settings()
