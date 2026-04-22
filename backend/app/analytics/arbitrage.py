def find_arbitrage(odds_by_bookmaker: list[dict]) -> dict | None:
    """
    Find arbitrage opportunity across bookmakers.
    Looks for best odds for each outcome and checks if sum of 1/odds < 1.
    """
    if not odds_by_bookmaker:
        return None

    best_home = max(odds_by_bookmaker, key=lambda x: x.get("odds_home", 0), default=None)
    best_draw = max(odds_by_bookmaker, key=lambda x: x.get("odds_draw", 0), default=None)
    best_away = max(odds_by_bookmaker, key=lambda x: x.get("odds_away", 0), default=None)

    if not all([best_home, best_draw, best_away]):
        return None

    oh = best_home["odds_home"]
    od = best_draw["odds_draw"]
    oa = best_away["odds_away"]

    if oh <= 1 or od <= 1 or oa <= 1:
        return None

    implied_sum = (1 / oh) + (1 / od) + (1 / oa)
    profit_pct = round((1 - implied_sum) / implied_sum * 100, 2)

    if implied_sum < 1.0:
        stake = 1000  # reference stake
        return {
            "is_arb": True,
            "profit_pct": profit_pct,
            "implied_sum": round(implied_sum, 4),
            "best_home": {"bookmaker": best_home["bookmaker"], "odds": oh, "stake": round(stake / oh / implied_sum * implied_sum, 2)},
            "best_draw": {"bookmaker": best_draw["bookmaker"], "odds": od, "stake": round(stake / od / implied_sum * implied_sum, 2)},
            "best_away": {"bookmaker": best_away["bookmaker"], "odds": oa, "stake": round(stake / oa / implied_sum * implied_sum, 2)},
        }
    return {"is_arb": False, "implied_sum": round(implied_sum, 4), "profit_pct": profit_pct}
