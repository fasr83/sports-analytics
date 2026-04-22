import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function MatchCard({ match, leagueCode, showPrediction = false }) {
  const date = match.date ? format(parseISO(match.date), "d MMM · HH:mm", { locale: es }) : '?'
  const prob = match.model_prediction
  const hasResult = match.home_goals != null

  const topEdge = match.value_bets?.reduce((max, vb) => Math.max(max, vb.edge_pct ?? 0), 0) ?? 0

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      match.has_value
        ? 'bg-emerald-950/20 border-emerald-500/25 hover:border-emerald-400/40'
        : 'bg-gray-900/60 border-gray-800/60 hover:border-gray-700/60'
    }`}>
      {match.has_value && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/15 px-4 py-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-400 tracking-wide">VALUE BET</span>
          {topEdge > 0 && (
            <span className="text-xs font-bold text-emerald-300">+{topEdge.toFixed(1)}% edge</span>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="text-[11px] text-gray-600 mb-3 font-medium uppercase tracking-wider">{date}</div>

        <div className="flex items-center gap-3">
          <div className="flex-1 text-right">
            <span className="font-semibold text-sm text-gray-100">{match.home_team}</span>
          </div>

          <div className="shrink-0 text-center min-w-[52px]">
            {hasResult ? (
              <span className="text-white font-bold text-xl tabular-nums">
                {match.home_goals} <span className="text-gray-600">—</span> {match.away_goals}
              </span>
            ) : (
              <span className="text-xs text-gray-600 font-medium bg-gray-800/80 px-2 py-1 rounded">vs</span>
            )}
          </div>

          <div className="flex-1 text-left">
            <span className="font-semibold text-sm text-gray-100">{match.away_team}</span>
          </div>
        </div>

        {showPrediction && prob && (
          <div className="mt-3">
            {/* Probability bar */}
            <div className="flex h-1.5 rounded-full overflow-hidden mb-2">
              <div className="bg-emerald-500 transition-all" style={{ width: `${prob.prob_home * 100}%` }} />
              <div className="bg-gray-600 transition-all" style={{ width: `${prob.prob_draw * 100}%` }} />
              <div className="bg-blue-500 transition-all" style={{ width: `${prob.prob_away * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-1 text-center text-xs">
              <div className="bg-gray-800/60 rounded-lg p-2">
                <div className="text-gray-500 text-[10px] mb-0.5">Local</div>
                <div className="text-emerald-400 font-bold text-sm">{(prob.prob_home * 100).toFixed(0)}%</div>
                <div className="text-gray-600 text-[10px]">{prob.model_odds_home}</div>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-2">
                <div className="text-gray-500 text-[10px] mb-0.5">Empate</div>
                <div className="text-yellow-400 font-bold text-sm">{(prob.prob_draw * 100).toFixed(0)}%</div>
                <div className="text-gray-600 text-[10px]">{prob.model_odds_draw}</div>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-2">
                <div className="text-gray-500 text-[10px] mb-0.5">Visitante</div>
                <div className="text-blue-400 font-bold text-sm">{(prob.prob_away * 100).toFixed(0)}%</div>
                <div className="text-gray-600 text-[10px]">{prob.model_odds_away}</div>
              </div>
            </div>
          </div>
        )}

        {match.value_bets?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {match.value_bets.slice(0, 3).map((vb, i) => (
              <span key={i} className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5">
                {vb.outcome} · {vb.bookmaker} · {vb.odds}
              </span>
            ))}
          </div>
        )}
      </div>

      {leagueCode && match.id && (
        <div className="px-4 pb-3">
          <Link
            to={`/match/${leagueCode}/${match.id}`}
            className="text-[11px] text-gray-600 hover:text-emerald-400 transition-colors"
          >
            Ver análisis completo →
          </Link>
        </div>
      )}
    </div>
  )
}
