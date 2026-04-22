import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function MatchCard({ match, leagueCode, showPrediction = false }) {
  const date = match.date ? format(parseISO(match.date), "d MMM · HH:mm", { locale: es }) : '?'
  const prob = match.model_prediction

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="text-xs text-gray-500 mb-3">{date}</div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <span className="font-medium">{match.home_team}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm font-mono">
          {match.home_goals != null ? (
            <span className="text-white font-bold text-lg">{match.home_goals} - {match.away_goals}</span>
          ) : (
            <span className="px-2">vs</span>
          )}
        </div>
        <div className="flex-1">
          <span className="font-medium">{match.away_team}</span>
        </div>
      </div>

      {showPrediction && prob && (
        <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
          <div className="bg-gray-800 rounded p-1.5">
            <div className="text-gray-500">Local</div>
            <div className="text-green-400 font-bold">{(prob.prob_home * 100).toFixed(0)}%</div>
            <div className="text-gray-500">{prob.model_odds_home}</div>
          </div>
          <div className="bg-gray-800 rounded p-1.5">
            <div className="text-gray-500">Empate</div>
            <div className="text-yellow-400 font-bold">{(prob.prob_draw * 100).toFixed(0)}%</div>
            <div className="text-gray-500">{prob.model_odds_draw}</div>
          </div>
          <div className="bg-gray-800 rounded p-1.5">
            <div className="text-gray-500">Visitante</div>
            <div className="text-blue-400 font-bold">{(prob.prob_away * 100).toFixed(0)}%</div>
            <div className="text-gray-500">{prob.model_odds_away}</div>
          </div>
        </div>
      )}

      {match.has_value && (
        <div className="mt-2 text-center">
          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded px-2 py-0.5">
            VALUE BET DETECTADO
          </span>
        </div>
      )}
    </div>
  )
}
