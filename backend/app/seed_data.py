import random
import math
from datetime import datetime, timedelta

HOME_ADVANTAGE = 1.25

# Realistic team ratings based on 2024/25 season performance
# attack/defense are relative to league average (1.0)
LEAGUE_TEAMS = {
    "PL": [
        {"name": "Manchester City",    "attack": 1.90, "defense": 0.62},
        {"name": "Arsenal",            "attack": 1.72, "defense": 0.65},
        {"name": "Liverpool",          "attack": 1.78, "defense": 0.68},
        {"name": "Aston Villa",        "attack": 1.52, "defense": 0.74},
        {"name": "Chelsea",            "attack": 1.48, "defense": 0.79},
        {"name": "Tottenham",          "attack": 1.55, "defense": 0.83},
        {"name": "Newcastle United",   "attack": 1.42, "defense": 0.80},
        {"name": "Manchester United",  "attack": 1.30, "defense": 0.92},
        {"name": "West Ham United",    "attack": 1.28, "defense": 0.90},
        {"name": "Brighton",           "attack": 1.35, "defense": 0.84},
        {"name": "Wolves",             "attack": 1.18, "defense": 0.96},
        {"name": "Fulham",             "attack": 1.24, "defense": 0.89},
        {"name": "Bournemouth",        "attack": 1.22, "defense": 0.94},
        {"name": "Crystal Palace",     "attack": 1.12, "defense": 0.96},
        {"name": "Brentford",          "attack": 1.26, "defense": 0.91},
        {"name": "Everton",            "attack": 1.08, "defense": 1.02},
        {"name": "Nottingham Forest",  "attack": 1.15, "defense": 0.94},
        {"name": "Ipswich Town",       "attack": 1.00, "defense": 1.06},
        {"name": "Leicester City",     "attack": 1.04, "defense": 1.08},
        {"name": "Southampton",        "attack": 0.92, "defense": 1.18},
    ],
    "PD": [
        {"name": "Real Madrid",        "attack": 2.05, "defense": 0.58},
        {"name": "Barcelona",          "attack": 1.88, "defense": 0.62},
        {"name": "Atletico Madrid",    "attack": 1.56, "defense": 0.63},
        {"name": "Girona",             "attack": 1.48, "defense": 0.73},
        {"name": "Athletic Club",      "attack": 1.42, "defense": 0.78},
        {"name": "Real Sociedad",      "attack": 1.36, "defense": 0.82},
        {"name": "Real Betis",         "attack": 1.30, "defense": 0.84},
        {"name": "Villarreal",         "attack": 1.32, "defense": 0.85},
        {"name": "Valencia",           "attack": 1.18, "defense": 0.92},
        {"name": "Las Palmas",         "attack": 1.14, "defense": 0.96},
        {"name": "Getafe",             "attack": 1.06, "defense": 0.90},
        {"name": "Osasuna",            "attack": 1.10, "defense": 0.92},
        {"name": "Alaves",             "attack": 0.98, "defense": 1.02},
        {"name": "Rayo Vallecano",     "attack": 1.16, "defense": 0.98},
        {"name": "Sevilla",            "attack": 1.20, "defense": 0.92},
        {"name": "Mallorca",           "attack": 0.98, "defense": 0.94},
        {"name": "Celta Vigo",         "attack": 1.14, "defense": 1.02},
        {"name": "Leganes",            "attack": 0.94, "defense": 1.06},
        {"name": "Espanyol",           "attack": 0.98, "defense": 1.08},
        {"name": "Valladolid",         "attack": 0.88, "defense": 1.14},
    ],
    "CL": [
        {"name": "Real Madrid",            "attack": 2.10, "defense": 0.58},
        {"name": "Manchester City",        "attack": 1.95, "defense": 0.60},
        {"name": "Bayern Munich",          "attack": 1.90, "defense": 0.62},
        {"name": "Arsenal",                "attack": 1.72, "defense": 0.65},
        {"name": "Barcelona",              "attack": 1.85, "defense": 0.63},
        {"name": "Paris Saint-Germain",    "attack": 1.78, "defense": 0.68},
        {"name": "Atletico Madrid",        "attack": 1.55, "defense": 0.65},
        {"name": "Liverpool",              "attack": 1.80, "defense": 0.67},
        {"name": "Bayer Leverkusen",       "attack": 1.68, "defense": 0.70},
        {"name": "Inter Milan",            "attack": 1.62, "defense": 0.68},
        {"name": "Borussia Dortmund",      "attack": 1.55, "defense": 0.75},
        {"name": "PSV Eindhoven",          "attack": 1.50, "defense": 0.78},
        {"name": "Real Sociedad",          "attack": 1.35, "defense": 0.82},
        {"name": "Benfica",                "attack": 1.42, "defense": 0.80},
        {"name": "Celtic",                 "attack": 1.20, "defense": 0.92},
        {"name": "Porto",                  "attack": 1.38, "defense": 0.82},
    ],
    "EL": [
        {"name": "Atalanta",               "attack": 1.72, "defense": 0.68},
        {"name": "Bayer Leverkusen",       "attack": 1.68, "defense": 0.70},
        {"name": "Roma",                   "attack": 1.48, "defense": 0.78},
        {"name": "Ajax",                   "attack": 1.52, "defense": 0.80},
        {"name": "Porto",                  "attack": 1.40, "defense": 0.82},
        {"name": "Marseille",              "attack": 1.38, "defense": 0.84},
        {"name": "Villarreal",             "attack": 1.32, "defense": 0.85},
        {"name": "Sporting CP",            "attack": 1.36, "defense": 0.80},
        {"name": "Slavia Prague",          "attack": 1.22, "defense": 0.90},
        {"name": "Rangers",                "attack": 1.18, "defense": 0.94},
        {"name": "West Ham United",        "attack": 1.28, "defense": 0.90},
        {"name": "Fiorentina",             "attack": 1.30, "defense": 0.88},
        {"name": "Sevilla",                "attack": 1.20, "defense": 0.92},
        {"name": "Real Betis",             "attack": 1.28, "defense": 0.86},
        {"name": "Braga",                  "attack": 1.24, "defense": 0.88},
        {"name": "Liverpool",              "attack": 1.78, "defense": 0.68},
    ],
    "CO1": [
        {"name": "Atletico Nacional",      "attack": 1.65, "defense": 0.70},
        {"name": "Millonarios",            "attack": 1.58, "defense": 0.72},
        {"name": "America de Cali",        "attack": 1.52, "defense": 0.75},
        {"name": "Junior",                 "attack": 1.45, "defense": 0.78},
        {"name": "Deportivo Cali",         "attack": 1.35, "defense": 0.85},
        {"name": "Once Caldas",            "attack": 1.20, "defense": 0.92},
        {"name": "Independiente Medellin", "attack": 1.38, "defense": 0.82},
        {"name": "Deportes Tolima",        "attack": 1.30, "defense": 0.88},
        {"name": "Santa Fe",               "attack": 1.25, "defense": 0.90},
        {"name": "Envigado",               "attack": 1.05, "defense": 1.02},
        {"name": "La Equidad",             "attack": 1.08, "defense": 0.98},
        {"name": "Aguilas Doradas",        "attack": 1.10, "defense": 0.96},
        {"name": "Deportivo Pasto",        "attack": 1.02, "defense": 1.04},
        {"name": "Deportivo Pereira",      "attack": 1.12, "defense": 0.95},
        {"name": "Alianza Petrolera",      "attack": 0.98, "defense": 1.06},
        {"name": "Union Magdalena",        "attack": 0.95, "defense": 1.08},
        {"name": "Jaguares",               "attack": 0.90, "defense": 1.10},
        {"name": "Boyaca Chico",           "attack": 0.88, "defense": 1.12},
        {"name": "Fortaleza",              "attack": 0.92, "defense": 1.10},
        {"name": "Deportivo Rionegro",     "attack": 0.95, "defense": 1.08},
    ],
}


