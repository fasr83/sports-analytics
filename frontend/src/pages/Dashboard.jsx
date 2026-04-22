import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { LEAGUES } from '../utils/odds'
import MatchCard from '../components/MatchCard'
import { Link } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

export default function Dashboard() {
  const [activeLeague, setActiveLeague] = useState('PL')
  const qc = useQueryClient()

  // Check if models are already trained
  const { data: status } = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get('/setup/status').then(r => r.data),
    staleTime: 60000,
  })

  const modelTrained = status?.leagues?.[activeLeague]?.model_trained ?? false
  const hasOddsKey = status?.has_odds_key ?? false

  const { data: valueBetsData, isLoading: loadingBets, refetch } = useQuery({
    queryKey: ['value-bets', activeLeague],
    queryFn: () => api.get(`/analytics/${activeLeague}/value-bets`).then(r => r.data),
    enabled: modelTrained && hasOddsKey,
    staleTime: 1000 * 60 * 5,
  })

  const { data: arbData, isLoading: loadingArb, refetch: refetchArb } = useQuery({
    queryKey: ['arbitrage', activeLeague],
    queryFn: () => api.get(`/analytics/${activeLeague}/arbitrage`).then(r => r.data),
    enabled: modelTrained && hasOddsKey,
    staleTime: 1000 * 60 * 5,
  })

  const { mutate: trainModel, isPending: isTraining, data: trainResult } = useMutation({
    mutationFn: () => api.get(`/analytics/${activeLeague}/train`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup-status'] })
      refetch()
      refetchArb()
    },
  })

  // Auto-initialize with real data on first load
  const { mutate: initReal, isPending: isInitializing } = useMutation({
    mutationFn: () => api.post('/setup/init-real').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup-status'] })
      setTimeout(() => { refetch(); refetchArb() }, 500)
    },
  })

  const anyUntrained = status?.leagues && Object.values(status.leagues).some(l => !l.model_trained)

  const handleLeagueChange = (code) => {
    setActiveLeague(code)
  }

  const leagueStatus = status?.leagues?.[activeLeague]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white mb-0.5">Dashboard de Análisis</h1>
          <p className="text-gray-500 text-sm">Modelo Poisson · Value Bets · Arbitraje entre casas de apuestas</p>
        </div>
        {anyUntrained && (
          <button
            onClick={() => initReal()}
            disabled={isInitializing}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {isInitializing ? '⏳ Cargando datos...' : '🚀 Inicializar todas las ligas'}
          </button>
        )}
      </div>

      {/* Status bar */}
      {status?.leagues && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {Object.entries(status.leagues).map(([code, info]) => (
            <div key={code} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              info.model_trained
                ? 'bg-green-900/30 border-green-600/30 text-green-400'
                : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${info.model_trained ? 'bg-green-400' : 'bg-gray-600'}`} />
              {info.name}
              {info.model_source === 'api' && <span className="text-green-600">★</span>}
            </div>
          ))}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${
            status.has_odds_key
              ? 'bg-blue-900/30 border-blue-600/30 text-blue-400'
              : 'bg-gray-800 border-gray-700 text-gray-500'
          }`}>
            {status.has_odds_key ? '✓ Odds API activa' : '✗ Sin Odds API key'}
          </div>
        </div>
      )}

      {/* League selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {LEAGUES.map((l) => (
          <button
            key={l.code}
            onClick={() => handleLeagueChange(l.code)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeLeague === l.code
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <button
          onClick={() => trainModel()}
          disabled={isTraining}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isTraining ? '⏳ Entrenando...' : '🧠 Re-entrenar Modelo'}
        </button>
        <button
          onClick={() => { refetch(); refetchArb() }}
          disabled={!hasOddsKey}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          🔄 Actualizar Cuotas
        </button>
        <Link
          to={`/league/${activeLeague}`}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          📊 Ver Liga Completa
        </Link>
      </div>

      {trainResult && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-sm text-green-400">
          ✅ Modelo re-entrenado · <strong>{trainResult.matches_used}</strong> partidos · <strong>{trainResult.teams}</strong> equipos · fuente: <strong>{trainResult.source}</strong>
        </div>
      )}

      {/* Not ready states */}
      {!modelTrained && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-center text-gray-500 mb-4">
          <p className="text-lg mb-2">Liga no inicializada</p>
          <p className="text-sm">Pulsa <strong className="text-white">Inicializar todas las ligas</strong> para traer datos reales.</p>
        </div>
      )}

      {modelTrained && !hasOddsKey && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4 mb-4 text-sm text-yellow-400">
          ⚠️ Modelo entrenado con <strong>{leagueStatus?.teams_in_model}</strong> equipos, pero no hay Odds API key configurada. Las cuotas y value bets no están disponibles.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Value Bets */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-green-400">⚡ Value Bets Detectados</h2>
            {valueBetsData && (
              <span className="text-xs text-gray-500">
                {valueBetsData.events?.filter(e => e.has_value).length} de {valueBetsData.events?.length} partidos
              </span>
            )}
          </div>

          {loadingBets && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse h-24" />
              ))}
            </div>
          )}

          {!loadingBets && valueBetsData?.events?.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
              No hay partidos con cuotas disponibles en este momento.
            </div>
          )}

          <div className="space-y-3">
            {valueBetsData?.events?.filter(e => e.has_value).map((event, i) => (
              <MatchCard key={i} match={event} leagueCode={activeLeague} showPrediction />
            ))}
          </div>

          {valueBetsData?.events && valueBetsData.events.length > 0 && !valueBetsData.events.some(e => e.has_value) && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 text-center text-gray-500 text-sm">
              No hay value bets detectados en este momento para {LEAGUES.find(l => l.code === activeLeague)?.name}.
              <div className="text-xs mt-1 text-gray-600">
                {valueBetsData.events.length} partidos analizados sin edge significativo (&gt;5%).
              </div>
            </div>
          )}

          {/* All matches without value (collapsed) */}
          {valueBetsData?.events?.filter(e => !e.has_value).length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 py-2">
                Ver {valueBetsData.events.filter(e => !e.has_value).length} partidos sin value bet
              </summary>
              <div className="space-y-2 mt-2">
                {valueBetsData.events.filter(e => !e.has_value).map((event, i) => (
                  <MatchCard key={i} match={event} leagueCode={activeLeague} showPrediction />
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Arbitrage */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-yellow-400">🔀 Arbitraje</h2>

          {loadingArb && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse h-20" />
          )}

          {!loadingArb && arbData?.opportunities?.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center text-gray-500 text-sm">
              Sin oportunidades de arbitraje en este momento.
            </div>
          )}

          {!hasOddsKey && !loadingArb && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center text-gray-600 text-sm">
              Requiere Odds API key.
            </div>
          )}

          <div className="space-y-3">
            {arbData?.opportunities?.map((arb, i) => (
              <div key={i} className="bg-gray-900 border border-yellow-500/40 rounded-lg p-4">
                <div className="font-medium text-sm mb-2">
                  {arb.home_team} vs {arb.away_team}
                </div>
                <div className="text-green-400 font-bold text-xl">+{arb.profit_pct}%</div>
                <div className="text-xs text-gray-500 mt-0.5">garantizado · suma implícita {(arb.implied_sum * 100).toFixed(1)}%</div>
                <div className="mt-3 space-y-1 text-xs border-t border-gray-800 pt-2">
                  <div className="flex justify-between"><span className="text-gray-500">1 — {arb.best_home?.bookmaker}</span><span className="text-white font-medium">{arb.best_home?.odds}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">X — {arb.best_draw?.bookmaker}</span><span className="text-white font-medium">{arb.best_draw?.odds}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">2 — {arb.best_away?.bookmaker}</span><span className="text-white font-medium">{arb.best_away?.odds}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
