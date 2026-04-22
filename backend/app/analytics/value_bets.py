MIN_VALUE_THRESHOLD = 0.05  # 5% edge minimum

def calculate_value(model_prob: float, bookmaker_odds: float) -> float:
    """
    Value = (model_probability * bookmaker_odds) - 1
    Positive = value bet, model thinks event is more likely than bookmaker implies.
    """
    if bookmaker_odds <= 1.0 or model_prob <= 0:
        return 0.0
    return round((model_prob * bookmaker_odds) - 1, 4)

def implied_probability(odds: float) -> float:
    """Convert decimal odds to implied probability."""
    if odds <= 1.0:
        return 1.0
    return round(1 / odds, 4)

def overround(odds_home: float, odds_draw: float, odds_away: float) -> float:
    """Bookmaker margin. >1 means bookmaker has an edge."""
    return round(
        implied_probability(odds_home) + implied_probability(odds_draw) + implied_probability(odds_away),
        4
    )

def analyze_match_odds(
    prob_home: float,
    prob_draw: float,
    prob_away: float,
    bookmaker_odds: list[dict],
) -> list[dict]:
    """
    For each bookmaker snapshot, compute value for each outcome.
    Returns enriched list with value flags.
    """
    results = []
    for bk in bookmaker_odds:
        oh = bk.get("odds_home", 0)
        od = bk.get("odds_draw", 0)
        oa = bk.get("odds_away", 0)
        v_home = calculate_value(prob_home, oh)
        v_draw = calculate_value(prob_draw, od)
        v_away = calculate_value(prob_away, oa)
        results.append({
            **bk,
            "overround": overround(oh, od, oa),
            "value_home": v_home,
            "value_draw": v_draw,
            "value_away": v_away,
            "is_value_home": v_home >= MIN_VALUE_THRESHOLD,
            "is_value_draw": v_draw >= MIN_VALUE_THRESHOLD,
            "is_value_away": v_away >= MIN_VALUE_THRESHOLD,
        })
    return results
