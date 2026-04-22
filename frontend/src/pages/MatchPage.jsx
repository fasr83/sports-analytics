import { useParams } from 'react-router-dom'
import { useMatchOdds } from '../hooks/useApi'
import OddsTable from '../components/OddsTable'
import PoissonHeatmap from '../components/PoissonHeatmap'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function MatchPage() {
  const { league, matchId } = useParams()
  const { data, isLoading } = useMatchOdds(league, matchId)

  if (isLoading) return <div className="text-gray-500 p-8">Cargando análisis...</div>
  if (!data) return <div className="text-gray-500 p-8">Partido no encontrado.</div>

  const pred = data.model_prediction
  const date = data.date ? format(parseISO(data.date), "EEEE d MMMM · HH:mm", { locale: es }) : ''

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <div className="text-gray-500 text-sm mb-3 capitalize">{date}</div>
        <div className="flex items-center justify-center gap-8">
          <div className="text-xl font-bold">{data.home_team}</div>
          <div className="text-gray-600 text-2xl font-light">vs</div>
          <div className="text-xl font-bold">{data.away_team}</div>
        </div>
      </div>

      {/* Model Prediction */}
      {pred && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-400">🧠 Predicción del Modelo Poisson</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: data.home_team, prob: pred.prob_home, odds: pred.model_odds_home, color: 'text-green-400' },
              { label: 'Empate', prob: pred.prob_draw, odds: pred.model_odds_draw, color: 'text-yellow-400' },
              { label: data.away_team, prob: pred.prob_away, odds: pred.model_odds_away, color: 'text-blue-400' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-500 text-sm mb-1">{item.label}</div>
                <div className={`text-3xl font-bold ${item.color}`}>{(item.prob * 100).toFixed(0)}%</div>
                <div className="text-gray-500 text-sm mt-1">Cuota: {item.odds}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-center text-gray-500">
            <div>xG Local: <span className="text-white">{pred.expected_goals_home}</span></div>
            <div>xG Visitante: <span className="text-white">{pred.expected_goals_away}</span></div>
          </div>
        </div>
      )}

      {/* Score Heatmap */}
      {pred?.score_matrix && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">🎯 Mapa de Probabilidades por Marcador</h2>
          <PoissonHeatmap
            matrix={pred.score_matrix}
            homeTeam={data.home_team}
            awayTeam={data.away_team}
          />
        </div>
      )}

      {/* Odds Comparison */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">📋 Comparación de Cuotas por Casa</h2>
        <OddsTable bookmakers={data.bookmakers} homeTeam={data.home_team} awayTeam={data.away_team} />
      </div>

      {/* Arbitrage */}
      {data.arbitrage && (
        <div className={`border rounded-xl p-6 ${data.arbitrage.is_arb ? 'bg-yellow-900/20 border-yellow-500/50' : 'bg-gray-900 border-gray-800'}`}>
          <h2 className="text-lg font-semibold mb-3">🔀 Análisis de Arbitraje</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Suma implícita: </span>
              <span className={data.arbitrage.implied_sum < 1 ? 'text-green-400 font-bold' : 'text-gray-300'}>
                {(data.arbitrage.implied_sum * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Margen: </span>
              <span className={data.arbitrage.profit_pct > 0 ? 'text-green-400 font-bold' : 'text-red-400'}>
                {data.arbitrage.profit_pct > 0 ? '+' : ''}{data.arbitrage.profit_pct}%
              </span>
            </div>
          </div>
          {data.arbitrage.is_arb && (
            <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-yellow-400 font-bold mb-2">⚡ OPORTUNIDAD DE ARBITRAJE</div>
              <div className="space-y-1 text-sm">
                <div>Local: {data.arbitrage.best_home?.bookmaker} @ {data.arbitrage.best_home?.odds}</div>
                <div>Empate: {data.arbitrage.best_draw?.bookmaker} @ {data.arbitrage.best_draw?.odds}</div>
                <div>Visitante: {data.arbitrage.best_away?.bookmaker} @ {data.arbitrage.best_away?.odds}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