def _poisson_sample(lam: float) -> int:
    if lam <= 0:
        return 0
    L = math.exp(-lam)
    k, p = 0, 1.0
    while p > L:
        k += 1
        p *= random.random()
    return k - 1


def generate_finished_matches(league_code: str, n: int = 90, seed: int = 42) -> list[dict]:
    rng = random.Random(seed)
    teams = LEAGUE_TEAMS[league_code]
    matches = []
    team_list = teams.copy()
    rounds = (n // (len(team_list) // 2)) + 2
    for _ in range(rounds):
        rng.shuffle(team_list)
        for i in range(0, len(team_list) - 1, 2):
            if len(matches) >= n:
                break
            home = team_list[i]
            away = team_list[i + 1]
            lam_h = home["attack"] * away["defense"] * HOME_ADVANTAGE
            lam_a = away["attack"] * home["defense"]
            # Use rng for reproducibility
            random.seed(rng.randint(0, 999999))
            hg = _poisson_sample(lam_h)
            ag = _poisson_sample(lam_a)
            matches.append({
                "home_team": home["name"],
                "away_team": away["name"],
                "home_goals": hg,
                "away_goals": ag,
            })
    return matches[:n]


def generate_upcoming_fixtures(league_code: str, n: int = 12, seed: int = 99) -> list[dict]:
    rng = random.Random(seed)
    teams = LEAGUE_TEAMS[league_code].copy()
    rng.shuffle(teams)
    fixtures = []
    now = datetime.utcnow()
    day_offset = 2
    for i in range(0, len(teams) - 1, 2):
        if len(fixtures) >= n:
            break
        home = teams[i]
        away = teams[i + 1]
        fixtures.append({
            "id": abs(hash(f"{league_code}-{home['name']}-{away['name']}")),
            "date": (now + timedelta(days=day_offset)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": "SCHEDULED",
            "home_team": home["name"],
            "away_team": away["name"],
            "home_goals": None,
            "away_goals": None,
            "league": league_code,
        })
        day_offset += 3
    return fixtures


def get_league_teams(league_code: str) -> list[str]:
    return [t["name"] for t in LEAGUE_TEAMS.get(league_code, [])]


def get_all_league_codes() -> list[str]:
    return list(LEAGUE_TEAMS.keys())
