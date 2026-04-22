import math
import numpy as np

def _poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)

def _poisson_logpmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 0.0 if k == 0 else -1e10
    return -lam + k * math.log(lam) - sum(math.log(i) for i in range(1, k + 1))

def _minimize_lbfgs(func, x0, max_iter=300, lr=0.01):
    """Simple gradient descent fallback (no scipy needed)."""
    x = x0.copy()
    for _ in range(max_iter):
        grad = np.zeros_like(x)
        f0 = func(x)
        eps = 1e-5
        for i in range(len(x)):
            xp = x.copy(); xp[i] += eps
            grad[i] = (func(xp) - f0) / eps
        x -= lr * grad
    return x


class PoissonModel:
    """
    Dixon-Coles inspired Poisson model for match outcome prediction.
    Uses gradient descent MLE to estimate team attack/defense strengths.
    No scipy dependency — pure numpy + math.
    """

    def __init__(self):
        self.attack: dict[str, float] = {}
        self.defense: dict[str, float] = {}
        self.home_advantage: float = 1.3
        self.fitted = False
        self._teams: list[str] = []

    def fit(self, matches: list[dict]) -> None:
        if len(matches) < 10:
            return

        teams = sorted(set(
            [m["home_team"] for m in matches] + [m["away_team"] for m in matches]
        ))
        team_idx = {t: i for i, t in enumerate(teams)}
        n = len(teams)

        def neg_log_lik(params):
            ll = 0.0
            for m in matches:
                hi = team_idx[m["home_team"]]
                ai = team_idx[m["away_team"]]
                lam_h = math.exp(params[hi]) * math.exp(params[n + ai]) * math.exp(params[-1])
                lam_a = math.exp(params[ai]) * math.exp(params[n + hi])
                ll += _poisson_logpmf(int(m["home_goals"]), lam_h)
                ll += _poisson_logpmf(int(m["away_goals"]), lam_a)
            return -ll

        x0 = np.zeros(2 * n + 1)
        x0[-1] = math.log(1.3)
        params = _minimize_lbfgs(neg_log_lik, x0, max_iter=500, lr=0.005)

        for team in teams:
            i = team_idx[team]
            self.attack[team] = float(math.exp(params[i]))
            self.defense[team] = float(math.exp(params[n + i]))

        self.home_advantage = float(math.exp(params[-1]))
        self._teams = teams
        self.fitted = True

    def predict(self, home_team: str, away_team: str, max_goals: int = 8) -> dict:
        atk_h = self.attack.get(home_team, 1.0)
        def_h = self.defense.get(home_team, 1.0)
        atk_a = self.attack.get(away_team, 1.0)
        def_a = self.defense.get(away_team, 1.0)

        lam_h = atk_h * def_a * self.home_advantage
        lam_a = atk_a * def_h

        score_matrix = [
            [_poisson_pmf(i, lam_h) * _poisson_pmf(j, lam_a) for j in range(max_goals + 1)]
            for i in range(max_goals + 1)
        ]

        prob_home = sum(score_matrix[i][j] for i in range(max_goals + 1) for j in range(i))
        prob_draw = sum(score_matrix[i][i] for i in range(max_goals + 1))
        prob_away = sum(score_matrix[i][j] for i in range(max_goals + 1) for j in range(i + 1, max_goals + 1))

        total = prob_home + prob_draw + prob_away
        if total > 0:
            prob_home /= total
            prob_draw /= total
            prob_away /= total

        return {
            "prob_home": round(prob_home, 4),
            "prob_draw": round(prob_draw, 4),
            "prob_away": round(prob_away, 4),
            "model_odds_home": round(1 / prob_home, 2) if prob_home > 0 else 99,
            "model_odds_draw": round(1 / prob_draw, 2) if prob_draw > 0 else 99,
            "model_odds_away": round(1 / prob_away, 2) if prob_away > 0 else 99,
            "expected_goals_home": round(lam_h, 2),
            "expected_goals_away": round(lam_a, 2),
            "score_matrix": score_matrix,
        }

    def get_top_scores(self, home_team: str, away_team: str, top_n: int = 5) -> list[dict]:
        pred = self.predict(home_team, away_team)
        matrix = pred["score_matrix"]
        flat = [
            {"home": i, "away": j, "prob": round(matrix[i][j] * 100, 2)}
            for i in range(len(matrix))
            for j in range(len(matrix[i]))
        ]
        flat.sort(key=lambda x: x["prob"], reverse=True)
        return flat[:top_n]


_models: dict[str, PoissonModel] = {}

def get_model(league_code: str) -> PoissonModel:
    if league_code not in _models:
        _models[league_code] = PoissonModel()
    return _models[league_code]
